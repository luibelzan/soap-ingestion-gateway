import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S12Concentrador, S12File, S12Snapshot, S12Tarea } from './s12.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'S12', 'TP', 'TpPro'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

/** Texto tal cual; string vacía se guarda como null (muchos campos de S12 vienen "") */
function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

function parseS12Tarea(tpRaw: any, tpProRaw: any): S12Tarea {
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

    // TpPer NO tiene el formato de Fh (le falta la letra final), se
    // guarda tal cual sin intentar parsearlo como fecha-hora.
    tpPerRaw: toNullableString(tpRaw.TpPer),
    tpCompl: toNullableString(tpRaw.TpCompl),
    tpMet: toNullableString(tpRaw.TpMet),
    tpPrio: toNullableNumber(tpRaw.TpPrio),

    tpReq: String(tpProRaw.TpReq),
    tpSend: toNullableString(tpProRaw.TpSend),
    tpStore: toNullableString(tpProRaw.TpStore),
  };
}

function parseS12Tareas(raw: any): S12Tarea[] {
  const tpsRaw: any[] = raw.TP ?? [];
  const tareas: S12Tarea[] = [];

  for (const tp of Array.isArray(tpsRaw) ? tpsRaw : [tpsRaw]) {
    const tpProsRaw: any[] = tp.TpPro ?? [];
    for (const tpPro of Array.isArray(tpProsRaw) ? tpProsRaw : [tpProsRaw]) {
      tareas.push(parseS12Tarea(tp, tpPro));
    }
  }

  return tareas;
}

function parseS12Snapshot(raw: any): S12Snapshot {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    mod: toNullableString(raw.Mod),
    af: toNullableNumber(raw.Af),
    te: toNullableString(raw.Te),
    vf: toNullableString(raw.Vf),
    vfComm: toNullableString(raw.VfComm),
    pro: toNullableString(raw.Pro),
    com: toNullableString(raw.Com),
    bat: toNullableNumber(raw.Bat),

    ipCom: toNullableString(raw.ipCom),
    portWs: toNullableNumber(raw.PortWS),
    ipMask: toNullableString(raw.ipMask),
    ipGtw: toNullableString(raw.ipGtw),
    ipDhcp: toNullableString(raw.ipDhcp),
    slave1: toNullableString(raw.Slave1),
    slave2: toNullableString(raw.Slave2),
    slave3: toNullableString(raw.Slave3),
    ipLoc: toNullableString(raw.ipLoc),
    ipMaskLoc: toNullableString(raw.ipMaskLoc),
    macPlc: toNullableString(raw.Macplc),
    pse: toNullableNumber(raw.Pse),
    priority: toNullableString(raw.Priority),

    ipStg: toNullableString(raw.IPstg),
    ipNtp: toNullableString(raw.IPNTP),
    ipFtp: toNullableString(raw.IPftp),
    ftpUserReport: toNullableString(raw.FTPUserReport),
    ipFtpDcUpg: toNullableString(raw.IPftpDCUpg),
    userFtpDcUpg: toNullableString(raw.UserftpDCUpg),
    ipFtpMeterUpg: toNullableString(raw.IPftpMeterUpg),
    userFtpMeterUpg: toNullableString(raw.UserftpMeterUpg),
    retryFtp: toNullableNumber(raw.RetryFtp),
    timeBetwFtp: toNullableNumber(raw.TimeBetwFtp),
    ipFtpCycles: toNullableString(raw.IPftpCycles),
    userFtpCycles: toNullableString(raw.UserftpCycles),
    destDirCycles: toNullableString(raw.DestDirCycles),

    syncMeter: toNullableString(raw.SyncMeter),
    timeOutMeterFwU: toNullableNumber(raw.TimeOutMeterFwU),
    timeDevOver: toNullableNumber(raw.TimeDevOver),
    timeDev: toNullableNumber(raw.TimeDev),
    resetMsg: toNullableString(raw.ResetMsg),
    numMeters: toNullableNumber(raw.NumMeters),
    timeSendReq: toNullableNumber(raw.TimeSendReq),
    timeDisconMeter: toNullableNumber(raw.TimeDisconMeter),
    retryDisconMeter: toNullableNumber(raw.RetryDisconMeter),
    timeRetryInterval: toNullableNumber(raw.TimeRetryInterval),

    meterRegData: toNullableString(raw.MeterRegData),
    reportFormat: toNullableNumber(raw.ReportFormat),
    s26Content: toNullableString(raw.S26Content),
    valuesCheckDelay: toNullableNumber(raw.ValuesCheckDelay),
    maxOrderOutdate: toNullableNumber(raw.MaxOrderOutdate),
    timeDelayRestart: toNullableNumber(raw.TimeDelayRestart),
    ntpMaxDeviation: toNullableNumber(raw.NTPMaxDeviation),
    accInacTimeout: toNullableNumber(raw.AccInacTimeout),
    accSimulMax: toNullableNumber(raw.AccSimulMax),

    tareas: parseS12Tareas(raw),
  };
}

function parseS12Concentrador(raw: any): S12Concentrador {
  const snapshotsRaw = raw.S12 ?? [];

  return {
    cncId: String(raw.Id),
    snapshots: (Array.isArray(snapshotsRaw) ? snapshotsRaw : [snapshotsRaw]).map(
      parseS12Snapshot
    ),
  };
}

export class S12Parser implements FileParser<S12File> {
  tipo = 'S12';

  parse(xmlContent: string): S12File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS12Concentrador),
    };
  }
}
