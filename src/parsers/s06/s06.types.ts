export interface S06Snapshot {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  ns: string | null;
  fab: string | null;
  mod: string | null;
  af: number | null;
  te: string | null;
  vf: string | null;
  vprime: string | null;
  pro: string | null;
  idm: string | null;
  mac: string | null;

  tp: string | null;
  ts: string | null;
  ip: string | null;
  is: string | null;

  usag: number | null;
  uswell: number | null;
  per: number | null;
  dctcp: number | null;
  vr: number | null;
  ut: number | null;
  usubt: number | null;
  usobt: number | null;
  ucortet: number | null;

  autMothBill: string | null;
  scrollDispMode: string | null;
  scrollDispTime: number | null;
}

export interface S06Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  snapshots: S06Snapshot[];
}

export interface S06Concentrador {
  cncId: string;
  contadores: S06Contador[];
}

export interface S06File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S06Concentrador[];
}
