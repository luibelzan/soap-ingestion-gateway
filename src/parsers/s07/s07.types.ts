export interface S07Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  dc: number | null;
  nc: number | null;
  df: number | null;

  hcFecha: string | null;
  hcHora: string | null;
  hcFlagHorario: string | null;
  hcRaw: string | null;
}

export interface S07Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: S07Lectura[];
}

export interface S07Concentrador {
  cncId: string;
  contadores: S07Contador[];
}

export interface S07File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S07Concentrador[];
}
