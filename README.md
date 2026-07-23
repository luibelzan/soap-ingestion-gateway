# gd-import-service

Servicio de importación de ficheros SABT (S02, S13, G01...) desde las carpetas
`C:\GD\Distribuidoras\<Distribuidora>\Import\<TIPO>` (una subcarpeta por tipo
de fichero) a la base de datos PostgreSQL correspondiente a cada distribuidora.

## Estado actual

Implementado y funcional a nivel de código:
- **Watcher real** (`watcher.ts`): vigila la carpeta de importación de cada
  distribuidora, detecta el tipo de fichero por el nombre de la subcarpeta
  que lo contiene, y procesa cada fichero nuevo automáticamente.
- **Procesador de ficheros** (`core/fileProcessor.ts`): parsea, inserta en
  BD, y mueve el fichero a `Procesado`/`Error`/`Desconocidos` (subcarpetas
  dentro de la propia carpeta de tipo) según el resultado.
- Parseo del nombre de fichero (`fileNameParser.ts`) — usado para extraer
  `cncId`/fecha/hora informativos, ya no para determinar el tipo.
- Interfaces genéricas de parser/repository (`core/types.ts`) para poder añadir
  nuevos tipos de fichero sin tocar el resto de la infraestructura.
- Gestor de conexiones PostgreSQL multi-tenant, una por distribuidora
  (`db/connectionManager.ts`), resuelta por la carpeta de origen (NO por el
  `cncId` del fichero).
- **Tipo S02 completo**: esquema SQL (`t_s02` + `t_s02_error`, sin tabla de
  cabecera de fichero ni tabla intermedia de contador), tipos TypeScript,
  parser XML y repository con dos bulk-inserts totales por fichero
  (uno para lecturas, otro para contadores en error) y deduplicación
  atómica vía `UNIQUE` + `ON CONFLICT DO NOTHING`.
- **Tipo S04 completo**: mismo patrón (`t_s04` + `t_s04_error`). Cubre
  cierres por periodo tarifario con máximetro (`Mx`/`Fx`) y los dos
  bloques `Value` (sufijos "a" / "i") que trae cada `S04`.
- **Tipo S09 completo**: mismo patrón (`t_s09` + `t_s09_error`). Cubre el
  log de eventos del contador (`Et`/`C` + hijos opcionales `D1`/`D2` de
  contenido variable — código simple o fecha-hora).
- **Tipo S05 completo**: mismo patrón (`t_s05` + `t_s05_error`). Similar
  a S04 pero más simple: un único instante `Fh` (sin ventana Fhi/Fhf ni
  máximetro) y un único bloque `Value` (solo sufijo "a", sin el "i").
- **Tipo G01 completo**: primer tipo sin nivel `Cnt` — los datos son
  directamente por concentrador (`t_g01`, sin tabla de error asociada).
  Parece una estadística de cobertura/disponibilidad de lectura por hora.
- **Tipo G02 completo**: mismo patrón (`t_g02` + `t_g02_error`). A
  diferencia de G01, sí tiene nivel `Cnt`. Parece una estadística de
  disponibilidad/conectividad por contador (`Atime`/`Nchanges`/`Aconc`/
  `Atimeperc`).
- **Tipo G56 completo**: jerarquía distinta (`Report > Rtu > LVSLine >
  G56*`, sin `Cnc`/`Cnt`). Calidad de suministro en baja tensión: valores
  promediados por fase (corriente, tensión, potencia activa/reactiva
  import/export, factor de potencia), tensiones de línea, corriente de
  neutro y temperatura. Sin tabla de error (no se ha observado ese caso).
- **Tipo G57 completo**: estructuralmente idéntico a G56 pero con
  **máximos** del periodo (`Max*`) en vez de promedios, y sin el campo
  `Temp`.
- **Tipo G58 completo**: igual que G57 pero con **mínimos** (`Min*`).
  ⚠️ **Particularidad**: el atributo de corriente de neutro en el XML de
  origen es `MimCn` (con "m"), no `MinCn` como el resto — parece una
  errata del propio proveedor de los ficheros, pero es consistente en
  todos los ejemplos. El parser lee literalmente `MimCn`; si algún
  fichero futuro sí trajera `MinCn` correctamente escrito, no se
  detectaría con el código actual (avisa si ves esto en producción).
- **Tipo G59 completo**: cuarto de la familia G56/G57/G58, con valores
  **instantáneos** (`Mom*`), sin `Temp` (igual que G57/G58).
- **Tipo S52 completo**: combina el patrón de S02 (`AI`/`AE`/`R1`-`R4`)
  con la jerarquía `Rtu > LVSLine` de G56-G59 — energía por línea de
  baja tensión en vez de por contador individual.
- **Tipo S53 completo**: igual que S52 pero con cada magnitud
  desglosada por fase (`AI1/AI2/AI3`, `AE1/AE2/AE3`, `R11-R43`), 18
  valores en total por lectura.
