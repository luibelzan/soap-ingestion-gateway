export interface S44Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  maxL1v: number | null;
  maxL2v: number | null;
  maxL3v: number | null;
  avL1v: number | null;
  avL2v: number | null;
  avL3v: number | null;
  minL1v: number | null;
  minL2v: number | null;
  minL3v: number | null;
}

export interface S44Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: S44Lectura[];
}

export interface S44Concentrador {
  cncId: string;
  contadores: S44Contador[];
}

export interface S44File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S44Concentrador[];
}
