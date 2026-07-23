export interface S62Tarea {
  tpTar: number;

  tpHiFecha: string | null;
  tpHiHora: string | null;
  tpHiFlagHorario: string | null;
  tpHiRaw: string | null;

  tpPerRaw: string | null;
  tpCompl: string | null;
  tpLvscard: string | null;
  tpPrio: number | null;

  tpReq: string;
  tpSend: string | null;
  tpStore: string | null;
}

export interface S62Snapshot {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  idAttr: string | null;

  partNumber: string | null;
  mod: string | null;
  af: number | null;
  te: string | null;
  vf: string | null;
  revConf: string | null;

  fechaConf: string | null;
  horaConf: string | null;
  flagHorarioConf: string | null;
  dateConfRaw: string | null;

  nomInstal: string | null;
  codInstal: string | null;
  serialBaudRate: number | null;

  ipCom: string | null;
  portWs: number | null;
  ipMask: string | null;
  ipGtw: string | null;
  ipDhcp: string | null;
  tRetryDhcp: number | null;
  ipLocal: string | null;
  ipMaskLocal: string | null;
  priority: string | null;

  ipAuth: string | null;
  nRetryAuth: number | null;
  tRetryAuth: number | null;

  ldapCat1: string | null;
  ldapCat2: string | null;
  ldapCat3: string | null;
  ldapCat4: string | null;
  ldapCat5: string | null;
  ldapCat6: string | null;
  ldapCat7: string | null;
  ldapCat8: string | null;

  ipStg: string | null;
  portStg: number | null;
  ipNtp: string | null;
  nRetryNtp: number | null;
  tRetryNtp: number | null;
  timeSincroNtp: number | null;
  tZone: string | null;

  ipFtp: string | null;
  ftpUserReport: string | null;
  ipFtpRtuUpg: string | null;
  userFtpRtuUpg: string | null;
  ipFtpLsvUpg: string | null;
  userFtpLsvUpg: string | null;
  timeOutFtpFwU: number | null;
  timeOutLsFwU: number | null;
  nRetryFtp: number | null;
  tRetryFtp: number | null;
  toutFtp: number | null;
  nRetryWs: number | null;
  tRetryWs: number | null;
  toutWs: number | null;

  timeDev: number | null;
  reportFormat: number | null;
  numLsvCards: number | null;
  timeSendReq: number | null;
  timeDisconLvsCard: number | null;
  nRetryLvsCard: number | null;
  tRetryLvsCard: number | null;
  toutLvsCard: number | null;
  toutHdlcPolling: number | null;
  checkPolling: number | null;
  valuesCheckDelay: number | null;
  maxOrderOutdate: number | null;
  toutRtuConfig: number | null;
  ntpMaxDeviation: number | null;
  accInacTimeout: number | null;
  accSimulMax: number | null;

  ift: number | null;
  tftTAct: number | null;
  hft: number | null;
  tftTDeact: number | null;
  vr: number | null;
  uinT: number | null;
  uinH: number | null;
  udipT: number | null;
  udipH: number | null;
  uoverT: number | null;
  uoverH: number | null;
  overTemp: number | null;

  cfgRtuEvMask1: string | null;
  sptRtuEvMask1: string | null;
  cfgRtuEvMask2: string | null;
  sptRtuEvMask2: string | null;
  cfgRtuEvMask4: string | null;
  sptRtuEvMask4: string | null;
  cfgRtuEvMask5: string | null;
  sptRtuEvMask5: string | null;
  cfgRtuEvMask8: string | null;
  sptRtuEvMask8: string | null;
  cfgRtuEvMask9: string | null;
  sptRtuEvMask9: string | null;

  tareas: S62Tarea[];
}

export interface S62Rtu {
  rtuId: string;
  snapshots: S62Snapshot[];
}

export interface S62File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S62Rtu[];
}
