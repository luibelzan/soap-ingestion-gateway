export interface G02Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  atime: number;
  nchanges: number;
  aconc: number;
  atimeperc: number;
}

export interface G02Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: G02Lectura[];
}

export interface G02Concentrador {
  cncId: string;
  contadores: G02Contador[];
}

export interface G02File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: G02Concentrador[];
}