- **Tipo S59 completo**: log de eventos a nivel de línea de baja
  tensión (`t_s59`, mismo patrón que S09 con `D1`/`D2` opcionales).
  Aquí se ha confirmado que la letra final de `Fh`/`D1` no es siempre
  `"S"` — apareció `"W"` en una fecha "época" (`19700101010241000W`).
  El parser ya soportaba cualquier letra, así que no ha hecho falta
  ningún cambio, solo queda documentado por si ayuda a interpretar el
  significado de esa letra más adelante.
- **Tipo S64 completo**: combina los campos de S14 (`V1-3`, `I1-3`,
  `In`, `Simp`, `Sexp`) con la jerarquía `Rtu > LVSLine`.
- **Tipo S98 completo**: misma jerarquía simple que S93/S94/S97.
  `Ift1/2/3` (valores pequeños ~0.06 por fase, significado sin
  confirmar; el prefijo "If" podría sugerir algo relacionado con
  corriente de fuga o desequilibrio, pero es una conjetura).
- **Tipo S95 completo**: misma jerarquía simple. `Vu` (valor pequeño,
  posible desequilibrio de tensión) y `Pi` (flag de texto, siempre "Y"
  en el ejemplo, significado sin confirmar).
- **Tipo G53 completo**: misma jerarquía simple. `VTNMin`/`VTNAvg`/
  `VTNMax` (posible tensión neutro-tierra, min/promedio/máx) y
  `VTNLSM` sin identificar (siempre 0.0 en el ejemplo).
- **Tipo S67 completo**: mismo patrón que S17 (log de eventos con
  milisegundos reales), pero a nivel de `Rtu` en vez de `Cnc`, y con
  `D1`/`D2` en formato de lista separada por `;` (sin descomponer).
  Maneja explícitamente el caso `<D1></D1>` vacío como `NULL`.
- **Tipo S62 completo**: equivalente a S12 pero para el **RTU** (~90
  atributos de configuración + tareas programadas anidadas en
  `t_s62_tarea`). Igual que en S12, el campo `filasError` del
  resultado se reutiliza para reportar las tareas insertadas.
- **Tipo S45 completo** (no estaba en la lista original de tipos, pero
  se ha añadido igual): mismo patrón estándar que S02 (`t_s45` +
  `t_s45_error`). Máx/promedio/mín de corriente por fase y neutro. El
  `Report` de este tipo trae un atributo `xmlns`, que se ignora al
  parsear.
- **Tipo S44 completo** (tampoco estaba en la lista original): igual
  que S45 pero con tensión por fase en vez de corriente. Aquí las
  fases 2 y 3 vienen vacías (`""`) en contadores monofásicos — se
  guardan como `NULL` igual que cualquier valor numérico vacío.
- **Tipo S24B completo** (tampoco estaba en la lista original): versión
  más rica de S24 — además del estado de comunicación, trae versión de
  firmware, MAC, tiempo de respuesta medio, cambios de estado y tiempo
  activo (%). `LastCommunication`/`DateTF` pueden venir vacíos
  (contador que nunca ha comunicado) y se guardan como `NULL`.
- **Tipo S29 completo** (tampoco estaba en la lista original): medida
  eléctrica muy completa por fase (tensión, corriente, potencia activa/
  reactiva, factor de potencia, ángulos) más corriente diferencial.
  A diferencia de casi todos los tipos anteriores, **no trae `Bc`**.
- **Tipo S07 completo** (tampoco estaba en la lista original): pocos
  campos (`Dc`, `Nc`, `Df`, significado sin confirmar) más una segunda
  fecha-hora `Hc` en el mismo formato que `Fh`.
- **Tipo S08 completo** (tampoco estaba en la lista original): tres
  bloques repetidos (`Sub`/`Sob`/`Corte`, posiblemente subtensión/
  sobretensión/corte), cada uno con el mismo conjunto de 12 campos
  (número de eventos y tiempos, total y por fase). Igual que en S96,
  se usa **tabla "larga"/tidy** (`t_s08`, una fila por categoría) en
  vez de 36 columnas en una fila ancha.
- **Tipo S26 completo — estructura especial**: en vez de atributos
  fijos, trae una lista de pares `<DataId>`/`<DataValue>` alternados
  (formato clave-valor genérico; coincide con el atributo `S26Content`
  de S12/S62, que configura qué campos manda). El parser "pivota" esos
  pares a columnas de una **tabla ancha** (`t_s26`, con una columna fija
  por cada campo posible conocido — `l1v`, `pimp`, `aia`...), a
  diferencia del enfoque "tidy" usado en S96/S08. Aparte del pivote,
  sigue el mismo patrón estándar que el resto de tipos con jerarquía
  `Cnc > Cnt` (`nombre_fichero`, `flag_horario`, `fh_raw`,
  `t_s26_error`, deduplicación vía `UNIQUE` + `ON CONFLICT DO NOTHING`).
  Si llega un `DataId` que no coincide con ninguna columna conocida, se
  descarta con un aviso por consola en vez de fallar todo el fichero.
