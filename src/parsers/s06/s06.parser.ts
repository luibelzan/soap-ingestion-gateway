import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S06Concentrador, S06Contador, S06File, S06Snapshot } from './s06.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'Cnt', 'S06'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

/** Texto recortado de espacios; null si queda vacío tras el recorte. */
function toNullableTrimmedString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function parseS06Snapshot(raw: any): S06Snapshot {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    ns: toNullableTrimmedString(raw.NS),
    fab: toNullableTrimmedString(raw.Fab),
    mod: toNullableTrimmedString(raw.Mod),
    af: toNullableNumber(raw.Af),
    te: toNullableTrimmedString(raw.Te),
    vf: toNullableTrimmedString(raw.Vf),
    vprime: toNullableTrimmedString(raw.VPrime),
    pro: toNullableTrimmedString(raw.Pro),
    idm: toNullableTrimmedString(raw.Idm),
    mac: toNullableTrimmedString(raw.Mac),

    tp: toNullableTrimmedString(raw.Tp),
    ts: toNullableTrimmedString(raw.Ts),
    ip: toNullableTrimmedString(raw.Ip),
    is: toNullableTrimmedString(raw.Is),

    usag: toNullableNumber(raw.Usag),
    uswell: toNullableNumber(raw.Uswell),
    per: toNullableNumber(raw.Per),
    dctcp: toNullableNumber(raw.Dctcp),
    vr: toNullableNumber(raw.Vr),
    ut: toNullableNumber(raw.Ut),
    usubt: toNullableNumber(raw.UsubT),
    usobt: toNullableNumber(raw.UsobT),
    ucortet: toNullableNumber(raw.UcorteT),

    autMothBill: toNullableTrimmedString(raw.AutMothBill),
    scrollDispMode: toNullableTrimmedString(raw.ScrollDispMode),
    scrollDispTime: toNullableNumber(raw.ScrollDispTime),
  };
}

function parseS06Contador(raw: any): S06Contador {
  const snapshotsRaw = raw.S06 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    snapshots: (Array.isArray(snapshotsRaw) ? snapshotsRaw : [snapshotsRaw]).map(
      parseS06Snapshot
    ),
  };
}

function parseS06Concentrador(raw: any): S06Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS06Contador
    ),
  };
}

export class S06Parser implements FileParser<S06File> {
  tipo = 'S06';

  parse(xmlContent: string): S06File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS06Concentrador),
    };
  }
}
