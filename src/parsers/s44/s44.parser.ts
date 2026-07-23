import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S44Concentrador, S44Contador, S44File, S44Lectura } from './s44.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'S44'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS44Lectura(raw: any): S44Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    maxL1v: toNullableNumber(raw.Max_L1v),
    maxL2v: toNullableNumber(raw.Max_L2v),
    maxL3v: toNullableNumber(raw.Max_L3v),
    avL1v: toNullableNumber(raw.Av_L1v),
    avL2v: toNullableNumber(raw.Av_L2v),
    avL3v: toNullableNumber(raw.Av_L3v),
    minL1v: toNullableNumber(raw.Min_L1v),
    minL2v: toNullableNumber(raw.Min_L2v),
    minL3v: toNullableNumber(raw.Min_L3v),
  };
}

function parseS44Contador(raw: any): S44Contador {
  const lecturasRaw = raw.S44 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS44Lectura),
  };
}

function parseS44Concentrador(raw: any): S44Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS44Contador
    ),
  };
}

export class S44Parser implements FileParser<S44File> {
  tipo = 'S44';

  parse(xmlContent: string): S44File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS44Concentrador),
    };
  }
}
