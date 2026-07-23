/**
 * Parseo del nombre de fichero recibido en las carpetas Import/SABT.
 *
 * Formato observado: cncId_idPet_TIPO_idPet_fechaHora
 * Ejemplo:            SAG0169000679_0_S02_0_20260708060000
 *
 * Igual que en parseFh (core/fhParser.ts), fecha y hora se devuelven como
 * strings separados en vez de un objeto Date, para no arrastrar la zona
 * horaria del proceso Node al interpretarlos.
 */
export interface FileNameInfo {
  /** Identificador del concentrador (informativo, no determina la BD destino) */
  cncId: string;
  idPet1: string;
  /** Tipo de fichero: S02, S13, G01... */
  tipo: string;
  idPet2: string;
  /** Fecha de generación del fichero, en formato AAAA-MM-DD */
  fecha: string;
  /** Hora de generación del fichero, en formato HH:mm:ss */
  hora: string;
  rawFileName: string;
}

export function parseFileName(fileName: string): FileNameInfo {
  const parts = fileName.split('_');

  if (parts.length !== 5) {
    throw new Error(
      `Nombre de fichero con formato inesperado (se esperaban 5 segmentos separados por "_"): ${fileName}`
    );
  }

  const [cncId, idPet1, tipo, idPet2, fechaStr] = parts;

  if (!/^\d{14}$/.test(fechaStr)) {
    throw new Error(`Segmento de fecha inesperado en "${fileName}": ${fechaStr}`);
  }

  const fecha = `${fechaStr.slice(0, 4)}-${fechaStr.slice(4, 6)}-${fechaStr.slice(6, 8)}`;
  const hora = `${fechaStr.slice(8, 10)}:${fechaStr.slice(10, 12)}:${fechaStr.slice(12, 14)}`;

  return { cncId, idPet1, tipo, idPet2, fecha, hora, rawFileName: fileName };
}
