import { Request, Response } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { Pool } from 'pg';
import { Logger } from '../utils/logger';

const logger = new Logger('EventsController');

// Igual que en la versión con TypeORM: se fuerza a array exactamente
// los elementos que el código trata como array-de-uno-o-más (Cnc,
// Cnt, Rtu, LVSLine, y cada tipo de evento), y los atributos/valores
// de texto se dejan como string (sin auto-parseo), ya que el propio
// código hace sus parseInt() donde hace falta.
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => ['Cnc', 'Cnt', 'Rtu', 'LVSLine', 'S13', 'S15', 'S31', 'S63', 'S65'].includes(name),
});

/**
 * Valida que un nombre de esquema sea un identificador SQL "seguro"
 * antes de interpolarlo en una query (se recibe de configuración
 * interna, no de un fichero externo, pero se valida igualmente).
 */
function validateSqlIdentifier(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Nombre de esquema no válido: "${name}"`);
  }
  return name;
}

const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <ReportResponse xmlns="http://www.asais.fr/ns/Saturne/STG/ws">
      <ReportResult>true</ReportResult>
    </ReportResponse>
  </soap:Body>
</soap:Envelope>
`;

const xmlResponseURS = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
<s:Body>
    <UpdateRequestStatusResponse xmlns="http://www.asais.fr/ns/Saturne/STG/ws" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <UpdateRequestStatusResult>true</UpdateRequestStatusResult>
    </UpdateRequestStatusResponse>
</s:Body>
</s:Envelope>`;

const xmlResponseUMS = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
<s:Body>
    <UpdateMetersStatusResponse xmlns="http://www.asais.fr/ns/Saturne/STG/ws" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <UpdateMetersStatusResult>true</UpdateMetersStatusResult>
    </UpdateMetersStatusResponse>
</s:Body>
</s:Envelope>`;

/**
 * @param pool   Pool de PostgreSQL ya resuelto para la distribuidora/BD
 *               correspondiente (sustituye al DataSource de TypeORM).
 * @param schema Esquema donde viven las tablas s13/s15/s31/s63/s65
 *               (p.ej. "core").
 */
export function getData(pool: Pool, schema: string) {
  const safeSchema = validateSqlIdentifier(schema);

  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { body } = req;

      logger.info(`Request received for schema: ${safeSchema}`);

      if (!body) {
        res.status(400).send('Empty request body');
        return;
      }

      const envelope = body.Envelope;
      const bodyContent = envelope?.Body?.[0];

      const report = bodyContent?.Report?.[0]?.Payload?.[0];
      const reportNode = bodyContent?.Report;

      if (report !== undefined) {
        logger.info('Event found. Parsing event...');
        const parsedReport = await parseXml(report);
        logger.info('Event parsed successfully');
        await processReport(parsedReport, pool, safeSchema);
      }

      if (reportNode) {
        res.set('Content-Type', 'application/xml');
        res.send(xmlResponse);
      } else if (bodyContent?.UpdateRequestStatus) {
        res.set('Content-Type', 'application/xml');
        res.send(xmlResponseURS);
      } else if (bodyContent?.UpdateMetersStatus) {
        res.set('Content-Type', 'application/xml');
        res.send(xmlResponseUMS);
      } else {
        res.status(400).send('Unrecognized request type');
      }
    } catch (error) {
      logger.error('Error processing request:', error);
      res.status(500).send('<h1>Error processing XML</h1>');
    }
  };
}

async function parseXml(xml: string): Promise<any> {
  // fast-xml-parser es síncrono; se mantiene la firma async para no
  // tocar el punto de llamada ("await parseXml(report)").
  return xmlParser.parse(xml);
}

async function processReport(report: any, pool: Pool, schema: string): Promise<void> {
  logger.info(`Processing event for schema: ${schema}`);

  const { IdRpt, IdPet, Version } = report.Report;
  const idPet = parseInt(IdPet, 10);

  switch (IdRpt) {
    case 'S13':
      await processS13(report, IdRpt, idPet, Version, pool, schema);
      break;
    case 'S15':
      await processS15(report, IdRpt, idPet, Version, pool, schema);
      break;
    case 'S31':
      await processS31(report, IdRpt, idPet, Version, pool, schema);
      break;
    case 'S63':
      await processS63(report, IdRpt, idPet, Version, pool, schema);
      break;
    case 'S65':
      await processS65(report, IdRpt, idPet, Version, pool, schema);
      break;
    default:
      logger.error(`Unknown report type: ${IdRpt}`);
      break;
  }
}

