export interface S24Meter {
  meterId: string;
  comStatus: number | null;

  meterFecha: string | null;
  meterHora: string | null;
  meterMs: string | null;
  meterFlagHorario: string | null;
  meterDateRaw: string | null;

  active: string | null;
}

export interface S24Snapshot {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  ms: string;
  flagHorario: string | null;
  fhRaw: string;

  meters: S24Meter[];
}

export interface S24Concentrador {
  cncId: string;
  snapshots: S24Snapshot[];
}

export interface S24File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S24Concentrador[];
}
