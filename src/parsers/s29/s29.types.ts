export interface S29Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  l1v: number | null;
  l1i: number | null;
  l2v: number | null;
  l2i: number | null;
  l3v: number | null;
  l3i: number | null;

  isum: number | null;
  inNeutro: number | null;
  idDif: number | null;

  psigned: number | null;
  l1p: number | null;
  l2p: number | null;
  l3p: number | null;

  qsigned: number | null;
  l1q: number | null;
  l2q: number | null;
  l3q: number | null;

  pf: number | null;
  l1pf: number | null;
  l2pf: number | null;
  l3pf: number | null;

  phaseSeq: string | null;

  l1vAng: number | null;
  l2vAng: number | null;
  l3vAng: number | null;
  l1iAng: number | null;
  l2iAng: number | null;
  l3iAng: number | null;
  inAng: number | null;
  idAng: number | null;
}

export interface S29Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: S29Lectura[];
}

export interface S29Concentrador {
  cncId: string;
  contadores: S29Contador[];
}

export interface S29File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S29Concentrador[];
}
