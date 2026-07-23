import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S96Armonico, S96Fase, S96File, S96Medida, S96Rtu } from './s96.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'S96'].includes(name),
});

const NUM_ARMONICOS = 25;

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

/**
 * Extrae los armónicos h1..h25 de un bloque Hr/Hs/Ht en una lista
 * (orden, valor), en vez de dejarlos como columnas sueltas.
 */
function parseArmonicos(raw: any): S96Armonico[] {
  const armonicos: S96Armonico[] = [];

  for (let orden = 1; orden <= NUM_ARMONICOS; orden++) {
    const key = `h${orden}`;
    if (raw[key] !== undefined) {
      armonicos.push({ orden, valor: toNullableNumber(raw[key]) });
    }
  }

  return armonicos;
}

function parseS96Fase(raw: any, fase: 'R' | 'S' | 'T'): S96Fase {
  return {
    fase,
    armonicos: parseArmonicos(raw),
    thd: toNullableNumber(raw.thd),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseS96Medida(raw: any): S96Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  const fases: S96Fase[] = [];
  if (raw.Hr !== undefined) fases.push(parseS96Fase(raw.Hr, 'R'));
  if (raw.Hs !== undefined) fases.push(parseS96Fase(raw.Hs, 'S'));
  if (raw.Ht !== undefined) fases.push(parseS96Fase(raw.Ht, 'T'));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    fases,
  };
}

function parseS96Rtu(raw: any): S96Rtu {
  const medidasRaw = raw.S96 ?? [];

  return {
    rtuId: String(raw.Id),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseS96Medida),
  };
}

export class S96Parser implements FileParser<S96File> {
  tipo = 'S96';

  parse(xmlContent: string): S96File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS96Rtu),
    };
  }
}
