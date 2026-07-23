import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh, tryParseFh } from '../../core/fhParser';
import { S59Evento, S59File, S59LvsLine, S59Rtu } from './s59.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'LVSLine', 'S59'].includes(name),
});

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS59Evento(raw: any): S59Evento {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  const d1Raw = raw.D1 !== undefined ? String(raw.D1) : null;
  const d2Raw = raw.D2 !== undefined ? String(raw.D2) : null;

  // D1 puede ser una fecha-hora (mismo formato que Fh, con cualquier
  // letra de horario, no solo "S") o un simple código. Se intenta
  // parsear como fecha-hora; si no encaja, se deja el valor crudo.
  const d1Parsed = d1Raw !== null ? tryParseFh(d1Raw) : null;

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    et: toNumber(raw.Et),
    c: toNumber(raw.C),

    d1Raw,
    fechaD1: d1Parsed?.fecha ?? null,
    horaD1: d1Parsed?.hora ?? null,
    flagHorarioD1: d1Parsed?.flagHorario ?? null,

    d2Raw,
  };
}

function parseS59LvsLine(raw: any): S59LvsLine {
  const eventosRaw = raw.S59 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    eventos: (Array.isArray(eventosRaw) ? eventosRaw : [eventosRaw]).map(parseS59Evento),
  };
}

function parseS59Rtu(raw: any): S59Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseS59LvsLine),
  };
}

export class S59Parser implements FileParser<S59File> {
  tipo = 'S59';

  parse(xmlContent: string): S59File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS59Rtu),
    };
  }
}
