export interface G01Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  amed: number;
  amax: number;
  tot: number;
  aperc: number;
}

export interface G01Concentrador {
  cncId: string;
  lecturas: G01Lectura[];
}

export interface G01File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: G01Concentrador[];
}
