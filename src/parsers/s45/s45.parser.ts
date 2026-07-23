import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S45Concentrador, S45Contador, S45File, S45Lectura } from './s45.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // El atributo xmlns del Report se ignora (no se hace parsing consciente
  // de namespaces).
  isArray: (name) => ['Cnc', 'Cnt', 'S45'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function toNullableInt(value: unknown): number | null {
  return toNullableNumber(value);
}

function parseS45Lectura(raw: any): S45Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    maxL1i: toNullableNumber(raw.Max_L1i),
    maxL2i: toNullableNumber(raw.Max_L2i),
    maxL3i: toNullableNumber(raw.Max_L3i),
    maxIn: toNullableNumber(raw.Max_IN),
    avL1i: toNullableNumber(raw.Av_L1i),
    avL2i: toNullableNumber(raw.Av_L2i),
    avL3i: toNullableNumber(raw.Av_L3i),
    avIn: toNullableNumber(raw.Av_IN),
    minL1i: toNullableNumber(raw.Min_L1i),
    minL2i: toNullableNumber(raw.Min_L2i),
    minL3i: toNullableNumber(raw.Min_L3i),
    minIn: toNullableNumber(raw.Min_IN),
  };
}

function parseS45Contador(raw: any): S45Contador {
  const lecturasRaw = raw.S45 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableInt(raw.ErrCat),
    errCode: toNullableInt(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS45Lectura),
  };
}

function parseS45Concentrador(raw: any): S45Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS45Contador
    ),
  };
}

export class S45Parser implements FileParser<S45File> {
  tipo = 'S45';

  parse(xmlContent: string): S45File {
    const parsed = xmlParser.parse(xmlContent);
    const report = parsed.Report;

    if (!report) {
      throw new Error('El XML no contiene un elemento raíz <Report>');
    }

    const cncsRaw = report.Cnc ?? [];

    return {
      idRpt: String(report.IdRpt),
      idPet: String(report.IdPet),
      version: String(report.Version),
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS45Concentrador),
    };
  }
}
