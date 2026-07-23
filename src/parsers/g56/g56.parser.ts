import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G56File, G56LvsLine, G56Medida, G56Rtu } from './g56.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Nota: jerarquía distinta a los tipos anteriores (Rtu/LVSLine, no Cnc/Cnt).
  isArray: (name) => ['Rtu', 'LVSLine', 'G56'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG56Medida(raw: any): G56Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    avgCPh1: toNullableNumber(raw.AvgCph1),
    avgVPh1: toNullableNumber(raw.AvgVph1),
    avgPimpPh1: toNullableNumber(raw.AvgPimph1),
    avgPexpPh1: toNullableNumber(raw.AvgPexph1),
    avgQimpPh1: toNullableNumber(raw.AvgQimph1),
    avgQexpPh1: toNullableNumber(raw.AvgQexph1),
    avgPfPh1: toNullableNumber(raw.AvgPF1),

    avgCPh2: toNullableNumber(raw.AvgCph2),
    avgVPh2: toNullableNumber(raw.AvgVph2),
    avgPimpPh2: toNullableNumber(raw.AvgPimph2),
    avgPexpPh2: toNullableNumber(raw.AvgPexph2),
    avgQimpPh2: toNullableNumber(raw.AvgQimph2),
    avgQexpPh2: toNullableNumber(raw.AvgQexph2),
    avgPfPh2: toNullableNumber(raw.AvgPF2),

    avgCPh3: toNullableNumber(raw.AvgCph3),
    avgVPh3: toNullableNumber(raw.AvgVph3),
    avgPimpPh3: toNullableNumber(raw.AvgPimph3),
    avgPexpPh3: toNullableNumber(raw.AvgPexph3),
    avgQimpPh3: toNullableNumber(raw.AvgQimph3),
    avgQexpPh3: toNullableNumber(raw.AvgQexph3),
    avgPfPh3: toNullableNumber(raw.AvgPF3),

    avgV12: toNullableNumber(raw.AvgV12),
    avgV23: toNullableNumber(raw.AvgV23),
    avgV31: toNullableNumber(raw.AvgV31),

    avgCn: toNullableNumber(raw.AvgCn),
    temp: toNullableNumber(raw.Temp),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseG56LvsLine(raw: any): G56LvsLine {
  const medidasRaw = raw.G56 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseG56Medida),
  };
}

function parseG56Rtu(raw: any): G56Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseG56LvsLine),
  };
}

export class G56Parser implements FileParser<G56File> {
  tipo = 'G56';

  parse(xmlContent: string): G56File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseG56Rtu),
    };
  }
}
