import { Pool } from 'pg';
import { validateSqlIdentifier } from './sqlIdentifier';

/**
 * Recalcula por completo el índice de lectura de S05 (1 lectura/día
 * esperada), para todos los contadores que tengan alguna lectura de
 * S05, en una única sentencia SQL (sin bucles en Node).
 *
 * Incluye el día de hoy en la ventana, así que hasta que no termine
 * el día, hoy aparecerá como "no leído" — se autocorrige al día
 * siguiente, no hace falta tratarlo aparte.
 */
export async function recalcularReadingIndexS05(
  pool: Pool,
  schema: string,
  diasHaciaAtras = 35
): Promise<number> {
  const safeSchema = validateSqlIdentifier(schema);

  const result = await pool.query(
    `INSERT INTO ${safeSchema}.t_reading_index_s05 (cnt_id, fecha, leido, actualizado_en)
     SELECT
         c.cnt_id,
         d::date AS fecha,
         (EXISTS (
             SELECT 1 FROM ${safeSchema}.t_s05 s
             WHERE s.cnt_id = c.cnt_id AND s.fecha = d::date
         ))::int AS leido,
         now()
     FROM (SELECT DISTINCT cnt_id FROM ${safeSchema}.t_s05) c
     CROSS JOIN generate_series(
         CURRENT_DATE - ($1 || ' days')::interval,
         CURRENT_DATE,
         interval '1 day'
     ) AS d
     ON CONFLICT (cnt_id, fecha) DO UPDATE
     SET leido = EXCLUDED.leido, actualizado_en = EXCLUDED.actualizado_en`,
    [diasHaciaAtras]
  );

  return result.rowCount ?? 0;
}

/**
 * Recalcula el índice de lectura de S04 (1 lectura/mes esperada, en
 * el día 1 de cada mes -> fecha_inicio de t_s04). Comprueba siempre
 * los últimos `mesesHaciaAtras` meses YA COMPLETADOS (nunca el mes en
 * curso), usando date_trunc, que gestiona el cambio de año de forma
 * nativa.
 */
export async function recalcularReadingIndexS04(
  pool: Pool,
  schema: string,
  mesesHaciaAtras = 2
): Promise<number> {
  const safeSchema = validateSqlIdentifier(schema);

  const result = await pool.query(
    `INSERT INTO ${safeSchema}.t_reading_index_s04 (cnt_id, fecha, leido, actualizado_en)
     SELECT
         c.cnt_id,
         d::date AS fecha,
         (EXISTS (
             SELECT 1 FROM ${safeSchema}.t_s04 s4
             WHERE s4.cnt_id = c.cnt_id AND s4.fecha_inicio = d::date
         ))::int AS leido,
         now()
     FROM (SELECT DISTINCT cnt_id FROM ${safeSchema}.t_s04) c
     CROSS JOIN generate_series(
         date_trunc('month', CURRENT_DATE) - ($1 || ' months')::interval,
         date_trunc('month', CURRENT_DATE) - interval '1 month',
         interval '1 month'
     ) AS d
     ON CONFLICT (cnt_id, fecha) DO UPDATE
     SET leido = EXCLUDED.leido, actualizado_en = EXCLUDED.actualizado_en`,
    [mesesHaciaAtras]
  );

  return result.rowCount ?? 0;
}

/**
 * Recalcula el índice de lectura de S02 (24 lecturas/día esperadas,
 * salvo 23/25 en los días de cambio de horario de verano/invierno).
 *
 * Las horas esperadas de cada día se calculan con aritmética de zona
 * horaria real de PostgreSQL (AT TIME ZONE), que resuelve el cambio
 * de horario correctamente para cualquier año, sin fechas fijas.
 *
 * No incluye el día de hoy (no puede estar completo todavía).
 */
export async function recalcularReadingIndexS02(
  pool: Pool,
  schema: string,
  diasHaciaAtras = 2,
  zonaHoraria = 'Europe/Madrid'
): Promise<number> {
  const safeSchema = validateSqlIdentifier(schema);

  const result = await pool.query(
    `INSERT INTO ${safeSchema}.t_reading_index_s02
       (cnt_id, fecha, leido, horas_esperadas, horas_leidas, actualizado_en)
     SELECT
         c.cnt_id,
         he.fecha,
         (COUNT(s.hora) >= he.horas_esperadas)::int AS leido,
         he.horas_esperadas,
         COUNT(s.hora)::int AS horas_leidas,
         now()
     FROM (SELECT DISTINCT cnt_id FROM ${safeSchema}.t_s02) c
     CROSS JOIN (
         SELECT
             d::date AS fecha,
             ROUND(EXTRACT(EPOCH FROM (
                 ((d + 1)::timestamp AT TIME ZONE $2) - (d::timestamp AT TIME ZONE $2)
             )) / 3600)::smallint AS horas_esperadas
         FROM generate_series(
             CURRENT_DATE - ($1 || ' days')::interval,
             CURRENT_DATE - interval '1 day',
             interval '1 day'
         ) AS d
     ) he
     LEFT JOIN ${safeSchema}.t_s02 s
         ON s.cnt_id = c.cnt_id AND s.fecha = he.fecha
     GROUP BY c.cnt_id, he.fecha, he.horas_esperadas
     ON CONFLICT (cnt_id, fecha) DO UPDATE
     SET leido = EXCLUDED.leido,
         horas_esperadas = EXCLUDED.horas_esperadas,
         horas_leidas = EXCLUDED.horas_leidas,
         actualizado_en = EXCLUDED.actualizado_en`,
    [diasHaciaAtras, zonaHoraria]
  );

  return result.rowCount ?? 0;
}

export interface ResumenRecalculoReadingIndex {
  s02: number;
  s04: number;
  s05: number;
}

export interface OpcionesRecalculoReadingIndex {
  diasS02?: number;
  mesesS04?: number;
  diasS05?: number;
  zonaHoraria?: string;
}

/**
 * Recalcula los tres índices de lectura de una distribuidora de una
 * vez. Cada uno es una única sentencia SQL set-based (sin bucles ni
 * consultas por fila desde Node), pensada para tablas de millones de
 * registros.
 */
export async function recalcularReadingIndex(
  pool: Pool,
  schema: string,
  opciones?: OpcionesRecalculoReadingIndex
): Promise<ResumenRecalculoReadingIndex> {
  const s02 = await recalcularReadingIndexS02(pool, schema, opciones?.diasS02, opciones?.zonaHoraria);
  const s04 = await recalcularReadingIndexS04(pool, schema, opciones?.mesesS04);
  const s05 = await recalcularReadingIndexS05(pool, schema, opciones?.diasS05);

  return { s02, s04, s05 };
}