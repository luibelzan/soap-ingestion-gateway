import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G53File, G53Medida, G53Rtu } from './g53.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'G53'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG53Medida(raw: any): G53Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    vtnMin: toNullableNumber(raw.VTNMin),
    vtnAvg: toNullableNumber(raw.VTNAvg),
    vtnMax: toNullableNumber(raw.VTNMax),
    vtnLsm: toNullableNumber(raw.VTNLSM),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseG53Rtu(raw: any): G53Rtu {
  const medidasRaw = raw.G53 ?? [];

  return {
    rtuId: String(raw.Id),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseG53Medida),
  };
}

export class G53Parser implements FileParser<G53File> {
  tipo = 'G53';

  parse(xmlContent: string): G53File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseG53Rtu),
    };
  }
}
