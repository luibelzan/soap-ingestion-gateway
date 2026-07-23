export type S08Categoria = 'Sub' | 'Sob' | 'Corte';

export interface S08Bloque {
  categoria: S08Categoria;
  nTt: number | null;
  tTt: number | null;
  tTa: number | null;
  nTf1: number | null;
  tTf1: number | null;
  tTf1a: number | null;
  nTf2: number | null;
  tTf2: number | null;
  tTf2a: number | null;
  nTf3: number | null;
  tTf3: number | null;
  tTf3a: number | null;
}

export interface S08Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  bloques: S08Bloque[];
}

export interface S08Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: S08Lectura[];
}

export interface S08Concentrador {
  cncId: string;
  contadores: S08Contador[];
}

export interface S08File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S08Concentrador[];
}
