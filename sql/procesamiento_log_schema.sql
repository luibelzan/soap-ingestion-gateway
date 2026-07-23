-- =============================================================
-- Esquema para el log transversal de procesamiento
-- (una fila por cada fichero que pasa por el watcher, de cualquier tipo)
-- =============================================================
-- A diferencia del resto de tablas (una por tipo de fichero, para los
-- datos de negocio), esta es una ÚNICA tabla compartida por todos los
-- tipos, pensada exclusivamente para métricas e histórico: cuántos
-- ficheros se han procesado, con qué resultado, y cuándo.
--
-- Es un log de eventos (append-only): si un fichero se reprocesa,
-- genera una fila nueva, no reemplaza la anterior. Eso permite ver
-- también el historial de reintentos de un fichero concreto.
--
-- resultado puede ser:
--   - PROCESADO:   se insertaron datos correctamente
--   - VACIO:       se parseó bien pero no había ninguna lectura real
--                   (0 filas insertadas, ni principales ni de error)
--   - ERROR:       fallo al parsear/insertar (o nombre de fichero
--                   inesperado)
--   - DESCONOCIDO: la carpeta de tipo no corresponde a ningún tipo
--                  soportado todavía
-- =============================================================

CREATE SCHEMA IF NOT EXISTS :schema;

CREATE TABLE IF NOT EXISTS :schema.t_procesamiento_log (
    id                  BIGSERIAL PRIMARY KEY,
    nombre_fichero      VARCHAR(200) NOT NULL,
    tipo                VARCHAR(20) NOT NULL,
    resultado           VARCHAR(20) NOT NULL,   -- PROCESADO | VACIO | ERROR | DESCONOCIDO
    filas_principales   INTEGER,
    filas_error         INTEGER,
    mensaje             TEXT,
    fecha_procesado     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_t_procesamiento_log_fecha
    ON :schema.t_procesamiento_log(fecha_procesado);
CREATE INDEX IF NOT EXISTS idx_t_procesamiento_log_tipo
    ON :schema.t_procesamiento_log(tipo);
CREATE INDEX IF NOT EXISTS idx_t_procesamiento_log_resultado
    ON :schema.t_procesamiento_log(resultado);
CREATE INDEX IF NOT EXISTS idx_t_procesamiento_log_nombre_fichero
    ON :schema.t_procesamiento_log(nombre_fichero);
