import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S95File, S95Medida, S95Rtu } from './s95.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'S95'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS95Medida(raw: any): S95Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    vu: toNullableNumber(raw.Vu),
    pi: raw.Pi !== undefined ? String(raw.Pi) : null,
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseS95Rtu(raw: any): S95Rtu {
  const medidasRaw = raw.S95 ?? [];

  return {
    rtuId: String(raw.Id),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseS95Medida),
  };
}

export class S95Parser implements FileParser<S95File> {
  tipo = 'S95';

  parse(xmlContent: string): S95File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS95Rtu),
    };
  }
}
