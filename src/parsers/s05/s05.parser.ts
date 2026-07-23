import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S05Concentrador, S05Contador, S05File, S05Periodo } from './s05.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'S05', 'Value'].includes(name),
});

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS05Periodo(raw: any): S05Periodo {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  const valuesRaw: any[] = Array.isArray(raw.Value) ? raw.Value : [raw.Value];
  const valor = valuesRaw[0] ?? {};

  return {
    ctr: toNullableNumber(raw.Ctr),
    pt: toNumber(raw.Pt),

    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    aiA: toNumber(valor.AIa),
    aeA: toNumber(valor.AEa),
    r1A: toNumber(valor.R1a),
    r2A: toNumber(valor.R2a),
    r3A: toNumber(valor.R3a),
    r4A: toNumber(valor.R4a),
  };
}

function parseS05Contador(raw: any): S05Contador {
  const periodosRaw = raw.S05 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    periodos: (Array.isArray(periodosRaw) ? periodosRaw : [periodosRaw]).map(parseS05Periodo),
  };
}

function parseS05Concentrador(raw: any): S05Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS05Contador
    ),
  };
}

export class S05Parser implements FileParser<S05File> {
  tipo = 'S05';

  parse(xmlContent: string): S05File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS05Concentrador),
    };
  }
}
