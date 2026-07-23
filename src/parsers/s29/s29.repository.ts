import { Pool, PoolClient } from 'pg';
import { FileRepository, ProcessResult } from '../../core/types';
import { validateSqlIdentifier } from '../../core/sqlIdentifier';
import { S29File } from './s29.types';

interface FicheroContext {
  rawFileName: string;
  cncId: string;
  fecha: string;
  hora: string;
}

/**
 * Repository de S29: mismo patrón que S02. Dos INSERT masivos en total
 * por fichero (t_s29 y t_s29_error). El esquema se recibe como
 * parámetro explícito.
 */
export class S29Repository implements FileRepository<S29File> {
  async insert(
    pool: Pool,
    fileNameInfo: FicheroContext,
    schema: string,
    data: S29File
  ): Promise<ProcessResult> {
    const safeSchema = validateSqlIdentifier(schema);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const filasPrincipales = await this.insertLecturas(client, safeSchema, fileNameInfo, data);
      const filasError = await this.insertErrores(client, safeSchema, fileNameInfo, data);

      await client.query('COMMIT');

      return {
        tipo: 'S29',
        nombreFichero: fileNameInfo.rawFileName,
        filasPrincipales,
        filasError,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async insertLecturas(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S29File
  ): Promise<number> {
    const cols = {
      nombreFichero: [] as string[],
      cncId: [] as string[],
      cntId: [] as string[],
      fecha: [] as string[],
      hora: [] as string[],
      flagHorario: [] as (string | null)[],
      fhRaw: [] as string[],
      l1v: [] as (number | null)[],
      l1i: [] as (number | null)[],
      l2v: [] as (number | null)[],
      l2i: [] as (number | null)[],
      l3v: [] as (number | null)[],
      l3i: [] as (number | null)[],
      isum: [] as (number | null)[],
      inNeutro: [] as (number | null)[],
      idDif: [] as (number | null)[],
      psigned: [] as (number | null)[],
      l1p: [] as (number | null)[],
      l2p: [] as (number | null)[],
      l3p: [] as (number | null)[],
      qsigned: [] as (number | null)[],
      l1q: [] as (number | null)[],
      l2q: [] as (number | null)[],
      l3q: [] as (number | null)[],
      pf: [] as (number | null)[],
      l1pf: [] as (number | null)[],
      l2pf: [] as (number | null)[],
      l3pf: [] as (number | null)[],
      phaseSeq: [] as (string | null)[],
      l1vAng: [] as (number | null)[],
      l2vAng: [] as (number | null)[],
      l3vAng: [] as (number | null)[],
      l1iAng: [] as (number | null)[],
      l2iAng: [] as (number | null)[],
      l3iAng: [] as (number | null)[],
      inAng: [] as (number | null)[],
      idAng: [] as (number | null)[],
    };

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        for (const l of contador.lecturas) {
          cols.nombreFichero.push(fileNameInfo.rawFileName);
          cols.cncId.push(concentrador.cncId);
          cols.cntId.push(contador.cntId);
          cols.fecha.push(l.fecha);
          cols.hora.push(l.hora);
          cols.flagHorario.push(l.flagHorario);
          cols.fhRaw.push(l.fhRaw);
          cols.l1v.push(l.l1v);
          cols.l1i.push(l.l1i);
          cols.l2v.push(l.l2v);
          cols.l2i.push(l.l2i);
          cols.l3v.push(l.l3v);
          cols.l3i.push(l.l3i);
          cols.isum.push(l.isum);
          cols.inNeutro.push(l.inNeutro);
          cols.idDif.push(l.idDif);
          cols.psigned.push(l.psigned);
          cols.l1p.push(l.l1p);
          cols.l2p.push(l.l2p);
          cols.l3p.push(l.l3p);
          cols.qsigned.push(l.qsigned);
          cols.l1q.push(l.l1q);
          cols.l2q.push(l.l2q);
          cols.l3q.push(l.l3q);
          cols.pf.push(l.pf);
          cols.l1pf.push(l.l1pf);
          cols.l2pf.push(l.l2pf);
          cols.l3pf.push(l.l3pf);
          cols.phaseSeq.push(l.phaseSeq);
          cols.l1vAng.push(l.l1vAng);
          cols.l2vAng.push(l.l2vAng);
          cols.l3vAng.push(l.l3vAng);
          cols.l1iAng.push(l.l1iAng);
          cols.l2iAng.push(l.l2iAng);
          cols.l3iAng.push(l.l3iAng);
          cols.inAng.push(l.inAng);
          cols.idAng.push(l.idAng);
        }
      }
    }

    if (cols.nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s29
         (nombre_fichero, cnc_id, cnt_id, fecha, hora, flag_horario, fh_raw,
          l1v, l1i, l2v, l2i, l3v, l3i,
          isum, in_neutro, id_dif,
          psigned, l1p, l2p, l3p,
          qsigned, l1q, l2q, l3q,
          pf, l1pf, l2pf, l3pf,
          phase_seq,
          l1v_ang, l2v_ang, l3v_ang, l1i_ang, l2i_ang, l3i_ang, in_ang, id_ang)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::date[], $5::time[], $6::char(1)[], $7::varchar[],
         $8::numeric[], $9::numeric[], $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[],
         $14::numeric[], $15::numeric[], $16::numeric[],
         $17::numeric[], $18::numeric[], $19::numeric[], $20::numeric[],
         $21::numeric[], $22::numeric[], $23::numeric[], $24::numeric[],
         $25::numeric[], $26::numeric[], $27::numeric[], $28::numeric[],
         $29::varchar[],
         $30::numeric[], $31::numeric[], $32::numeric[], $33::numeric[], $34::numeric[], $35::numeric[], $36::numeric[], $37::numeric[]
       )
       ON CONFLICT (cnt_id, fecha, hora) DO NOTHING`,
      [
        cols.nombreFichero, cols.cncId, cols.cntId, cols.fecha, cols.hora, cols.flagHorario, cols.fhRaw,
        cols.l1v, cols.l1i, cols.l2v, cols.l2i, cols.l3v, cols.l3i,
        cols.isum, cols.inNeutro, cols.idDif,
        cols.psigned, cols.l1p, cols.l2p, cols.l3p,
        cols.qsigned, cols.l1q, cols.l2q, cols.l3q,
        cols.pf, cols.l1pf, cols.l2pf, cols.l3pf,
        cols.phaseSeq,
        cols.l1vAng, cols.l2vAng, cols.l3vAng, cols.l1iAng, cols.l2iAng, cols.l3iAng, cols.inAng, cols.idAng,
      ]
    );

    return result.rowCount ?? 0;
  }

  private async insertErrores(
    client: PoolClient,
    schema: string,
    fileNameInfo: FicheroContext,
    data: S29File
  ): Promise<number> {
    const nombreFichero: string[] = [];
    const cncId: string[] = [];
    const cntId: string[] = [];
    const errCat: (number | null)[] = [];
    const errCode: (number | null)[] = [];

    for (const concentrador of data.concentradores) {
      for (const contador of concentrador.contadores) {
        if (contador.errCat !== null || contador.errCode !== null) {
          nombreFichero.push(fileNameInfo.rawFileName);
          cncId.push(concentrador.cncId);
          cntId.push(contador.cntId);
          errCat.push(contador.errCat);
          errCode.push(contador.errCode);
        }
      }
    }

    if (nombreFichero.length === 0) return 0;

    const result = await client.query(
      `INSERT INTO ${schema}.t_s29_error (nombre_fichero, cnc_id, cnt_id, err_cat, err_code)
       SELECT * FROM UNNEST(
         $1::varchar[], $2::varchar[], $3::varchar[], $4::integer[], $5::integer[]
       )
       ON CONFLICT (nombre_fichero, cnt_id) DO NOTHING`,
      [nombreFichero, cncId, cntId, errCat, errCode]
    );

    return result.rowCount ?? 0;
  }
}
