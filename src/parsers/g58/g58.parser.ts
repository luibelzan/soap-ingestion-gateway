import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G58File, G58LvsLine, G58Medida, G58Rtu } from './g58.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Misma jerarquía que G56/G57 (Rtu/LVSLine, no Cnc/Cnt).
  isArray: (name) => ['Rtu', 'LVSLine', 'G58'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG58Medida(raw: any): G58Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    minCPh1: toNullableNumber(raw.MinCph1),
    minVPh1: toNullableNumber(raw.MinVph1),
    minPimpPh1: toNullableNumber(raw.MinPimph1),
    minPexpPh1: toNullableNumber(raw.MinPexph1),
    minQimpPh1: toNullableNumber(raw.MinQimph1),
    minQexpPh1: toNullableNumber(raw.MinQexph1),
    minPfPh1: toNullableNumber(raw.MinPF1),

    minCPh2: toNullableNumber(raw.MinCph2),
    minVPh2: toNullableNumber(raw.MinVph2),
    minPimpPh2: toNullableNumber(raw.MinPimph2),
    minPexpPh2: toNullableNumber(raw.MinPexph2),
    minQimpPh2: toNullableNumber(raw.MinQimph2),
    minQexpPh2: toNullableNumber(raw.MinQexph2),
    minPfPh2: toNullableNumber(raw.MinPF2),

    minCPh3: toNullableNumber(raw.MinCph3),
    minVPh3: toNullableNumber(raw.MinVph3),
    minPimpPh3: toNullableNumber(raw.MinPimph3),
    minPexpPh3: toNullableNumber(raw.MinPexph3),
    minQimpPh3: toNullableNumber(raw.MinQimph3),
    minQexpPh3: toNullableNumber(raw.MinQexph3),
    minPfPh3: toNullableNumber(raw.MinPF3),

    minV12: toNullableNumber(raw.MinV12),
    minV23: toNullableNumber(raw.MinV23),
    minV31: toNullableNumber(raw.MinV31),

    // OJO: el XML de origen usa "MimCn" (con "m"), no "MinCn". Es una
    // errata consistente en el propio fichero, se lee tal cual.
    minCn: toNullableNumber(raw.MimCn),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseG58LvsLine(raw: any): G58LvsLine {
  const medidasRaw = raw.G58 ?? [];

  return {
    lvslineId: String(raw.Id),
    pos: String(raw.Pos),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseG58Medida),
  };
}

function parseG58Rtu(raw: any): G58Rtu {
  const lineasRaw = raw.LVSLine ?? [];

  return {
    rtuId: String(raw.Id),
    lineas: (Array.isArray(lineasRaw) ? lineasRaw : [lineasRaw]).map(parseG58LvsLine),
  };
}

export class G58Parser implements FileParser<G58File> {
  tipo = 'G58';

  parse(xmlContent: string): G58File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseG58Rtu),
    };
  }
}
