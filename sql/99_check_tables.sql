-- Uso: psql -h <host> -U <usuario> -d <bd> -v schema=<esquema> -f sql/99_check_tables.sql
-- Lista todas las tablas del esquema indicado, para confirmar cuántas
-- de las 35 (aprox.) tablas de tipos + sus tablas *_error se han creado.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = :'schema'
ORDER BY table_name;
