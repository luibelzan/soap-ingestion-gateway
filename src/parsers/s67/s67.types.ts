export interface S67Evento {
  fecha: string; // AAAA-MM-DD, de Fh
  hora: string;  // HH:mm:ss, de Fh
  ms: string;    // milisegundos reales de Fh
  flagHorario: string | null;
  fhRaw: string;

  et: number;
  c: number;

  d1Raw: string | null; // NULL si <D1></D1> viene vacío
  d2Raw: string | null;
}

export interface S67Rtu {
  rtuId: string;
  eventos: S67Evento[];
}

export interface S67File {
  idRpt: string;
  idPet: string;
  version: string;
  rtus: S67Rtu[];
}
