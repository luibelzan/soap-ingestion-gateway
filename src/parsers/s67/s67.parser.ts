import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S67Evento, S67File, S67Rtu } from './s67.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'S67'].includes(name),
});

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

/** Texto crudo; vacío ("" o elemento sin contenido) se guarda como null */
function toNullableRawString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

function parseS67Evento(raw: any): S67Evento {
  const { fecha, hora, ms, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    ms,
    flagHorario,
    fhRaw: String(raw.Fh),

    et: toNumber(raw.Et),
    c: toNumber(raw.C),

    // Formato de lista separada por ";", no se descompone al no
    // conocer el significado de cada posición. <D1></D1> vacío -> null.
    d1Raw: toNullableRawString(raw.D1),
    d2Raw: toNullableRawString(raw.D2),
  };
}

function parseS67Rtu(raw: any): S67Rtu {
  const eventosRaw = raw.S67 ?? [];

  return {
    rtuId: String(raw.Id),
    eventos: (Array.isArray(eventosRaw) ? eventosRaw : [eventosRaw]).map(parseS67Evento),
  };
}

export class S67Parser implements FileParser<S67File> {
  tipo = 'S67';

  parse(xmlContent: string): S67File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS67Rtu),
    };
  }
}
