import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S14Concentrador, S14Contador, S14File, S14Lectura } from './s14.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'S14'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS14Lectura(raw: any): S14Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    v1: toNullableNumber(raw.V1),
    v2: toNullableNumber(raw.V2),
    v3: toNullableNumber(raw.V3),
    i1: toNullableNumber(raw.I1),
    i2: toNullableNumber(raw.I2),
    i3: toNullableNumber(raw.I3),
    inNeutro: toNullableNumber(raw.In),
    simp: toNullableNumber(raw.Simp),
    sexp: toNullableNumber(raw.Sexp),
  };
}

function parseS14Contador(raw: any): S14Contador {
  const lecturasRaw = raw.S14 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS14Lectura),
  };
}

function parseS14Concentrador(raw: any): S14Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS14Contador
    ),
  };
}

export class S14Parser implements FileParser<S14File> {
  tipo = 'S14';

  parse(xmlContent: string): S14File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS14Concentrador),
    };
  }
}
