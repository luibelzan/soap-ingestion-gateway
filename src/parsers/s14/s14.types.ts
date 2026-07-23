export interface S14Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  v1: number | null;
  v2: number | null;
  v3: number | null;
  i1: number | null;
  i2: number | null;
  i3: number | null;
  inNeutro: number | null;
  simp: number | null;
  sexp: number | null;
}

export interface S14Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: S14Lectura[];
}

export interface S14Concentrador {
  cncId: string;
  contadores: S14Contador[];
}

export interface S14File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S14Concentrador[];
}
