import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G59File, G59LvsLine, G59Medida, G59Rtu } from './g59.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Misma jerarquía que G56/G57/G58 (Rtu/LVSLine, no Cnc/Cnt).
  isArray: (name) => ['Rtu', 'LVSLine', 'G59'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG59Medida(raw: any): G59Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    momCPh1: toNullableNumber(raw.MomCph1),
    momVPh1: toNullableNumber(raw.MomVph1),
    momPimpPh1: toNullableNumber(raw.MomPimph1),
    momPexpPh1: toNullableNumber(raw.MomPexph1),
    momQimpPh1: toNullableNumber(raw.MomQimph1),
    momQexpPh1: toNullableNumber(raw.MomQexph1),
    momPfPh1: toNullableNumber(raw.MomPF1),

    momCPh2: toNullableNumber(raw.MomCph2),
    momVPh2: toNullableNumber(raw.MomVph2),
    momPimpPh2: toNullableNumber(raw.MomPimph2),
    momPexpPh2: toNullableNumber(raw.MomPexph2),
    momQimpPh2: toNullableNumber(raw.MomQimph2),
    momQexpPh2: toNullableNumber(raw.MomQexph2),
    momPfPh2: toNullableNumber(raw.MomPF2),

    momCPh3: toNullableNumber(raw.MomCph3),
    momVPh3: toNullableNumber(raw.MomVph3),
    momPimpPh3: toNullableNumber(raw.MomPimph3),
    momPexpPh3: toNullableNumber(raw.MomPexph3),
    momQimpPh3: toNullableNumber(raw.MomQimph3),
    momQexpPh3: toNullableNumber(raw.MomQexph3),
    momPfPh3: toNullableNumber(raw.MomPF3),

    momV12: toNullableNumber(raw.MomV12),
    momV23: toNullableNumber(raw.MomV23),
    momV31: toNullableNumber(raw.MomV31),

    momCn: toNullableNumber(raw.MomCn),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseG59LvsLine(raw: any): G59LvsLine {
  const medidasRaw = raw.G59 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseG59Medida),
  };
}

function parseG59Rtu(raw: any): G59Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseG59LvsLine),
  };
}

export class G59Parser implements FileParser<G59File> {
  tipo = 'G59';

  parse(xmlContent: string): G59File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseG59Rtu),
    };
  }
}
