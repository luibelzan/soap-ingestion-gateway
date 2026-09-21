/**
 * Valida que un nombre de esquema (o tabla) sea un identificador SQL
 * "seguro" antes de interpolarlo directamente en una query. Aunque el
 * nombre del esquema suele venir de configuración interna (no de un
 * fichero externo), se valida igualmente para evitar interpolar SQL
 * arbitrario por error de configuración.
 */
export function validateSqlIdentifier(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Nombre de esquema/tabla no válido: "${name}"`);
  }
  return name;
}