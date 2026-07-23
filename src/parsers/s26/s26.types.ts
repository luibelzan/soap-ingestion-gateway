/** Nombre de columna -> es de texto (true) o numérico (false, por defecto) */
export const S26_COLUMNAS: Record<string, 'numeric' | 'text'> = {
  l1v: 'numeric',
  l1i: 'numeric',
  l2v: 'numeric',
  l2i: 'numeric',
  l3v: 'numeric',
  l3i: 'numeric',
  i3: 'numeric',
  pimp: 'numeric',
  pexp: 'numeric',
  qimp: 'numeric',
  qexp: 'numeric',
  pf: 'numeric',
  ca: 'numeric',
  pp: 'text', // único campo de texto
  fc: 'numeric',
  eacti: 'numeric',
  eanti: 'numeric',
  aia: 'numeric',
  aea: 'numeric',
  r1a: 'numeric',
  r2a: 'numeric',
  r3a: 'numeric',
  r4a: 'numeric',
};

export type S26Campos = Partial<Record<keyof typeof S26_COLUMNAS, number | string | null>>;

export interface S26Lectura {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  campos: S26Campos;
  /** DataId presentes en el fichero que no coinciden con ninguna columna conocida */
  camposDesconocidos: string[];
}

export interface S26Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  lecturas: S26Lectura[];
}

export interface S26Concentrador {
  cncId: string;
  contadores: S26Contador[];
}

export interface S26File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S26Concentrador[];
}
