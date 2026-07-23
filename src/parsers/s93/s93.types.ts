export interface S93Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  vr: number | null;
  vs: number | null;
  vt: number | null;
  bc: string | null;
}

export interface S93Rtu {
  rtuId: string;
  medidas: S93Medida[];
}

export interface S93File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S93Rtu[];
}
