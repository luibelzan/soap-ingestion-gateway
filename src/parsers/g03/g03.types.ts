export interface G03Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;
  bc: string | null;

  avVph1Lv: number | null;
  avVph2Lv: number | null;
  avVph3Lv: number | null;
  avIph1Lv: number | null;
  avIph2Lv: number | null;
  avIph3Lv: number | null;

  avPplusTriph: number | null;
  avPminusTriph: number | null;
  avQplusTriph: number | null;
  avQminusTriph: number | null;

  avVph1Mv: number | null;
  avVph2Mv: number | null;
  avVph3Mv: number | null;

  avIneutral: number | null;

  avV0Comp: number | null; // de "AvVo_comp"
  avV1Comp: number | null;
  avV2Comp: number | null;

  avVhs: number | null;
}

export interface G03Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: G03Lectura[];
}

export interface G03Concentrador {
  cncId: string;
  contadores: G03Contador[];
}

export interface G03File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: G03Concentrador[];
}