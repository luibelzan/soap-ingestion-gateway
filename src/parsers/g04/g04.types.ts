export interface G04Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  maxVph1Lv: number | null;
  maxVph2Lv: number | null;
  maxVph3Lv: number | null;
  maxIph1Lv: number | null;
  maxIph2Lv: number | null;
  maxIph3Lv: number | null;

  maxPplusTriph: number | null;
  maxPminusTriph: number | null;
  maxQplusTriph: number | null;
  maxQminusTriph: number | null;

  maxVph1Mv: number | null;
  maxVph2Mv: number | null;
  maxVph3Mv: number | null;

  maxIneutral: number | null;

  maxV0Comp: number | null; // de "MaxVo_comp"
  maxV1Comp: number | null;
  maxV2Comp: number | null;

  maxVhs: number | null;
}

export interface G04Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: G04Lectura[];
}

export interface G04Concentrador {
  cncId: string;
  contadores: G04Contador[];
}

export interface G04File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: G04Concentrador[];
}