- **Tipo S93 completo**: jerarquía más simple (`Report > Rtu > S93*`,
  sin `LVSLine`). Solo tensiones por fase (`Vr`/`Vs`/`Vt`, nomenclatura
  R/S/T) y bandera de calidad.
- **Tipo S94 completo**: misma jerarquía simple que S93. Trae un
  atributo `Tp` adicional (significado sin confirmar) y `Fr`/`Fs`/`Ft`
  (valores pequeños, ~0.15-0.17 — posible índice de flicker/parpadeo
  por fase, sin confirmar).
- **Tipo S96 completo**: armónicos por fase (`Hr`/`Hs`/`Ht`, 25
  componentes cada uno + THD). Único tipo hasta ahora con **tabla
  "larga"/tidy** (`t_s96`, una fila por armónico) en vez de una fila
  por instante, para no tener una tabla con 75+ columnas.
- **Tipo S97 completo**: misma jerarquía simple que S93/S94.
  `Nr`/`Ns`/`Nt` (enteros, siempre 0 en el ejemplo — posible conteo de
  eventos/interrupciones por fase, sin poder confirmarlo con estos
  datos ya que nunca cambian de 0).
- **Tipo S06 completo**: vuelve a la jerarquía `Cnc > Cnt`, pero es de
  naturaleza distinta — un snapshot de configuración/inventario del
  contador (fabricante, modelo, firmware, MAC, umbrales de tensión...),
  no una serie de medidas. Varios campos de texto se recortan de
  espacios en blanco (parecen relleno de formato de ancho fijo).
- **Tipo S12 completo**: el más complejo hasta ahora. Snapshot de
  configuración del **concentrador** (~50 atributos: red, FTP, NTP,
  timeouts...) en `t_s12`, más una lista anidada de tareas programadas
  (`TP > TpPro`) en `t_s12_tarea` — qué tipos de informe genera el
  concentrador y con qué periodicidad. `TpPer` no tiene el formato de
  `Fh` (le falta la letra final), así que se guarda como texto crudo sin
  interpretar. `TpAttr` viene siempre vacío, no se modela. Sin nivel
  `Cnt`, así que no hay tabla de error.
- **Tipo S14 completo**: mismo patrón estándar que S02 (`t_s14` +
  `t_s14_error`). Tensión/corriente por fase, corriente de neutro y
  potencia aparente import/export.
- **Tipo S17 completo**: log de eventos a nivel de concentrador (similar
  a S09 pero sin `Cnt`). ⚠️ **Descubrimiento importante**: aquí se ha
  visto que el bloque de milisegundos de `Fh` (que en todos los tipos
  anteriores siempre había salido `"000"`) puede traer valores reales
  (`"777"`, `"207"`...). Se ha ampliado `parseFh` (compartido por todos
  los tipos) para exponer también `ms`, y en S17 se usa y se incluye en
  la deduplicación. **Los tipos ya implementados antes de S17 siguen
  descartando ese dato** — si te importa la precisión de milisegundos
  en S02/S04/S05/S06/S09/S12/S14, avisa y lo revisamos añadiendo la
  columna `ms` donde corresponda.
- **Tipo S24 completo**: snapshot de estado de comunicación por
  contador (`t_s24`, aplanando `Cnc > S24 > Meter` en una fila por
  contador). Cada `Meter` trae su propio `Date` con milisegundos reales
  (mismo tratamiento que en S17).
- **Utilidad compartida `parseFh`** (`core/fhParser.ts`): usada por S02 y
  S04 para parsear el formato de fecha-hora común (`AAAAMMDDHHmmss` + 3
  dígitos + 1 letra). Los siguientes tipos deberían reutilizarla también.

Pendiente (siguiente iteración): watcher de carpetas (chokidar), orquestador
que una todo el flujo, y el resto de tipos de fichero (S13, S15, G01...).

## Estructura de carpetas

Cada distribuidora tiene una única carpeta de importación, con una
subcarpeta por cada tipo de fichero (S44, S45, S62...). El nombre de la
subcarpeta es lo que determina el tipo — **no** el nombre del fichero
(aunque el nombre de fichero se sigue parseando para extraer `cncId`,
fecha y hora informativos, y se avisa si no coincide con la carpeta):

```
C:\GD\Distribuidoras\Demo\Import\
    S44\
        SAG..._S44_..._20260710060000
        Procesado\   (se crea sola)
        Vacios\      (se crea sola)
        Error\       (se crea sola)
        Desconocidos\
    S45\
        ...
    S62\
        ...
```

Las subcarpetas `Procesado`, `Vacios`, `Error` y `Desconocidos` se crean
automáticamente dentro de cada carpeta de tipo la primera vez que hacen
falta. El watcher vigila con `depth: 1`, así que nunca vuelve a mirar
dentro de esas subcarpetas de control (evita bucles de reprocesado).

`Vacios` es para ficheros que se parsean e insertan sin errores, pero
no contienen ninguna lectura real (0 filas). No es un fallo, pero
conviene poder distinguirlos de los procesados con datos.

## Logging

