export interface G05Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  minVph1Lv: number | null;
  minVph2Lv: number | null;
  minVph3Lv: number | null;
  minIph1Lv: number | null;
  minIph2Lv: number | null;
  minIph3Lv: number | null;

  minPplusTriph: number | null;
  minPminusTriph: number | null;
  minQplusTriph: number | null;
  minQminusTriph: number | null;

  minVph1Mv: number | null;
  minVph2Mv: number | null;
  minVph3Mv: number | null;

  minIneutral: number | null;

  minV0Comp: number | null; // de "MinVo_comp"
  minV1Comp: number | null;
  minV2Comp: number | null;

  minVhs: number | null;
}

export interface G05Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: G05Lectura[];
}

export interface G05Concentrador {
  cncId: string;
  contadores: G05Contador[];
}

export interface G05File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: G05Concentrador[];
}