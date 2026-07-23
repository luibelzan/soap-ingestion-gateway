export interface S95Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  vu: number | null;
  pi: string | null;
  bc: string | null;
}

export interface S95Rtu {
  rtuId: string;
  medidas: S95Medida[];
}

export interface S95File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S95Rtu[];
}
