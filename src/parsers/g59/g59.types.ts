export interface G59Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  momCPh1: number | null;
  momVPh1: number | null;
  momPimpPh1: number | null;
  momPexpPh1: number | null;
  momQimpPh1: number | null;
  momQexpPh1: number | null;
  momPfPh1: number | null;

  momCPh2: number | null;
  momVPh2: number | null;
  momPimpPh2: number | null;
  momPexpPh2: number | null;
  momQimpPh2: number | null;
  momQexpPh2: number | null;
  momPfPh2: number | null;

  momCPh3: number | null;
  momVPh3: number | null;
  momPimpPh3: number | null;
  momPexpPh3: number | null;
  momQimpPh3: number | null;
  momQexpPh3: number | null;
  momPfPh3: number | null;

  momV12: number | null;
  momV23: number | null;
  momV31: number | null;

  momCn: number | null;
  bc: string | null;
}

export interface G59LvsLine {
  lvslineId: string;
  pos: string;
  medidas: G59Medida[];
}

export interface G59Rtu {
  rtuId: string;
  lineas: G59LvsLine[];
}

export interface G59File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: G59Rtu[];
}
