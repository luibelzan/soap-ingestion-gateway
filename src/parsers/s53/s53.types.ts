export interface S53Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  aiPh1: number;
  aiPh2: number;
  aiPh3: number;
  aePh1: number;
  aePh2: number;
  aePh3: number;
  r1Ph1: number;
  r1Ph2: number;
  r1Ph3: number;
  r2Ph1: number;
  r2Ph2: number;
  r2Ph3: number;
  r3Ph1: number;
  r3Ph2: number;
  r3Ph3: number;
  r4Ph1: number;
  r4Ph2: number;
  r4Ph3: number;
}

export interface S53LvsLine {
  lvslineId: string;
  pos: string;
  magn: number | null;
  lecturas: S53Lectura[];
}

export interface S53Rtu {
  rtuId: string;
  lineas: S53LvsLine[];
}

export interface S53File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S53Rtu[];
}
