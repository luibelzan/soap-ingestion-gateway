export interface S05Periodo {
  ctr: number | null;
  pt: number;

  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  aiA: number;
  aeA: number;
  r1A: number;
  r2A: number;
  r3A: number;
  r4A: number;
}

export interface S05Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  periodos: S05Periodo[];
}

export interface S05Concentrador {
  cncId: string;
  contadores: S05Contador[];
}

export interface S05File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S05Concentrador[];
}
