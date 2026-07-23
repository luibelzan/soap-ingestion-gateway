export interface S02Lectura {
  fecha: string;   // AAAA-MM-DD
  hora: string;    // HH:mm:ss
  flagHorario: string | null; // asunción: V/I/S = indicador horario verano/invierno
  fhRaw: string;
  bc: string | null;
  ai: number;
  ae: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
}

export interface S02Contador {
  cntId: string;
  magnitud: number | null;
  errCat: number | null;
  errCode: number | null;
  lecturas: S02Lectura[];
}

export interface S02Concentrador {
  cncId: string;
  contadores: S02Contador[];
}

export interface S02File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S02Concentrador[];
}
