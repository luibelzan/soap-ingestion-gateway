export interface S96Armonico {
  orden: number; // 1 a 25
  valor: number | null;
}

export interface S96Fase {
  fase: 'R' | 'S' | 'T';
  armonicos: S96Armonico[];
  thd: number | null;
  bc: string | null;
}

export interface S96Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  fases: S96Fase[];
}

export interface S96Rtu {
  rtuId: string;
  medidas: S96Medida[];
}

export interface S96File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S96Rtu[];
}
