export interface S94Medida {
  tp: number | null;

  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  fr: number | null;
  fs: number | null;
  ft: number | null;
  bc: string | null;
}

export interface S94Rtu {
  rtuId: string;
  medidas: S94Medida[];
}

export interface S94File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S94Rtu[];
}
