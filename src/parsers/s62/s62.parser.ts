import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S62File, S62Rtu, S62Snapshot, S62Tarea } from './s62.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Rtu', 'S62', 'TP', 'TpPro'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

/** Texto tal cual; string vacía se guarda como null (muchos campos vienen "") */
function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

function parseS62Tarea(tpRaw: any, tpProRaw: any): S62Tarea {
  let tpHiFecha: string | null = null;
  let tpHiHora: string | null = null;
  let tpHiFlagHorario: string | null = null;
  const tpHiRaw = toNullableString(tpRaw.TpHi);

  if (tpHiRaw !== null) {
    const parsed = parseFh(tpHiRaw);
    tpHiFecha = parsed.fecha;
    tpHiHora = parsed.hora;
    tpHiFlagHorario = parsed.flagHorario;
  }

  return {
    tpTar: Number(tpRaw.TpTar),

    tpHiFecha,
    tpHiHora,
    tpHiFlagHorario,
    tpHiRaw,

    // TpPer NO tiene el formato completo de Fh (le falta la letra
    // final), se guarda tal cual sin intentar parsearlo.
    tpPerRaw: toNullableString(tpRaw.TpPer),
    tpCompl: toNullableString(tpRaw.TpCompl),
    tpLvscard: toNullableString(tpRaw.TpLVSCard),
    tpPrio: toNullableNumber(tpRaw.TpPrio),

    tpReq: String(tpProRaw.TpReq),
    tpSend: toNullableString(tpProRaw.TpSend),
    tpStore: toNullableString(tpProRaw.TpStore),
  };
}

function parseS62Tareas(raw: any): S62Tarea[] {
  const tpsRaw: any[] = raw.TP ?? [];
  const tareas: S62Tarea[] = [];

  for (const tp of Array.isArray(tpsRaw) ? tpsRaw : [tpsRaw]) {
    const tpProsRaw: any[] = tp.TpPro ?? [];
    for (const tpPro of Array.isArray(tpProsRaw) ? tpProsRaw : [tpProsRaw]) {
      tareas.push(parseS62Tarea(tp, tpPro));
    }
  }

  return tareas;
}

