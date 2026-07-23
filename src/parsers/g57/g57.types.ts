export interface G57Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  maxCPh1: number | null;
  maxVPh1: number | null;
  maxPimpPh1: number | null;
  maxPexpPh1: number | null;
  maxQimpPh1: number | null;
  maxQexpPh1: number | null;
  maxPfPh1: number | null;

  maxCPh2: number | null;
  maxVPh2: number | null;
  maxPimpPh2: number | null;
  maxPexpPh2: number | null;
  maxQimpPh2: number | null;
  maxQexpPh2: number | null;
  maxPfPh2: number | null;

  maxCPh3: number | null;
  maxVPh3: number | null;
  maxPimpPh3: number | null;
  maxPexpPh3: number | null;
  maxQimpPh3: number | null;
  maxQexpPh3: number | null;
  maxPfPh3: number | null;

  maxV12: number | null;
  maxV23: number | null;
  maxV31: number | null;

  maxCn: number | null;
  bc: string | null;
}

export interface G57LvsLine {
  lvslineId: string;
  pos: string;
  medidas: G57Medida[];
}

export interface G57Rtu {
  rtuId: string;
  lineas: G57LvsLine[];
}

export interface G57File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: G57Rtu[];
}
