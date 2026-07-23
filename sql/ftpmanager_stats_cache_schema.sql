-- =============================================================
-- Tabla maestra de procesamiento para el front de ftpmanager
-- =============================================================
-- IMPORTANTE: esta tabla se crea en una base de datos SEPARADA (en el
-- mismo servidor PostgreSQL que las distribuidoras, pero no en la de
-- ninguna distribuidora concreta) — por ejemplo, la propia BD de
-- ftpmanager. Ejecutar contra esa BD.
--
-- Es un ESPEJO de t_procesamiento_log (misma estructura de columnas),
-- con una columna añadida "distribuidora" para poder distinguir de
-- dónde viene cada fila. gd-import-service inserta aquí una fila cada
-- vez que inserta una en t_procesamiento_log de la distribuidora
-- correspondiente (ver core/masterLog.ts) — es un log de eventos
-- (append-only), no una tabla agregada: una fila por fichero
-- procesado, con su resultado (PROCESADO/VACIO/ERROR/DESCONOCIDO).
--
-- Así, todas las distribuidoras quedan consolidadas en una única tabla
-- consultable desde el front de ftpmanager con un simple SELECT,
-- filtrando por "distribuidora" si hace falta.
-- =============================================================

CREATE TABLE IF NOT EXISTS stats_resumen_cache (
    id                  SERIAL PRIMARY KEY,
    distribuidora       VARCHAR(100) NOT NULL,
    nombre_fichero      VARCHAR(200) NOT NULL,
    tipo                VARCHAR(20) NOT NULL,
    resultado           VARCHAR(20) NOT NULL,   -- PROCESADO | VACIO | ERROR | DESCONOCIDO
    filas_principales   INTEGER,
    filas_error         INTEGER,
    mensaje             TEXT,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stats_resumen_cache_distribuidora
    ON stats_resumen_cache(distribuidora);
CREATE INDEX IF NOT EXISTS idx_stats_resumen_cache_fecha
    ON stats_resumen_cache(fecha_procesado);
CREATE INDEX IF NOT EXISTS idx_stats_resumen_cache_tipo
    ON stats_resumen_cache(tipo);
CREATE INDEX IF NOT EXISTS idx_stats_resumen_cache_resultado
    ON stats_resumen_cache(resultado);
