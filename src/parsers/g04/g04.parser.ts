import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G04Concentrador, G04Contador, G04File, G04Lectura } from './g04.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'G04'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG04Lectura(raw: any): G04Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    maxVph1Lv: toNullableNumber(raw.MaxVph1_lv),
    maxVph2Lv: toNullableNumber(raw.MaxVph2_lv),
    maxVph3Lv: toNullableNumber(raw.MaxVph3_lv),
    maxIph1Lv: toNullableNumber(raw.MaxIph1_lv),
    maxIph2Lv: toNullableNumber(raw.MaxIph2_lv),
    maxIph3Lv: toNullableNumber(raw.MaxIph3_lv),

    maxPplusTriph: toNullableNumber(raw.MaxPplus_triph),
    maxPminusTriph: toNullableNumber(raw.MaxPminus_triph),
    maxQplusTriph: toNullableNumber(raw.MaxQplus_triph),
    maxQminusTriph: toNullableNumber(raw.MaxQminus_triph),

    maxVph1Mv: toNullableNumber(raw.MaxVph1_mv),
    maxVph2Mv: toNullableNumber(raw.MaxVph2_mv),
    maxVph3Mv: toNullableNumber(raw.MaxVph3_mv),

    maxIneutral: toNullableNumber(raw.MaxIneutral),

    // OJO: el XML usa "MaxVo_comp" (letra O), se asume V0 (dígito cero)
    // por analogía con MaxV1_comp/MaxV2_comp que le siguen.
    maxV0Comp: toNullableNumber(raw.MaxVo_comp),
    maxV1Comp: toNullableNumber(raw.MaxV1_comp),
    maxV2Comp: toNullableNumber(raw.MaxV2_comp),

    maxVhs: toNullableNumber(raw.MaxVhs),
  };
}

function parseG04Contador(raw: any): G04Contador {
  const lecturasRaw = raw.G04 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseG04Lectura),
  };
}

function parseG04Concentrador(raw: any): G04Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseG04Contador
    ),
  };
}

export class G04Parser implements FileParser<G04File> {
  tipo = 'G04';

  parse(xmlContent: string): G04File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseG04Concentrador),
    };
  }
}