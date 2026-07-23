export interface S17Evento {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  ms: string;    // milisegundos reales de Fh (ver nota en el esquema SQL)
  flagHorario: string | null;
  fhRaw: string;

  et: number;
  c: number;

  d1Raw: string | null; // NO es fecha en S17, a diferencia de S09
  d2Raw: string | null;
}

export interface S17Concentrador {
  cncId: string;
  eventos: S17Evento[];
}

export interface S17File {
  idRpt: string;
  idPet: string;
  version: string;
  concentradores: S17Concentrador[];
}