function parseS62Snapshot(raw: any): S62Snapshot {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  let fechaConf: string | null = null;
  let horaConf: string | null = null;
  let flagHorarioConf: string | null = null;
  const dateConfRaw = toNullableString(raw.dateConf);
  if (dateConfRaw !== null) {
    const parsedConf = parseFh(dateConfRaw);
    fechaConf = parsedConf.fecha;
    horaConf = parsedConf.hora;
    flagHorarioConf = parsedConf.flagHorario;
  }

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    idAttr: toNullableString(raw.Id),

    partNumber: toNullableString(raw.PartNumber),
    mod: toNullableString(raw.Mod),
    af: toNullableNumber(raw.Af),
    te: toNullableString(raw.Te),
    vf: toNullableString(raw.Vf),
    revConf: toNullableString(raw.revConf),

    fechaConf,
    horaConf,
    flagHorarioConf,
    dateConfRaw,

    nomInstal: toNullableString(raw.NomInstal),
    codInstal: toNullableString(raw.CodInstal),
    serialBaudRate: toNullableNumber(raw.SerialBaudRate),

    ipCom: toNullableString(raw.ipCom),
    portWs: toNullableNumber(raw.PortWS),
    ipMask: toNullableString(raw.ipMask),
    ipGtw: toNullableString(raw.ipGtw),
    ipDhcp: toNullableString(raw.ipDhcp),
    tRetryDhcp: toNullableNumber(raw.tRetryDHCP),
    ipLocal: toNullableString(raw.ipLocal),
    ipMaskLocal: toNullableString(raw.ipMaskLocal),
    priority: toNullableString(raw.Priority),

    ipAuth: toNullableString(raw.ipAuth),
    nRetryAuth: toNullableNumber(raw.nRetryAuth),
    tRetryAuth: toNullableNumber(raw.tRetryAuth),

    ldapCat1: toNullableString(raw.LdapCat1),
    ldapCat2: toNullableString(raw.LdapCat2),
    ldapCat3: toNullableString(raw.LdapCat3),
    ldapCat4: toNullableString(raw.LdapCat4),
    ldapCat5: toNullableString(raw.LdapCat5),
    ldapCat6: toNullableString(raw.LdapCat6),
    ldapCat7: toNullableString(raw.LdapCat7),
    ldapCat8: toNullableString(raw.LdapCat8),

    ipStg: toNullableString(raw.ipStg),
    portStg: toNullableNumber(raw.PortStg),
    ipNtp: toNullableString(raw.ipNtp),
    nRetryNtp: toNullableNumber(raw.nRetryNtp),
    tRetryNtp: toNullableNumber(raw.tRetryNtp),
    timeSincroNtp: toNullableNumber(raw.timeSincroNtp),
    tZone: toNullableString(raw.tZone),

    ipFtp: toNullableString(raw.ipFtp),
    ftpUserReport: toNullableString(raw.FTPUserReport),
    ipFtpRtuUpg: toNullableString(raw.IPftpRTUUpg),
    userFtpRtuUpg: toNullableString(raw.UserftpRTUUpg),
    ipFtpLsvUpg: toNullableString(raw.IPftpLSVUpg),
    userFtpLsvUpg: toNullableString(raw.UserftpLSVUpg),
    timeOutFtpFwU: toNullableNumber(raw.TimeOutFTPFwU),
    timeOutLsFwU: toNullableNumber(raw.TimeOutLSFwU),
    nRetryFtp: toNullableNumber(raw.nRetryFTP),
    tRetryFtp: toNullableNumber(raw.tRetryFTP),
    toutFtp: toNullableNumber(raw.toutFTP),
    nRetryWs: toNullableNumber(raw.nRetryWS),
    tRetryWs: toNullableNumber(raw.tRetryWS),
    toutWs: toNullableNumber(raw.toutWS),

    timeDev: toNullableNumber(raw.TimeDev),
    reportFormat: toNullableNumber(raw.ReportFormat),
    numLsvCards: toNullableNumber(raw.NumLSVCards),
    timeSendReq: toNullableNumber(raw.TimeSendReq),
    timeDisconLvsCard: toNullableNumber(raw.TimeDisconLVSCard),
    nRetryLvsCard: toNullableNumber(raw.nRetryLVSCard),
    tRetryLvsCard: toNullableNumber(raw.tRetryLVSCard),
    toutLvsCard: toNullableNumber(raw.toutLVSCard),
    toutHdlcPolling: toNullableNumber(raw.toutHdlcPolling),
    checkPolling: toNullableNumber(raw.checkPolling),
    valuesCheckDelay: toNullableNumber(raw.ValuesCheckDelay),
    maxOrderOutdate: toNullableNumber(raw.MaxOrderOutdate),
    toutRtuConfig: toNullableNumber(raw.toutRtuConfig),
    ntpMaxDeviation: toNullableNumber(raw.NTPMaxDeviation),
    accInacTimeout: toNullableNumber(raw.AccInacTimeout),
    accSimulMax: toNullableNumber(raw.AccSimulMax),

    ift: toNullableNumber(raw.Ift),
    tftTAct: toNullableNumber(raw.TftTAct),
    hft: toNullableNumber(raw.Hft),
    tftTDeact: toNullableNumber(raw.TftTDeact),
    vr: toNullableNumber(raw.Vr),
    uinT: toNullableNumber(raw.UinT),
    uinH: toNullableNumber(raw.UinH),
    udipT: toNullableNumber(raw.UdipT),
    udipH: toNullableNumber(raw.UdipH),
    uoverT: toNullableNumber(raw.UoverT),
    uoverH: toNullableNumber(raw.UoverH),
    overTemp: toNullableNumber(raw.overTemp),

    cfgRtuEvMask1: toNullableString(raw.CfgRTUEvMask1),
    sptRtuEvMask1: toNullableString(raw.SptRTUEvMask1),
    cfgRtuEvMask2: toNullableString(raw.CfgRTUEvMask2),
    sptRtuEvMask2: toNullableString(raw.SptRTUEvMask2),
    cfgRtuEvMask4: toNullableString(raw.CfgRTUEvMask4),
    sptRtuEvMask4: toNullableString(raw.SptRTUEvMask4),
    cfgRtuEvMask5: toNullableString(raw.CfgRTUEvMask5),
    sptRtuEvMask5: toNullableString(raw.SptRTUEvMask5),
    cfgRtuEvMask8: toNullableString(raw.CfgRTUEvMask8),
    sptRtuEvMask8: toNullableString(raw.SptRTUEvMask8),
    cfgRtuEvMask9: toNullableString(raw.CfgRTUEvMask9),
    sptRtuEvMask9: toNullableString(raw.SptRTUEvMask9),

    tareas: parseS62Tareas(raw),
  };
}

function parseS62Rtu(raw: any): S62Rtu {
  const snapshotsRaw = raw.S62 ?? [];

  return {
    rtuId: String(raw.Id),
    snapshots: (Array.isArray(snapshotsRaw) ? snapshotsRaw : [snapshotsRaw]).map(
      parseS62Snapshot
    ),
  };
}

export class S62Parser implements FileParser<S62File> {
  tipo = 'S62';

  parse(xmlContent: string): S62File {
    const parsed = xmlParser.parse(xmlContent);
    const report = parsed.Report;

    if (!report) {
      throw new Error('El XML no contiene un elemento raíz <Report>');
    }

    const rtusRaw = report.Rtu ?? [];

    return {
      idRpt: String(report.IdRpt),
      idPet: String(report.IdPet),
      version: String(report.Version),
      rtus: (Array.isArray(rtusRaw) ? rtusRaw : [rtusRaw]).map(parseS62Rtu),
    };
  }
}
