export interface S09Evento {
  fecha: string;   // AAAA-MM-DD, de Fh
  hora: string;    // HH:mm:ss, de Fh
  flagHorario: string | null;
  fhRaw: string;

  et: number;
  c: number;

  d1Raw: string | null;
  fechaD1: string | null;  // AAAA-MM-DD, solo si D1 encajaba como fecha-hora
  horaD1: string | null;   // HH:mm:ss, solo si D1 encajaba como fecha-hora
  flagHorarioD1: string | null;

  d2Raw: string | null;
}

export interface S09Contador {
  cntId: string;
  errCat: number | null;
  errCode: number | null;
  eventos: S09Evento[];
}

export interface S09Concentrador {
  cncId: string;
  contadores: S09Contador[];
}

export interface S09File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S09Concentrador[];
}
