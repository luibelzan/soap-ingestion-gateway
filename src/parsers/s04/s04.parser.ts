import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S04Concentrador, S04Contador, S04File, S04Periodo } from './s04.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'S04', 'Value'].includes(name),
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

/**
 * Cada S04 trae dos elementos Value: uno con sufijo "a" (AIa, AEa, R1a-R4a)
 * y otro con sufijo "i" (AIi, AEi, R1i-R4i). Se detectan por la presencia
 * de la clave "AIa" vs "AIi" en vez de asumir un orden posicional fijo,
 * para ser robustos si el orden cambiara entre ficheros.
 */
function splitValues(valuesRaw: any[]): { valorA: any; valorI: any } {
  const valorA = valuesRaw.find((v) => v.AIa !== undefined);
  const valorI = valuesRaw.find((v) => v.AIi !== undefined);

  if (!valorA || !valorI) {
    throw new Error(
      `No se han encontrado los dos bloques Value esperados (sufijos "a" e "i"): ${JSON.stringify(
        valuesRaw
      )}`
    );
  }

  return { valorA, valorI };
}

function parseS04Periodo(raw: any): S04Periodo {
  const { fecha: fechaInicio, hora: horaInicio, flagHorario: flagHorarioInicio } = parseFh(
    String(raw.Fhi)
  );
  const { fecha: fechaFin, hora: horaFin, flagHorario: flagHorarioFin } = parseFh(String(raw.Fhf));

  let fechaMax: string | null = null;
  let horaMax: string | null = null;
  let flagHorarioMax: string | null = null;
  if (raw.Fx !== undefined) {
    const parsedFx = parseFh(String(raw.Fx));
    fechaMax = parsedFx.fecha;
    horaMax = parsedFx.hora;
    flagHorarioMax = parsedFx.flagHorario;
  }

  const valuesRaw: any[] = Array.isArray(raw.Value) ? raw.Value : [raw.Value];
  const { valorA, valorI } = splitValues(valuesRaw);

  return {
    ctr: toNullableNumber(raw.Ctr),
    pt: toNumber(raw.Pt),

    fechaInicio,
    horaInicio,
    flagHorarioInicio,
    fhiRaw: String(raw.Fhi),

    fechaFin,
    horaFin,
    flagHorarioFin,
    fhfRaw: String(raw.Fhf),

    mx: toNullableNumber(raw.Mx),
    fechaMax,
    horaMax,
    flagHorarioMax,
    fxRaw: raw.Fx !== undefined ? String(raw.Fx) : null,

    aiA: toNumber(valorA.AIa),
    aeA: toNumber(valorA.AEa),
    r1A: toNumber(valorA.R1a),
    r2A: toNumber(valorA.R2a),
    r3A: toNumber(valorA.R3a),
    r4A: toNumber(valorA.R4a),

    aiI: toNumber(valorI.AIi),
    aeI: toNumber(valorI.AEi),
    r1I: toNumber(valorI.R1i),
    r2I: toNumber(valorI.R2i),
    r3I: toNumber(valorI.R3i),
    r4I: toNumber(valorI.R4i),
  };
}

function parseS04Contador(raw: any): S04Contador {
  const periodosRaw = raw.S04 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    periodos: (Array.isArray(periodosRaw) ? periodosRaw : [periodosRaw]).map(parseS04Periodo),
  };
}

function parseS04Concentrador(raw: any): S04Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS04Contador
    ),
  };
}

export class S04Parser implements FileParser<S04File> {
  tipo = 'S04';

  parse(xmlContent: string): S04File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS04Concentrador),
    };
  }
}
