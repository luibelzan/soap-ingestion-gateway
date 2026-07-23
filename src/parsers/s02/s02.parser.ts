import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S02Concentrador, S02Contador, S02File, S02Lectura } from './s02.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'S02'].includes(name),
});

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function toNullableInt(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor entero inválido: "${value}"`);
  }
  return n;
}

function parseS02Lectura(raw: any): S02Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,
    ai: toNumber(raw.AI),
    ae: toNumber(raw.AE),
    r1: toNumber(raw.R1),
    r2: toNumber(raw.R2),
    r3: toNumber(raw.R3),
    r4: toNumber(raw.R4),
  };
}

function parseS02Contador(raw: any): S02Contador {
  const lecturasRaw = raw.S02 ?? [];

  return {
    cntId: String(raw.Id),
    magnitud: toNullableInt(raw.Magn),
    errCat: toNullableInt(raw.ErrCat),
    errCode: toNullableInt(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS02Lectura),
  };
}

function parseS02Concentrador(raw: any): S02Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS02Contador
    ),
  };
}

export class S02Parser implements FileParser<S02File> {
  tipo = 'S02';

  parse(xmlContent: string): S02File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS02Concentrador),
    };
  }
}
