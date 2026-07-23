import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S53File, S53Lectura, S53LvsLine, S53Rtu } from './s53.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'LVSLine', 'S53'].includes(name),
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

function parseS53Lectura(raw: any): S53Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    aiPh1: toNumber(raw.AI1),
    aiPh2: toNumber(raw.AI2),
    aiPh3: toNumber(raw.AI3),
    aePh1: toNumber(raw.AE1),
    aePh2: toNumber(raw.AE2),
    aePh3: toNumber(raw.AE3),
    r1Ph1: toNumber(raw.R11),
    r1Ph2: toNumber(raw.R12),
    r1Ph3: toNumber(raw.R13),
    r2Ph1: toNumber(raw.R21),
    r2Ph2: toNumber(raw.R22),
    r2Ph3: toNumber(raw.R23),
    r3Ph1: toNumber(raw.R31),
    r3Ph2: toNumber(raw.R32),
    r3Ph3: toNumber(raw.R33),
    r4Ph1: toNumber(raw.R41),
    r4Ph2: toNumber(raw.R42),
    r4Ph3: toNumber(raw.R43),
  };
}

function parseS53LvsLine(raw: any): S53LvsLine {
  const lecturasRaw = raw.S53 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    magn: toNullableNumber(raw.Magn),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS53Lectura),
  };
}

function parseS53Rtu(raw: any): S53Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseS53LvsLine),
  };
}

export class S53Parser implements FileParser<S53File> {
  tipo = 'S53';

  parse(xmlContent: string): S53File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS53Rtu),
    };
  }
}
