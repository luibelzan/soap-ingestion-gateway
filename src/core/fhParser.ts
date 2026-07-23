/**
 * Parsea el formato de fecha-hora usado en los atributos Fh, Fhi, Fhf, Fx...
 * de varios tipos de fichero (S02, S04...):
 *   AAAAMMDDHHmmss + 3 dígitos + 1 letra
 * Ejemplo: 20260703050000000S
 *
 * Devuelve fecha y hora como strings SEPARADOS (no un objeto Date), para
 * poder insertarlos en columnas DATE y TIME independientes y evitar que
 * un objeto Date de JavaScript arrastre la zona horaria del proceso Node
 * al construirlo/serializarlo.
 *
 * ASUNCIÓN (pendiente de confirmar con el cliente/documentación):
 * los 3 dígitos intermedios se descartan (siempre "000" en los ejemplos
 * vistos), y la letra final se interpreta como flag de horario
 * verano/invierno (V/I/S...).
 */
export interface FhParsed {
  /** Formato AAAA-MM-DD, lista para insertar en una columna DATE */
  fecha: string;
  /** Formato HH:mm:ss, lista para insertar en una columna TIME */
  hora: string;
  /**
   * Milisegundos (3 dígitos) del bloque intermedio de Fh. Se asumía
   * que este bloque era siempre "000" (relleno), pero en S17 se ha
   * observado que puede tener valores reales (p.ej. "777"), así que
   * se expone por si algún tipo de fichero necesita esa precisión.
   */
  ms: string;
  flagHorario: string | null;
}

export function parseFh(fh: string): FhParsed {
  const match = fh.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{3})([A-Za-z]?)$/);

  if (!match) {
    throw new Error(`Formato de fecha-hora no reconocido: "${fh}"`);
  }

  const [, yyyy, mm, dd, hh, mi, ss, ms, flag] = match;

  return {
    fecha: `${yyyy}-${mm}-${dd}`,
    hora: `${hh}:${mi}:${ss}`,
    ms,
    flagHorario: flag || null,
  };
}

/**
 * Igual que parseFh, pero devuelve null en vez de lanzar excepción si el
 * string no encaja con el formato esperado. Útil para campos cuyo contenido
 * puede ser una fecha-hora O puede no serlo (p. ej. D1 en S09).
 */
export function tryParseFh(value: string): FhParsed | null {
  try {
    return parseFh(value);
  } catch {
    return null;
  }
}
