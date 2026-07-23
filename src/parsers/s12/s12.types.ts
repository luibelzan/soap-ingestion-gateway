export interface S12Tarea {
  tpTar: number;

  tpHiFecha: string | null; // AAAA-MM-DD, de TP/@TpHi
  tpHiHora: string | null;  // HH:mm:ss, de TP/@TpHi
  tpHiFlagHorario: string | null;
  tpHiRaw: string | null;

  tpPerRaw: string | null; // sin interpretar, ver nota en el esquema SQL
  tpCompl: string | null;
  tpMet: string | null;
  tpPrio: number | null;

  tpReq: string;
  tpSend: string | null;
  tpStore: string | null;
}

export interface S12Snapshot {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  mod: string | null;
  af: number | null;
  te: string | null;
  vf: string | null;
  vfComm: string | null;
  pro: string | null;
  com: string | null;
  bat: number | null;

  ipCom: string | null;
  portWs: number | null;
  ipMask: string | null;
  ipGtw: string | null;
  ipDhcp: string | null;
  slave1: string | null;
  slave2: string | null;
  slave3: string | null;
  ipLoc: string | null;
  ipMaskLoc: string | null;
  macPlc: string | null;
  pse: number | null;
  priority: string | null;

  ipStg: string | null;
  ipNtp: string | null;
  ipFtp: string | null;
  ftpUserReport: string | null;
  ipFtpDcUpg: string | null;
  userFtpDcUpg: string | null;
  ipFtpMeterUpg: string | null;
  userFtpMeterUpg: string | null;
  retryFtp: number | null;
  timeBetwFtp: number | null;
  ipFtpCycles: string | null;
  userFtpCycles: string | null;
  destDirCycles: string | null;

  syncMeter: string | null;
  timeOutMeterFwU: number | null;
  timeDevOver: number | null;
  timeDev: number | null;
  resetMsg: string | null;
  numMeters: number | null;
  timeSendReq: number | null;
  timeDisconMeter: number | null;
  retryDisconMeter: number | null;
  timeRetryInterval: number | null;

  meterRegData: string | null;
  reportFormat: number | null;
  s26Content: string | null;
  valuesCheckDelay: number | null;
  maxOrderOutdate: number | null;
  timeDelayRestart: number | null;
  ntpMaxDeviation: number | null;
  accInacTimeout: number | null;
  accSimulMax: number | null;

  tareas: S12Tarea[];
}

export interface S12Concentrador {
  cncId: string;
  snapshots: S12Snapshot[];
}

export interface S12File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S12Concentrador[];
}
