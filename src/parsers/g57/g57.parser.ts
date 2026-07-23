import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G57File, G57LvsLine, G57Medida, G57Rtu } from './g57.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Misma jerarquía que G56 (Rtu/LVSLine, no Cnc/Cnt).
  isArray: (name) => ['Rtu', 'LVSLine', 'G57'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG57Medida(raw: any): G57Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    maxCPh1: toNullableNumber(raw.MaxCph1),
    maxVPh1: toNullableNumber(raw.MaxVph1),
    maxPimpPh1: toNullableNumber(raw.MaxPimph1),
    maxPexpPh1: toNullableNumber(raw.MaxPexph1),
    maxQimpPh1: toNullableNumber(raw.MaxQimph1),
    maxQexpPh1: toNullableNumber(raw.MaxQexph1),
    maxPfPh1: toNullableNumber(raw.MaxPF1),

    maxCPh2: toNullableNumber(raw.MaxCph2),
    maxVPh2: toNullableNumber(raw.MaxVph2),
    maxPimpPh2: toNullableNumber(raw.MaxPimph2),
    maxPexpPh2: toNullableNumber(raw.MaxPexph2),
    maxQimpPh2: toNullableNumber(raw.MaxQimph2),
    maxQexpPh2: toNullableNumber(raw.MaxQexph2),
    maxPfPh2: toNullableNumber(raw.MaxPF2),

    maxCPh3: toNullableNumber(raw.MaxCph3),
    maxVPh3: toNullableNumber(raw.MaxVph3),
    maxPimpPh3: toNullableNumber(raw.MaxPimph3),
    maxPexpPh3: toNullableNumber(raw.MaxPexph3),
    maxQimpPh3: toNullableNumber(raw.MaxQimph3),
    maxQexpPh3: toNullableNumber(raw.MaxQexph3),
    maxPfPh3: toNullableNumber(raw.MaxPF3),

    maxV12: toNullableNumber(raw.MaxV12),
    maxV23: toNullableNumber(raw.MaxV23),
    maxV31: toNullableNumber(raw.MaxV31),

    maxCn: toNullableNumber(raw.MaxCn),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseG57LvsLine(raw: any): G57LvsLine {
  const medidasRaw = raw.G57 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseG57Medida),
  };
}

function parseG57Rtu(raw: any): G57Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseG57LvsLine),
  };
}

export class G57Parser implements FileParser<G57File> {
  tipo = 'G57';

  parse(xmlContent: string): G57File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseG57Rtu),
    };
  }
}
