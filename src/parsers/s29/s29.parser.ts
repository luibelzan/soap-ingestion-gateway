import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S29Concentrador, S29Contador, S29File, S29Lectura } from './s29.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // El atributo xmlns del Report se ignora.
  isArray: (name) => ['Cnc', 'Cnt', 'S29'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

function parseS29Lectura(raw: any): S29Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    l1v: toNullableNumber(raw.L1v),
    l1i: toNullableNumber(raw.L1i),
    l2v: toNullableNumber(raw.L2v),
    l2i: toNullableNumber(raw.L2i),
    l3v: toNullableNumber(raw.L3v),
    l3i: toNullableNumber(raw.L3i),

    isum: toNullableNumber(raw.Isum),
    inNeutro: toNullableNumber(raw.In),
    idDif: toNullableNumber(raw.Id),

    psigned: toNullableNumber(raw.Psigned),
    l1p: toNullableNumber(raw.L1P),
    l2p: toNullableNumber(raw.L2P),
    l3p: toNullableNumber(raw.L3P),

    qsigned: toNullableNumber(raw.Qsigned),
    l1q: toNullableNumber(raw.L1Q),
    l2q: toNullableNumber(raw.L2Q),
    l3q: toNullableNumber(raw.L3Q),

    pf: toNullableNumber(raw.PF),
    l1pf: toNullableNumber(raw.L1PF),
    l2pf: toNullableNumber(raw.L2PF),
    l3pf: toNullableNumber(raw.L3PF),

    phaseSeq: toNullableString(raw.PhaseSeq),

    l1vAng: toNullableNumber(raw.L1vAng),
    l2vAng: toNullableNumber(raw.L2vAng),
    l3vAng: toNullableNumber(raw.L3vAng),
    l1iAng: toNullableNumber(raw.L1iAng),
    l2iAng: toNullableNumber(raw.L2iAng),
    l3iAng: toNullableNumber(raw.L3iAng),
    inAng: toNullableNumber(raw.InAng),
    idAng: toNullableNumber(raw.IdAng),
  };
}

function parseS29Contador(raw: any): S29Contador {
  const lecturasRaw = raw.S29 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS29Lectura),
  };
}

function parseS29Concentrador(raw: any): S29Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS29Contador
    ),
  };
}

export class S29Parser implements FileParser<S29File> {
  tipo = 'S29';

  parse(xmlContent: string): S29File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS29Concentrador),
    };
  }
}
