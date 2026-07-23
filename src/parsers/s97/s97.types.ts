export interface S97Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  nr: number | null;
  ns: number | null;
  nt: number | null;
  bc: string | null;
}

export interface S97Rtu {
  rtuId: string;
  medidas: S97Medida[];
}

export interface S97File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S97Rtu[];
}
