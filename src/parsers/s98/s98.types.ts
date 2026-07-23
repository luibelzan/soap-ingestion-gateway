export interface S98Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  ift1: number | null;
  ift2: number | null;
  ift3: number | null;
  bc: string | null;
}

export interface S98Rtu {
  rtuId: string;
  medidas: S98Medida[];
}

export interface S98File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S98Rtu[];
}
