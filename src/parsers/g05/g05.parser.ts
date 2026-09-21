import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G05Concentrador, G05Contador, G05File, G05Lectura } from './g05.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'G05'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG05Lectura(raw: any): G05Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    minVph1Lv: toNullableNumber(raw.MinVph1_lv),
    minVph2Lv: toNullableNumber(raw.MinVph2_lv),
    minVph3Lv: toNullableNumber(raw.MinVph3_lv),
    minIph1Lv: toNullableNumber(raw.MinIph1_lv),
    minIph2Lv: toNullableNumber(raw.MinIph2_lv),
    minIph3Lv: toNullableNumber(raw.MinIph3_lv),

    minPplusTriph: toNullableNumber(raw.MinPplus_triph),
    minPminusTriph: toNullableNumber(raw.MinPminus_triph),
    minQplusTriph: toNullableNumber(raw.MinQplus_triph),
    minQminusTriph: toNullableNumber(raw.MinQminus_triph),

    minVph1Mv: toNullableNumber(raw.MinVph1_mv),
    minVph2Mv: toNullableNumber(raw.MinVph2_mv),
    minVph3Mv: toNullableNumber(raw.MinVph3_mv),

    minIneutral: toNullableNumber(raw.MinIneutral),

    // OJO: el XML usa "MinVo_comp" (letra O), se asume V0 (dígito cero)
    // por analogía con MinV1_comp/MinV2_comp que le siguen.
    minV0Comp: toNullableNumber(raw.MinVo_comp),
    minV1Comp: toNullableNumber(raw.MinV1_comp),
    minV2Comp: toNullableNumber(raw.MinV2_comp),

    minVhs: toNullableNumber(raw.MinVhs),
  };
}

function parseG05Contador(raw: any): G05Contador {
  const lecturasRaw = raw.G05 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseG05Lectura),
  };
}

function parseG05Concentrador(raw: any): G05Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseG05Contador
    ),
  };
}

export class G05Parser implements FileParser<G05File> {
  tipo = 'G05';

  parse(xmlContent: string): G05File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseG05Concentrador),
    };
  }
}