// Antes era una entidad de TypeORM (@Entity({ schema: 'core', name: 't_keys' }))
// con @PrimaryColumn/@Column. Ahora es una interfaz de datos normal:
// las columnas y su tipado se mantienen igual, pero el acceso a la
// base de datos vive en KeyManagementService/KeyManagerWorker usando
// pg directamente.
//
// Los campos nulables se tipan como "tipo | null" (no "tipo | undefined"
// / "campo?"), porque así es como los devuelve realmente una fila leída
// con pg: una columna NULL llega como null, nunca como "ausente".
export interface TKeys {
  cnt_id: string;
  master_key_id: number | null;
  masterkey_wrap: string | null;
  master_key_value: string | null;
  local_1_client_id: number | null;
  local_1_secret: string | null;
  local_2_client_id: number | null;
  local_2_secret: string | null;
  remote_client_id: number | null;
  remote_secret: string | null;
  remote_factory_secret: string | null;
  gun_key_id: number | null;
  gun_key_wrap: string | null;
  gun_key_val: string | null;
  gau_key_id: number | null;
  gau_key_wrap: string | null;
  gau_key_val: string | null;
  creation_date: string;
  update_date: string | null;
}