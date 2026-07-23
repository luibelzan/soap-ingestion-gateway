export interface G53Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  vtnMin: number | null;
  vtnAvg: number | null;
  vtnMax: number | null;
  vtnLsm: number | null;
  bc: string | null;
}

export interface G53Rtu {
  rtuId: string;
  medidas: G53Medida[];
}

export interface G53File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: G53Rtu[];
}
