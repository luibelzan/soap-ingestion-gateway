export interface G58Medida {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  minCPh1: number | null;
  minVPh1: number | null;
  minPimpPh1: number | null;
  minPexpPh1: number | null;
  minQimpPh1: number | null;
  minQexpPh1: number | null;
  minPfPh1: number | null;

  minCPh2: number | null;
  minVPh2: number | null;
  minPimpPh2: number | null;
  minPexpPh2: number | null;
  minQimpPh2: number | null;
  minQexpPh2: number | null;
  minPfPh2: number | null;

  minCPh3: number | null;
  minVPh3: number | null;
  minPimpPh3: number | null;
  minPexpPh3: number | null;
  minQimpPh3: number | null;
  minQexpPh3: number | null;
  minPfPh3: number | null;

  minV12: number | null;
  minV23: number | null;
  minV31: number | null;

  /** De MimCn (sic) en el XML de origen */
  minCn: number | null;
  bc: string | null;
}

export interface G58LvsLine {
  lvslineId: string;
  pos: string;
  medidas: G58Medida[];
}

export interface G58Rtu {
  rtuId: string;
  lineas: G58LvsLine[];
}

export interface G58File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: G58Rtu[];
}
