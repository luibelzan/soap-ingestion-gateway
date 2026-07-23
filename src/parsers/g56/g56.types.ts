export interface G56Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  avgCPh1: number | null;
  avgVPh1: number | null;
  avgPimpPh1: number | null;
  avgPexpPh1: number | null;
  avgQimpPh1: number | null;
  avgQexpPh1: number | null;
  avgPfPh1: number | null;

  avgCPh2: number | null;
  avgVPh2: number | null;
  avgPimpPh2: number | null;
  avgPexpPh2: number | null;
  avgQimpPh2: number | null;
  avgQexpPh2: number | null;
  avgPfPh2: number | null;

  avgCPh3: number | null;
  avgVPh3: number | null;
  avgPimpPh3: number | null;
  avgPexpPh3: number | null;
  avgQimpPh3: number | null;
  avgQexpPh3: number | null;
  avgPfPh3: number | null;

  avgV12: number | null;
  avgV23: number | null;
  avgV31: number | null;

  avgCn: number | null;
  temp: number | null;
  bc: string | null;
}

export interface G56LvsLine {
  lvslineId: string;
  pos: string;
  medidas: G56Medida[];
}

export interface G56Rtu {
  rtuId: string;
  lineas: G56LvsLine[];
}

export interface G56File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: G56Rtu[];
}
