export interface S64Lectura {
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

export interface S64LvsLine {
  lvslineId: string;
  pos: string;
  lecturas: S64Lectura[];
}

export interface S64Rtu {
  rtuId: string;
  lineas: S64LvsLine[];
}

export interface S64File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S64Rtu[];
}
