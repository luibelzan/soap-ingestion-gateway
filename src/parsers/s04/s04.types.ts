export interface S04Periodo {
  ctr: number | null;
  pt: number;

  fechaInicio: string; // AAAA-MM-DD, de Fhi
  horaInicio: string;  // HH:mm:ss, de Fhi
  flagHorarioInicio: string | null;
  fhiRaw: string;

  fechaFin: string; // AAAA-MM-DD, de Fhf
  horaFin: string;  // HH:mm:ss, de Fhf
  flagHorarioFin: string | null;
  fhfRaw: string;

  mx: number | null;
  fechaMax: string | null; // AAAA-MM-DD, de Fx
  horaMax: string | null;  // HH:mm:ss, de Fx
  flagHorarioMax: string | null;
  fxRaw: string | null;

  // Bloque Value con sufijo "a"
  aiA: number;
  aeA: number;
  r1A: number;
  r2A: number;
  r3A: number;
  r4A: number;

  // Bloque Value con sufijo "i"
  aiI: number;
  aeI: number;
  r1I: number;
  r2I: number;
  r3I: number;
  r4I: number;
}

export interface S04Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  periodos: S04Periodo[];
}

export interface S04Concentrador {
  cncId: string;
  contadores: S04Contador[];
}

export interface S04File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S04Concentrador[];
}
