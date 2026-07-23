export interface S45Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  maxL1i: number | null;
  maxL2i: number | null;
  maxL3i: number | null;
  maxIn: number | null;
  avL1i: number | null;
  avL2i: number | null;
  avL3i: number | null;
  avIn: number | null;
  minL1i: number | null;
  minL2i: number | null;
  minL3i: number | null;
  minIn: number | null;
}

export interface S45Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: S45Lectura[];
}

export interface S45Concentrador {
  cncId: string;
  contadores: S45Contador[];
}

export interface S45File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S45Concentrador[];
}
