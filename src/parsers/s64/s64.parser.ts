import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S64File, S64Lectura, S64LvsLine, S64Rtu } from './s64.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'LVSLine', 'S64'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS64Lectura(raw: any): S64Lectura {
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

function parseS64LvsLine(raw: any): S64LvsLine {
  const lecturasRaw = raw.S64 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS64Lectura),
  };
}

function parseS64Rtu(raw: any): S64Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseS64LvsLine),
  };
}

export class S64Parser implements FileParser<S64File> {
  tipo = 'S64';

  parse(xmlContent: string): S64File {
    const parsed = xmlParser.parse(xmlContent);
    const report = parsed.Report;

    if (!report) {
      throw new Error('El XML no contiene un elemento raíz <Report>');
    }

    const rtusRaw = report.Rtu ?? [];

    return {
      idRpt: String(report.IdRpt),
      idPet: String(report.IdPet),
      version: String(report.Version),
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS64Rtu),
    };
  }
}