El watcher escribe el log en dos sitios a la vez:
- **Consola**: formato legible y coloreado (`pino-pretty`), útil mientras lo tienes abierto en primer plano.
- **Fichero** (`logs/watcher.log`, junto a la raíz del proyecto): una línea JSON por evento, para poder revisar qué pasó después de cerrar la terminal, o buscar/filtrar con herramientas como `grep`/`jq`.

El fichero de log **no rota automáticamente** — si el servicio corre mucho tiempo sin reiniciarse, puede crecer bastante. Si te preocupa, hay dos opciones sencillas más adelante: añadir rotación a nivel de aplicación (paquete `pino-roll`) o configurar `logrotate` (Linux) / Programador de tareas (Windows) a nivel de sistema operativo para rotar `logs/watcher.log` periódicamente.

## Estadísticas para ftpmanager

`gd-import-service` no expone ninguna API HTTP propia. En su lugar,
por cada fichero procesado, escribe el resultado en dos sitios:

- **`t_procesamiento_log`** (una tabla por cada BD de distribuidora):
  el registro "local" de esa distribuidora.
- **`stats_resumen_cache`** (una única tabla, en una base de datos
  separada — p.ej. la de `ftpmanager` — en el mismo servidor
  PostgreSQL): un **espejo 1:1** de lo mismo, con una columna
  `distribuidora` añadida. Es lo que consulta el front de `ftpmanager`,
  sin tener que conectarse a la BD de cada distribuidora por separado.

No hay agregación, ni cálculo de ventanas de tiempo, ni ningún job
periódico: cada fichero procesado genera exactamente una fila nueva en
cada una de las dos tablas, al instante. Si `ftpmanager` necesita un
resumen (últimas 24h, por tipo, etc.), lo calcula él mismo con un
`SELECT`/`GROUP BY` sobre `stats_resumen_cache` — es una tabla normal,
consultable como cualquier otra.

**Nota sobre S12/S62**: en estos dos tipos, el campo `filas_error` del
resultado de inserción se reutiliza para reportar las tareas programadas
insertadas (no hay concepto real de "error" en ellos, al no tener nivel
`Cnt`). Esto no afecta a la detección de "vacío" en la práctica: si el
fichero trae al menos un snapshot de configuración, `filasPrincipales`
será mayor que 0 y no se marca como vacío.

### Tabla maestra `stats_resumen_cache`

**Configura la conexión** en `src/config/ftpmanagerDb.json`:
```json
{
  "connectionString": "postgres://usuario:password@localhost:5432/ftpmanager",
  "schema": "public"
}
```

**Crea la tabla** (en esa BD separada, no en las de las
distribuidoras):
```bash
psql -h localhost -U usuario -d ftpmanager -f sql/ftpmanager_stats_cache_schema.sql
```

**Estructura** (mismas columnas que `t_procesamiento_log`, más
`distribuidora`):
```sql
CREATE TABLE stats_resumen_cache (
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
```

**Ejemplo de consulta desde ftpmanager** (resumen de las últimas 24h,
de todas las distribuidoras a la vez):
```sql
SELECT distribuidora, resultado, COUNT(*) AS n
FROM stats_resumen_cache
WHERE fecha_procesado > now() - interval '24 hours'
GROUP BY distribuidora, resultado
ORDER BY distribuidora, resultado;
```

## Cómo probarlo



Este entorno de desarrollo no tiene acceso a red, así que **no se ha
podido ejecutar `npm install` ni probar el parser/watcher contra las
librerías reales** (`fast-xml-parser`, `chokidar`...). La lógica de
negocio (parseo de fechas `Fh`, detección de tipo por carpeta,
movimiento de ficheros) sí se ha validado manualmente con Node puro,
sin esas dependencias.

En tu entorno, con acceso a npm:

```bash
npm install
```

**1. Configura `config/distribuidoras.json`** con tus distribuidoras
reales (nombre, `carpetaImport`, connection string, esquema).

