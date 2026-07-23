import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S93File, S93Medida, S93Rtu } from './s93.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Jerarquía más simple que G56/G57/G58: no hay LVSLine.
  isArray: (name) => ['Rtu', 'S93'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS93Medida(raw: any): S93Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    vr: toNullableNumber(raw.Vr),
    vs: toNullableNumber(raw.Vs),
    vt: toNullableNumber(raw.Vt),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseS93Rtu(raw: any): S93Rtu {
  const medidasRaw = raw.S93 ?? [];

  return {
    rtuId: String(raw.Id),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseS93Medida),
  };
}

export class S93Parser implements FileParser<S93File> {
  tipo = 'S93';

  parse(xmlContent: string): S93File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS93Rtu),
    };
  }
}
