import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G03Concentrador, G03Contador, G03File, G03Lectura } from './g03.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'G03'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG03Lectura(raw: any): G03Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    bc: raw.Bc !== undefined ? String(raw.Bc) : null,

    avVph1Lv: toNullableNumber(raw.AvVph1_lv),
    avVph2Lv: toNullableNumber(raw.AvVph2_lv),
    avVph3Lv: toNullableNumber(raw.AvVph3_lv),
    avIph1Lv: toNullableNumber(raw.AvIph1_lv),
    avIph2Lv: toNullableNumber(raw.AvIph2_lv),
    avIph3Lv: toNullableNumber(raw.AvIph3_lv),

    avPplusTriph: toNullableNumber(raw.AvPplus_triph),
    avPminusTriph: toNullableNumber(raw.AvPminus_triph),
    avQplusTriph: toNullableNumber(raw.AvQplus_triph),
    avQminusTriph: toNullableNumber(raw.AvQminus_triph),

    avVph1Mv: toNullableNumber(raw.AvVph1_mv),
    avVph2Mv: toNullableNumber(raw.AvVph2_mv),
    avVph3Mv: toNullableNumber(raw.AvVph3_mv),

    avIneutral: toNullableNumber(raw.AvIneutral),

    // OJO: el XML usa "AvVo_comp" (letra O), se asume V0 (dígito cero)
    // por analogía con AvV1_comp/AvV2_comp que le siguen.
    avV0Comp: toNullableNumber(raw.AvVo_comp),
    avV1Comp: toNullableNumber(raw.AvV1_comp),
    avV2Comp: toNullableNumber(raw.AvV2_comp),

    avVhs: toNullableNumber(raw.AvVhs),
  };
}

function parseG03Contador(raw: any): G03Contador {
  const lecturasRaw = raw.G03 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseG03Lectura),
  };
}

function parseG03Concentrador(raw: any): G03Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseG03Contador
    ),
  };
}

export class G03Parser implements FileParser<G03File> {
  tipo = 'G03';

  parse(xmlContent: string): G03File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseG03Concentrador),
    };
  }
}