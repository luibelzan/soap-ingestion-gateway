import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import {
  S08Bloque,
  S08Categoria,
  S08Concentrador,
  S08Contador,
  S08File,
  S08Lectura,
} from './s08.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // El atributo xmlns del Report se ignora.
  isArray: (name) => ['Cnc', 'Cnt', 'S08'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

/**
 * Cada bloque (Sub, Sob, Corte) usa un prefijo distinto en sus
 * atributos (p.ej. "Nsub"/"Tsub" para Sub, "Nsob"/"Tsob" para Sob,
 * "Ncorte"/"Tcorte" para Corte). Se recibe el prefijo exacto usado en
 * el XML para poder leer los atributos correctos.
 */
function parseS08Bloque(raw: any, categoria: S08Categoria, prefijo: string): S08Bloque {
  return {
    categoria,
    nTt: toNullableNumber(raw[`N${prefijo}Tt`]),
    tTt: toNullableNumber(raw[`T${prefijo}Tt`]),
    tTa: toNullableNumber(raw[`T${prefijo}Ta`]),
    nTf1: toNullableNumber(raw[`N${prefijo}Tf1`]),
    tTf1: toNullableNumber(raw[`T${prefijo}Tf1`]),
    tTf1a: toNullableNumber(raw[`T${prefijo}Tf1a`]),
    nTf2: toNullableNumber(raw[`N${prefijo}Tf2`]),
    tTf2: toNullableNumber(raw[`T${prefijo}Tf2`]),
    tTf2a: toNullableNumber(raw[`T${prefijo}Tf2a`]),
    nTf3: toNullableNumber(raw[`N${prefijo}Tf3`]),
    tTf3: toNullableNumber(raw[`T${prefijo}Tf3`]),
    tTf3a: toNullableNumber(raw[`T${prefijo}Tf3a`]),
  };
}

function parseS08Lectura(raw: any): S08Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  const bloques: S08Bloque[] = [];
  if (raw.Sub !== undefined) bloques.push(parseS08Bloque(raw.Sub, 'Sub', 'sub'));
  if (raw.Sob !== undefined) bloques.push(parseS08Bloque(raw.Sob, 'Sob', 'sob'));
  if (raw.Corte !== undefined) bloques.push(parseS08Bloque(raw.Corte, 'Corte', 'corte'));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bloques,
  };
}

function parseS08Contador(raw: any): S08Contador {
  const lecturasRaw = raw.S08 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS08Lectura),
  };
}

function parseS08Concentrador(raw: any): S08Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS08Contador
    ),
  };
}

export class S08Parser implements FileParser<S08File> {
  tipo = 'S08';

  parse(xmlContent: string): S08File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS08Concentrador),
    };
  }
}
