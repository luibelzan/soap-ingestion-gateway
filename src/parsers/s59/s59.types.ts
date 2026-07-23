export interface S59Evento {
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

export interface S59LvsLine {
  lvslineId: string;
  pos: string;
  eventos: S59Evento[];
}

export interface S59Rtu {
  rtuId: string;
  lineas: S59LvsLine[];
}

export interface S59File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S59Rtu[];
}
