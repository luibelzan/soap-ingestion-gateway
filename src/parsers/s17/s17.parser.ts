import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S17Concentrador, S17Evento, S17File } from './s17.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'S17'].includes(name),
});

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS17Evento(raw: any): S17Evento {
  const { fecha, hora, ms, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    ms,
    flagHorario,
    fhRaw: String(raw.Fh),

    et: toNumber(raw.Et),
    c: toNumber(raw.C),

    // A diferencia de S09, aquí D1/D2 nunca son fechas (formato tipo
    // "0_0", "0_1;STG"), así que se guardan tal cual sin intentar
    // parsearlas.
    d1Raw: raw.D1 !== undefined ? String(raw.D1) : null,
    d2Raw: raw.D2 !== undefined ? String(raw.D2) : null,
  };
}

function parseS17Concentrador(raw: any): S17Concentrador {
  const eventosRaw = raw.S17 ?? [];

  return {
    cncId: String(raw.Id),
    eventos: (Array.isArray(eventosRaw) ? eventosRaw : [eventosRaw]).map(parseS17Evento),
  };
}

export class S17Parser implements FileParser<S17File> {
  tipo = 'S17';

  parse(xmlContent: string): S17File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS17Concentrador),
    };
  }
}
