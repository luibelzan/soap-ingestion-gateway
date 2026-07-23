import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S94File, S94Medida, S94Rtu } from './s94.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Misma jerarquía simple que S93 (sin LVSLine).
  isArray: (name) => ['Rtu', 'S94'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS94Medida(raw: any): S94Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    tp: toNullableNumber(raw.Tp),

    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    fr: toNullableNumber(raw.Fr),
    fs: toNullableNumber(raw.Fs),
    ft: toNullableNumber(raw.Ft),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseS94Rtu(raw: any): S94Rtu {
  const medidasRaw = raw.S94 ?? [];

  return {
    rtuId: String(raw.Id),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseS94Medida),
  };
}

export class S94Parser implements FileParser<S94File> {
  tipo = 'S94';

  parse(xmlContent: string): S94File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS94Rtu),
    };
  }
}
