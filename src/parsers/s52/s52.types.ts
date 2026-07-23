export interface S52Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  ai: number;
  ae: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
}

export interface S52LvsLine {
  lvslineId: string;
  pos: string;
  magn: number | null;
  lecturas: S52Lectura[];
}

export interface S52Rtu {
  rtuId: string;
  lineas: S52LvsLine[];
}

export interface S52File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S52Rtu[];
}
