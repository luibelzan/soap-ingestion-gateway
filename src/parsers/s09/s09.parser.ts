import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh, tryParseFh } from '../../core/fhParser';
import { S09Concentrador, S09Contador, S09Evento, S09File } from './s09.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'S09'].includes(name),
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

function parseS09Evento(raw: any): S09Evento {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  const d1Raw = raw.D1 !== undefined ? String(raw.D1) : null;
  const d2Raw = raw.D2 !== undefined ? String(raw.D2) : null;

  // D1 puede ser una fecha-hora (mismo formato que Fh) o un simple código
  // (p.ej. "1", "2"). Se intenta parsear como fecha-hora; si no encaja,
  // se deja el valor crudo únicamente.
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

function parseS09Contador(raw: any): S09Contador {
  const eventosRaw = raw.S09 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    eventos: (Array.isArray(eventosRaw) ? eventosRaw : [eventosRaw]).map(parseS09Evento),
  };
}

function parseS09Concentrador(raw: any): S09Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS09Contador
    ),
  };
}

export class S09Parser implements FileParser<S09File> {
  tipo = 'S09';

  parse(xmlContent: string): S09File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS09Concentrador),
    };
  }
}