async function processS13(report: any, idRpt: string, idPet: number, version: string, pool: Pool, schema: string): Promise<void> {
  try {
    logger.info('S13 event detected');

    const node = report.Report.Cnc[0].Cnt[0].S13[0];
    const cnc = report.Report.Cnc[0].Id;
    const cnt = report.Report.Cnc[0].Cnt[0].Id;
    const errCat = node.ErrCat !== undefined ? parseInt(node.ErrCat) : null;
    const errCode = node.ErrCat !== undefined ? parseInt(node.ErrCode) : null;

    await pool.query(
      `INSERT INTO ${schema}.s13
         ("idRpt", "idPet", version, cnc, cnt, fh, et, c, d1, d2, "errCat", "errCode")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [idRpt, idPet, version, cnc, cnt, node.Fh, parseInt(node.Et), parseInt(node.C), node.D1 ?? null, node.D2 ?? null, errCat, errCode]
    );

    logger.info(`S13 event saved to schema: ${schema}`);
  } catch (error: any) {
    if (error?.code === '23505') {
      logger.warn(`S13 duplicate key detected - sequence may need reset in schema: ${schema}`);
    } else {
      logger.error('Error processing S13:', error);
    }
    throw error;
  }
}

async function processS15(report: any, idRpt: string, idPet: number, version: string, pool: Pool, schema: string): Promise<void> {
  try {
    logger.info('S15 event detected');

    const node = report.Report.Cnc[0].S15[0];
    const cnc = report.Report.Cnc[0].Id;

    await pool.query(
      `INSERT INTO ${schema}.s15
         ("idRpt", "idPet", version, cnc, fh, et, c, d1, d2)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [idRpt, idPet, version, cnc, node.Fh, parseInt(node.Et), parseInt(node.C), node.D1 ?? null, node.D2 ?? null]
    );

    logger.info(`S15 event saved to schema: ${schema}`);
  } catch (error) {
    logger.error('Error processing S15:', error);
    throw error;
  }
}

async function processS31(report: any, idRpt: string, idPet: number, version: string, pool: Pool, schema: string): Promise<void> {
  try {
    logger.info('S31 event detected');

    const node = report.Report.Cnc[0].Cnt[0].S31[0];
    const cnc = report.Report.Cnc[0].Id;
    const cnt = report.Report.Cnc[0].Cnt[0].Id;

    await pool.query(
      `INSERT INTO ${schema}.s31
         ("idRpt", "idPet", version, cnc, cnt, fh, "clientId", status, "keyRequest")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [idRpt, idPet, version, cnc, cnt, node.Fh, parseInt(node.ClientId), parseInt(node.Status), node.KeyRequest]
    );

    logger.info(`S31 event saved to schema: ${schema}`);
  } catch (error) {
    logger.error('Error processing S31:', error);
    throw error;
  }
}

async function processS63(report: any, idRpt: string, idPet: number, version: string, pool: Pool, schema: string): Promise<void> {
  try {
    const lvsLine = report.Report.Rtu[0].LVSLine[0];
    const s63Count = lvsLine.S63.length;
    logger.info(`S63 event detected (${s63Count} records)`);

    const rtuId = report.Report.Rtu[0].Id;
    const lvsId = lvsLine.Id;
    const lvsPos = parseInt(lvsLine.Pos);
    const errCat = lvsLine.ErrCat !== undefined ? parseInt(lvsLine.ErrCat) : null;
    const errCode = lvsLine.ErrCat !== undefined ? parseInt(lvsLine.ErrCode) : null;

    for (let i = 0; i < s63Count; i++) {
      const node = lvsLine.S63[i];

      await pool.query(
        `INSERT INTO ${schema}.s63
           ("idRpt", "idPet", version, "rtuId", "lvsId", "lvsPos", "errCat", "errCode", fh, et, c, d1, d2)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT ("rtuId", "lvsId", fh) DO NOTHING`,
        [idRpt, idPet, version, rtuId, lvsId, lvsPos, errCat, errCode, node.Fh, parseInt(node.Et), parseInt(node.C), node.D1 ?? null, node.D2 ?? null]
      );
    }

    logger.info(`S63 events saved to schema: ${schema}`);
  } catch (error) {
    logger.error('Error processing S63:', error);
    throw error;
  }
}

async function processS65(report: any, idRpt: string, idPet: number, version: string, pool: Pool, schema: string): Promise<void> {
  try {
    const rtu = report.Report.Rtu[0];
    const s65Count = rtu.S65.length;
    logger.info(`S65 event detected (${s65Count} records)`);

    const rtuId = rtu.Id;
    const errCat = rtu.ErrCat !== undefined ? parseInt(rtu.ErrCat) : null;
    const errCode = rtu.ErrCat !== undefined ? parseInt(rtu.ErrCode) : null;

    for (let i = 0; i < s65Count; i++) {
      const node = rtu.S65[i];

      await pool.query(
        `INSERT INTO ${schema}.s65
           ("idRpt", "idPet", version, "rtuId", "errCat", "errCode", fh, et, c, d1, d2)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("rtuId", fh) DO NOTHING`,
        [idRpt, idPet, version, rtuId, errCat, errCode, node.Fh, parseInt(node.Et), parseInt(node.C), node.D1 ?? null, node.D2 ?? null]
      );
    }

    logger.info(`S65 events saved to schema: ${schema}`);
  } catch (error) {
    logger.error('Error processing S65:', error);
    throw error;
  }
}