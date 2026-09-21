import { Request, Response, NextFunction, RequestHandler } from 'express';
import { XMLParser } from 'fast-xml-parser';

// removeNSPrefix: quita el prefijo de namespace de cada etiqueta
// (soapenv:Envelope -> Envelope, S:Body -> Body, ns1:Report -> Report...).
// Esto es lo que permite que EventsController ya no tenga que probar
// 4 variantes de prefijo a mano para cada etiqueta del sobre SOAP.
//
// isArray fuerza a array Body/Report/Payload, que es lo único que el
// controlador indexa con [0] (Envelope se lee directo, sin índice).
const envelopeParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  isArray: (name) => ['Body', 'Report', 'Payload'].includes(name),
});

const XML_CONTENT_TYPES = ['text/xml', 'application/xml', 'application/soap+xml'];

/**
 * Middleware que parsea el cuerpo de la petición como XML/SOAP y lo
 * deja en req.body (sustituye a bodyParserXml(bodyParser) +
 * bodyParser.xml()). Solo actúa si el Content-Type es XML/SOAP; para
 * cualquier otro tipo (p.ej. application/json de /api/keys), no hace
 * nada y pasa al siguiente middleware sin tocar req.body.
 */
export function xmlBodyParser(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.is(XML_CONTENT_TYPES)) {
      next();
      return;
    }

    let raw = '';
    req.setEncoding('utf8');

    req.on('data', (chunk: string) => {
      raw += chunk;
    });

    req.on('end', () => {
      if (!raw) {
        req.body = undefined;
        next();
        return;
      }

      try {
        req.body = envelopeParser.parse(raw);
        next();
      } catch (err) {
        next(err);
      }
    });

    req.on('error', (err) => {
      next(err);
    });
  };
}