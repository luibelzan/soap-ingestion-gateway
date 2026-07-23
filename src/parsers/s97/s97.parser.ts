import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S97File, S97Medida, S97Rtu } from './s97.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Misma jerarquía simple que S93/S94 (sin LVSLine).
  isArray: (name) => ['Rtu', 'S97'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS97Medida(raw: any): S97Medida {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    nr: toNullableNumber(raw.Nr),
    ns: toNullableNumber(raw.Ns),
    nt: toNullableNumber(raw.Nt),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
  };
}

function parseS97Rtu(raw: any): S97Rtu {
  const medidasRaw = raw.S97 ?? [];

  return {
    rtuId: String(raw.Id),
    medidas: (Array.isArray(medidasRaw) ? medidasRaw : [medidasRaw]).map(parseS97Medida),
  };
}

export class S97Parser implements FileParser<S97File> {
  tipo = 'S97';

  parse(xmlContent: string): S97File {
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
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS97Rtu),
    };
  }
}
