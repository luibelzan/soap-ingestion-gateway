import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh, tryParseFh } from '../../core/fhParser';
import { S07Concentrador, S07Contador, S07File, S07Lectura } from './s07.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // El atributo xmlns del Report se ignora.
  isArray: (name) => ['Cnc', 'Cnt', 'S07'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS07Lectura(raw: any): S07Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  const hcRaw = raw.Hc !== undefined ? String(raw.Hc) : null;
  const hcParsed = hcRaw !== null ? tryParseFh(hcRaw) : null;

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    dc: toNullableNumber(raw.Dc),
    nc: toNullableNumber(raw.Nc),
    df: toNullableNumber(raw.Df),

    hcFecha: hcParsed?.fecha ?? null,
    hcHora: hcParsed?.hora ?? null,
    hcFlagHorario: hcParsed?.flagHorario ?? null,
    hcRaw,
  };
}

function parseS07Contador(raw: any): S07Contador {
  const lecturasRaw = raw.S07 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS07Lectura),
  };
}

function parseS07Concentrador(raw: any): S07Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS07Contador
    ),
  };
}

export class S07Parser implements FileParser<S07File> {
  tipo = 'S07';

  parse(xmlContent: string): S07File {
    const parsed = xmlParser.parse(xmlContent);
    const report = parsed.Report;

    if (!report) {
      throw new Error('El XML no contiene un elemento raíz <Report>');
    }

    const cncsRaw = report.Cnc ?? [];

    return {
      idRpt: String(report.IdRpt),
      idPet: String(report.IdPet),
      version: String(report.Version),
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS07Concentrador),
    };
  }
}