**2. Crea las subcarpetas de tipo automáticamente** (evita crear ~35
carpetas a mano):
```bash
npm run setup:folders -- Demo
```
(sustituye `Demo` por el nombre exacto de la distribuidora en tu
`distribuidoras.json`). Esto crea `Import\S02\`, `Import\S04\`, etc.

**3. Carga TODOS los esquemas SQL de golpe**, indicando el esquema de
destino:
```bash
psql -h localhost -U usuario -d Demo -v schema=core -f sql/00_load_all.sql
```
Si prefieres cargar solo algunos tipos, puedes seguir ejecutando los
`.sql` individuales (`sql/s44_schema.sql`, etc.) igual que antes.

**4. Verifica cuántas tablas se crearon** (deberían ser ~2 por tipo:
`t_XXX` + `t_XXX_error` donde aplique):
```bash
psql -h localhost -U usuario -d Demo -v schema=core -f sql/99_check_tables.sql
```

**5. Arranca el watcher real** (vigila todas las distribuidoras de
`config/distribuidoras.json` de forma continua):
```bash
npm run watch
```
Deja un fichero en, por ejemplo, `Import\S44\` y en unos segundos
debería aparecer procesado y movido a `Import\S44\Procesado\`.

**6. Alternativa: procesar un solo fichero a mano** (usa exactamente la
misma lógica que el watcher — detecta tipo por carpeta, inserta, y
**mueve el fichero** a `Procesado`/`Error`/`Desconocidos`, igual que en
producción):
```bash
npx ts-node src/tryIt.ts "C:\GD\Distribuidoras\Demo\Import\S44\SAG..._S44_..._20260710060000" "postgres://usuario:password@localhost:5432/Demo" core
```

**Checklist de verificación sugerida:**
- [ ] `npm install` sin errores
- [ ] `setup:folders` crea todas las subcarpetas esperadas
- [ ] `00_load_all.sql` termina sin errores (revisa que no haya `ERROR:` en la salida)
- [ ] `99_check_tables.sql` muestra el número de tablas esperado
- [ ] Un fichero de prueba real por tipo se procesa y se mueve a `Procesado`
- [ ] Volver a lanzar el mismo fichero no duplica filas (dedup funcionando)
- [ ] Un fichero con un tipo no soportado (carpeta sin registro) va a `Desconocidos`
- [ ] Un fichero con XML corrupto va a `Error` y el mensaje de log explica por qué



## Decisión de diseño: esquema explícito en vez de search_path

Cada distribuidora puede tener sus tablas en un esquema PostgreSQL distinto
(`public`, `core`, u otro). En vez de depender del `search_path` de la
conexión (que puede no incluir el esquema esperado y dar errores confusos
tipo "no schema has been selected to create in"), el esquema se recibe
como **parámetro explícito** en `repository.insert(pool, fileNameInfo,
schema, data)`, y las queries lo interpolan directamente
(`INSERT INTO ${schema}.t_s02 ...`).

El nombre de esquema se valida con `core/sqlIdentifier.ts` (solo letras,
números y `_`) antes de interpolarlo, ya que aunque venga de configuración
interna y no de un fichero externo, es buena práctica no construir SQL con
strings sin validar.

En `config/distribuidoras.json` cada distribuidora tiene su propio campo
`"schema"`. Los scripts de creación de tablas (`sql/*.sql`) usan una
variable de `psql` (`:schema`), así que hay que fijarla antes de
ejecutarlos (`-v schema=core` o `\set schema core`).



Pasos para probarlo en tu máquina con un fichero real:

**1. Requisitos**
- Node.js 20 o superior.
- Acceso a un PostgreSQL (local, Docker, o el de la distribuidora).
  Si no tienes uno a mano, con Docker:
  ```bash
  docker run --name gd-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=Hidroelcarmen -p 5432:5432 -d postgres:16
  ```

**2. Instalar dependencias**
```bash
cd gd-import-service
npm install
```

**3. Crear las tablas**

Las tablas se crean en el esquema que indiques (`public`, `core`, o el que
use tu base de datos), pasado como variable de `psql`:

```bash
psql "postgres://postgres:test@localhost:5432/Hidroelcarmen" -v schema=public -f sql/s02_schema.sql
psql "postgres://postgres:test@localhost:5432/Hidroelcarmen" -v schema=public -f sql/s04_schema.sql
```

o, desde dentro de una sesión interactiva de `psql`:
```sql
\set schema public
\i sql/s02_schema.sql
\i sql/s04_schema.sql
```

(cambia `public` por `core` o el esquema que corresponda)

**4. Procesar un fichero real**

El esquema es el tercer argumento (opcional; si se omite, usa `public`):

```bash
npx ts-node src/tryIt.ts \
  "C:\GD\Distribuidoras\Hidroelcarmen\Import\SABT\SAG0169000679_0_S02_0_20260708060000" \
  "postgres://postgres:test@localhost:5432/Hidroelcarmen" \
  public
```

Esto detecta el tipo por el nombre del fichero, lo parsea, lo inserta y
muestra por consola algo como:
```
Fichero: SAG0169000679_0_S02_0_20260708060000
Tipo detectado: S02
cncId (del nombre): SAG0169000679
Fecha (del nombre): 2026-07-08T06:00:00.000Z
Resultado: { tipo: 'S02', nombreFichero: '...', filasPrincipales: 123, filasError: 0 }
```

**5. Verificar en la base de datos**
```sql
SELECT * FROM t_s02 LIMIT 10;
SELECT * FROM t_s04 LIMIT 10;
```

Si vuelves a ejecutar el mismo fichero una segunda vez, `filasPrincipales`
debería salir en `0` (deduplicación funcionando vía `ON CONFLICT DO NOTHING`).

Si algo falla al hacer `npm install` (por firewall/proxy corporativo) o al
conectar con PostgreSQL, dime el error exacto y lo depuramos.



Para todos los tipos de fichero, cualquier fecha-hora extraída del XML
(`Fh`, `Fhi`, `Fhf`, `Fx`...) se guarda en **dos columnas separadas**:
`fecha` (`DATE`) y `hora` (`TIME`), en vez de un único `TIMESTAMP`.

La utilidad compartida `parseFh` (`core/fhParser.ts`) devuelve directamente
`{ fecha: 'AAAA-MM-DD', hora: 'HH:mm:ss', flagHorario }` como strings, sin
pasar por un objeto `Date` de JavaScript en ningún momento. Esto evita un
problema añadido: si se construyera un `Date`, este arrastraría la zona
horaria del proceso Node al insertarlo, lo que puede desplazar la hora
guardada respecto a la que venía en el fichero. Al trabajar con strings
`AAAA-MM-DD` / `HH:mm:ss` de principio a fin, no hay conversión de zona
horaria en ningún punto de la tubería.

Las columnas de auditoría generadas por el propio sistema (como
`fecha_procesado` en las tablas `*_error`, con `DEFAULT now()`) se han
dejado como `TIMESTAMP` único, ya que no son un dato del fichero sino
metadata interna de cuándo se procesó — avisa si también quieres partir
estas en fecha/hora.

## Decisión de diseño: sin tabla de cabecera de fichero

Se ha descartado deliberadamente tener una tabla `ficheros_procesados` (o
similar) y una tabla intermedia de contador. En su lugar:

- `t_s02` guarda una fila por lectura, con `nombre_fichero` como columna
  informativa (no FK).
- `t_s02_error` guarda una fila por contador en error, igual.
- La deduplicación es atómica: `UNIQUE(cnt_id, fecha_hora)` en `t_s02` y
  `UNIQUE(nombre_fichero, cnt_id)` en `t_s02_error`, combinado con
  `ON CONFLICT DO NOTHING` en el `INSERT`. Esto evita el round-trip extra
  y la condición de carrera de comprobar duplicados con un `SELECT` previo
  desde el código.
- La trazabilidad de "qué fichero se procesó, cuándo y si falló" la da el
  propio sistema de carpetas (`Import/` → `Procesado/` / `Error/` /
  `Desconocidos/`) más el log de aplicación, no la base de datos.
- **Trade-off asumido**: si un fichero falla antes de insertar ninguna fila
  (por ejemplo, XML corrupto), no queda ningún rastro en la base de datos,
  solo en el log y en que el fichero termina en `Error/`.

Este mismo patrón (`t_XXX` + `t_XXX_error` cuando aplique, sin cabecera) se
replicará para el resto de tipos de fichero.

## Asunciones pendientes de confirmar sobre S02

Estas están documentadas también como comentarios en `sql/s02_schema.sql` y
`s02.parser.ts`, pero te las resumo aquí porque afectan al significado de los
datos, no solo a la implementación:

1. **`Fh` (fecha-hora de la lectura)**: formato `AAAAMMDDHHmmss` + 3 dígitos +
   1 letra (ej. `20260703050000000S`). Se ha asumido que:
   - Los 3 dígitos intermedios (`000` en todos los ejemplos vistos) no aportan
     información y se descartan del valor de fecha, aunque se guarda el
     `Fh` completo en `fh_raw` por si hace falta revisarlo.
   - La letra final es un indicador de horario verano/invierno (V/I/S...),
     útil para desambiguar la hora repetida en el cambio de horario de
     octubre. Se guarda tal cual en `flag_horario`.

   **¿Puedes confirmar si esta interpretación es correcta?** Si tienes la
   especificación del formato (posiblemente un documento tipo "Anexo III" o
   similar del protocolo de telemedida), lo ideal sería contrastarlo.

2. **`Bc` (bandera en cada lectura S02)**: se ha visto `"00"`, `"02"`, `"82"`.
   Por ahora se guarda como texto sin decodificar. Si conoces el significado
   de estos códigos (probablemente un bitmask de estado: estimado, sustituido,
   fuera de rango, etc.), lo añadimos como tabla de códigos o columna booleana
   derivada.

3. **`Magn` (magnitud, en el contador `Cnt`)**: se guarda como entero. No
   tengo claro si es un multiplicador a aplicar a AI/AE/R1-R4, un identificador
   de tipo de magnitud, o simplemente informativo. Pendiente de confirmar.

4. **Un `Cnt` puede venir de dos formas mutuamente excluyentes**:
   - Con lecturas: `Magn` presente, sin `ErrCat`/`ErrCode`.
   - En error: `ErrCat`/`ErrCode` presentes, sin lecturas ni `Magn`.

   Este caso sí está soportado en el esquema (columnas nullable +
   `CHECK` constraint) y en el parser.

## Asunciones pendientes de confirmar sobre S04

1. **`Ctr`** (atributo de cada `S04`): siempre `"1"` en los ejemplos vistos.
   No tengo claro qué representa (¿número de contrato? ¿algún contador
   interno?). Se guarda tal cual, como entero nullable.

2. **Los dos bloques `Value` (sufijos "a" e "i")**: cada `S04` trae dos
   `Value`, uno con `AIa/AEa/R1a-R4a` y otro con `AIi/AEi/R1i-R4i` —
   mismas magnitudes que en S02 (activa entrante/saliente + reactiva por
   cuadrantes), pero **no sé qué distingue "a" de "i"**. Se guardan ambos
   conjuntos de columnas (`_a` y `_i`) sin interpretar su significado.
   Si tienes la especificación, esto ayudaría a nombrar las columnas de
   forma más descriptiva que "a"/"i".

3. **Contador en error en S04**: se ha asumido (por analogía con S02) que
   un `Cnt` puede venir con `ErrCat`/`ErrCode` en vez de periodos `S04`,
   aunque no se ha visto ningún caso en el ejemplo proporcionado. Si S04
   no tiene este caso, la tabla `t_s04_error` simplemente se quedaría
   vacía sin causar ningún problema.

## Asunciones pendientes de confirmar sobre S09

1. **`Et` y `C`**: no tengo confirmado qué representan exactamente "tipo
   de evento" y "código de evento". Se guardan como enteros tal cual.
   Algunos patrones observados (sin confirmar): `Et=6` con `C=1/2/5/6`
   parece ser el evento más frecuente, casi periódico (¿estados
   rutinarios, tipo heartbeat?); `Et=2` con `C=4/5` viene siempre en
   parejas con `D1`/`D2` invertidos (`1,2` y `2,1`) — podría marcar
   inicio/fin de un cambio de horario; `Et=3` con `C=236/237` trae `D1`
   como una fecha-hora relacionada (¿instante real del evento frente a
   cuándo se registró?).

2. **`D1`/`D2`**: contenido variable — a veces un código pequeño (`1`,
   `2`), a veces una fecha-hora completa en el mismo formato que `Fh`.
   Se guarda siempre el valor crudo (`d1_raw`/`d2_raw`), y **además**,
   si `D1` encaja con el formato de fecha-hora, se parsea en columnas
   separadas (`fecha_d1`/`hora_d1`). Si tienes la especificación de qué
   significa cada combinación de `Et`/`C`, ayudaría a nombrar y tipar
   estas columnas con más precisión.

3. **Contador en error en S09**: igual que en S04, se asume por analogía
   con S02 que un `Cnt` podría venir con `ErrCat`/`ErrCode`, aunque no se
   ha visto ningún caso en el ejemplo de S09.

## Asunciones pendientes de confirmar sobre G01

1. **No hay nivel `Cnt`** en este tipo de fichero — los datos son
   directamente por concentrador (`Cnc`). Por eso no existe una tabla
   `t_g01_error`: no hay contador que pueda venir en error.

2. **`Amed`, `Amax`, `Tot`, `Aperc`**: interpretación tentativa a partir
   de los nombres y de que los valores observados son coherentes con un
   cálculo de cobertura de lectura (`Amed`/`Tot` × 100 ≈ `Aperc`):
   - `Amed`: contadores leídos de media en esa hora (asunción).
   - `Amax`: contadores leídos como máximo en esa hora (asunción).
   - `Tot`: total de contadores esperados/asociados al concentrador
     (asunción).
   - `Aperc`: porcentaje de cobertura/disponibilidad (asunción).

   Si tienes la especificación de este tipo de fichero, ayudaría mucho a
   confirmar o corregir estos nombres.

## Asunciones pendientes de confirmar sobre G02

1. **`Atime`, `Nchanges`, `Aconc`, `Atimeperc`**: interpretación
   tentativa (nombres sugieren "disponibilidad/conectividad del
   contador"):
   - `Atime`: minutos que el contador estuvo disponible/conectado en
     el periodo (asunción).
   - `Nchanges`: número de cambios de estado de conectividad (asunción).
   - `Aconc`: minutos totales del periodo de medida — siempre 1440 en
     el ejemplo, coherente con 24h (asunción).
   - `Atimeperc`: porcentaje de disponibilidad, coherente con
     `Atime`/`Aconc`×100 en los valores observados (asunción).

2. **Contador en error en G02**: igual que en S04/S09, se asume por
   analogía con S02 que un `Cnt` podría venir con `ErrCat`/`ErrCode`,
   aunque no se ha visto ningún caso en el ejemplo de G02.

## Asunciones pendientes de confirmar sobre G56

1. **Jerarquía distinta**: `Report > Rtu > LVSLine > G56*`, sin
   `Cnc`/`Cnt`. `Rtu` = equipo remoto, `LVSLine` = línea de baja tensión
   dentro de ese `Rtu`, identificada también por `Pos` (posición, se
   guarda como texto para no perder ceros a la izquierda como `"01"`).

2. **Nombres de columnas por fase** (`AvgCph1`, `AvgVph1`, `AvgPimph1`,
   `AvgPexph1`, `AvgQimph1`, `AvgQexph1`, `AvgPF1`, y lo mismo para fase
   2 y 3): interpretación por analogía con `AI`/`AE` de S02 (Imp =
   importada, Exp = exportada):
   - `AvgCph*`: corriente media de la fase (asunción).
   - `AvgVph*`: tensión media de la fase (asunción).
   - `AvgPimph*` / `AvgPexph*`: potencia activa media importada/
     exportada de la fase (asunción).
   - `AvgQimph*` / `AvgQexph*`: potencia reactiva media importada/
     exportada de la fase (asunción).
   - `AvgPF*`: factor de potencia medio de la fase (asunción).

3. **`AvgV12`, `AvgV23`, `AvgV31`**: tensiones de línea (fase-fase)
   medias (asunción).

4. **`AvgCn`**: corriente de neutro media (asunción).

5. **`Temp`**: temperatura, unidad no confirmada (asumido °C dados los
   valores observados, ~19-20).

6. **Sin tabla de error**: no se ha observado ningún caso de error en
   este tipo de fichero (ni a nivel `Rtu` ni `LVSLine`), así que no
   existe `t_g56_error` (igual que en G01).

## Asunciones pendientes de confirmar sobre S12

1. **La mayoría de los ~50 atributos de configuración del concentrador**
   (red, FTP, NTP, timeouts, prioridades...) no tienen significado
   documentado; se han guardado con nombres de columna descriptivos por
   analogía con el nombre del atributo XML, tipados de forma
   conservadora (texto salvo que el valor sea claramente numérico como
   año, puertos, segundos o contadores). Si tienes la especificación de
   este tipo de fichero, sería muy útil para confirmar/corregir estos
   nombres y tipos.

2. **`TpPer`**: formato de 14 dígitos sin la letra final que sí tiene
   `Fh` (p.ej. `"00000100000000"`). No encaja con el formato de `Fh`,
   así que se guarda como texto crudo (`tp_per_raw`) sin interpretar.
   Sospecha sin confirmar: podría codificar una duración/periodicidad
   (días-horas-minutos-segundos), pero no hay forma de confirmarlo con
   los datos disponibles.

3. **`ProcessResult.filasError`** se reutiliza para reportar las filas
   insertadas en `t_s12_tarea` (no hay concepto de "error" en S12, al no
   existir nivel `Cnt`). Es una reutilización pragmática del mismo
   campo, no un error real detectado.

4. **`TpAttr`**: aparece siempre vacío (`<TpAttr/>`) en los ejemplos
   vistos, así que no se ha modelado. Si en algún fichero real trajera
   contenido, habría que añadir soporte para él.

## Asunciones pendientes de confirmar sobre S26

1. **Correspondencia posicional `DataId`/`DataValue`**: se asume que,
   al forzarlos a arrays separados, el índice `i` de `DataId` se
   corresponde con el índice `i` de `DataValue`, porque en el XML
   siempre vienen alternados en pares estrictos (un `DataValue` justo
   después de cada `DataId`). Si algún fichero real rompiera ese
   patrón (por ejemplo, trajera todos los `DataId` primero y luego
   todos los `DataValue`), la correspondencia dejaría de ser correcta
   — no se ha podido verificar con más ejemplos.

2. **Significado de cada campo**: asumido por analogía con otros tipos
   ya vistos (`l1v`/`l2v`/`l3v` = tensión por fase, `l1i`/`l2i`/`l3i` =
   corriente por fase, `pimp`/`pexp` = potencia activa import/export,
   `qimp`/`qexp` = potencia reactiva import/export, `pf` = factor de
   potencia, `aia`/`aea` = activa entrante/saliente, `r1a`-`r4a` =
   reactiva por cuadrante). `ca`, `pp`, `fc`, `eacti`, `eanti`, `i3`:
   sin identificar con seguridad.

3. **Estructura de tabla**: sigue el mismo patrón estándar del resto de
   tipos con jerarquía `Cnc > Cnt` (`nombre_fichero`, `cnc_id`/`cnt_id`,
   `flag_horario`/`fh_raw`, `t_s26_error`), en vez de la clave primaria
   compuesta y el esquema fijo `core` de la DDL original que se dio al
   principio (que parecía copiada de otra tabla, `t_valores_instantaneos`).

4. **Deduplicación simple (`ON CONFLICT DO NOTHING`)**: si el mismo
   fichero se reprocesa, no se duplica. Pero si dos ficheros distintos
   trajeran el mismo `Cnt`+instante con conjuntos de `DataId`
   *diferentes* (p.ej. uno con `L1v/L2v/L3v` y otro con `Pimp/AIa` para
   la misma fecha/hora), el segundo NO se fusionaría con el primero —
   se ignoraría entero. Si esto puede pasar en la práctica, avisa y lo
   cambiamos a una actualización que combine campos (`COALESCE`) en vez
   de descartar.

## Próximos pasos sugeridos

1. Confirmar las asunciones anteriores.
2. Pasar el formato del siguiente tipo de fichero (por ejemplo S13) para
   replicar el mismo patrón: `types.ts` + `parser.ts` + `repository.ts` +
   `schema.sql`, y añadirlo a `parsers/registry.ts`.
3. Una vez tengamos 2-3 tipos resueltos, construir el watcher de carpetas
   (chokidar) y el orquestador que ata todo: detectar fichero → resolver
   distribuidora por carpeta → detectar tipo por nombre → parsear → insertar
   → mover a `Procesado/`, `Error/` o `Desconocidos/` según corresponda.
