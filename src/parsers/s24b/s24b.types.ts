export interface S24BMeter {
  serial: string;
  address: string | null;
  version: string | null;
  primeVersion: string | null;
  present: string | null;

  lastCommFecha: string | null;
  lastCommHora: string | null;
  lastCommMs: string | null;
  lastCommFlagHorario: string | null;
  lastCommRaw: string | null;

  dateTfFecha: string | null;
  dateTfHora: string | null;
  dateTfMs: string | null;
  dateTfFlagHorario: string | null;
  dateTfRaw: string | null;

  avgResponseTime: number | null;
  statusChanges: number | null;
  activeTime: number | null;
}

export interface S24BSnapshot {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  ms: string;
  flagHorario: string | null;
  fhRaw: string;

  meters: S24BMeter[];
}

export interface S24BConcentrador {
  cncId: string;
  snapshots: S24BSnapshot[];
}

export interface S24BFile {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S24BConcentrador[];
}
