import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S52File, S52Lectura, S52LvsLine, S52Rtu } from './s52.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'LVSLine', 'S52'].includes(name),
});

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS52Lectura(raw: any): S52Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    ai: toNumber(raw.AI),
    ae: toNumber(raw.AE),
    r1: toNumber(raw.R1),
    r2: toNumber(raw.R2),
    r3: toNumber(raw.R3),
    r4: toNumber(raw.R4),
  };
}

function parseS52LvsLine(raw: any): S52LvsLine {
  const lecturasRaw = raw.S52 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    magn: toNullableNumber(raw.Magn),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS52Lectura),
  };
}

function parseS52Rtu(raw: any): S52Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseS52LvsLine),
  };
}

export class S52Parser implements FileParser<S52File> {
  tipo = 'S52';

  parse(xmlContent: string): S52File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS52Rtu),
    };
  }
}
