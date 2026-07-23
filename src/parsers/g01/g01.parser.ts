import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { G01Concentrador, G01File, G01Lectura } from './g01.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // Nota: a diferencia de S02/S04/S05/S09, aquí NO hay nivel Cnt.
  isArray: (name) => ['Cnc', 'G01'].includes(name),
});

function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseG01Lectura(raw: any): G01Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),

    amed: toNumber(raw.Amed),
    amax: toNumber(raw.Amax),
    tot: toNumber(raw.Tot),
    aperc: toNumber(raw.Aperc),
  };
}

function parseG01Concentrador(raw: any): G01Concentrador {
  const lecturasRaw = raw.G01 ?? [];

  return {
    cncId: String(raw.Id),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseG01Lectura),
  };
}

export class G01Parser implements FileParser<G01File> {
  tipo = 'G01';

  parse(xmlContent: string): G01File {
    const parsed = xmlParser.parse(xmlContent);
    const report = parsed.Report;

    if (!report) {
      throw new Error('El XML no contiene un elemento raíz <Report>');
    }

    const cncsRaw = report.Cnc ?? [];

    return {
      idRpt: String(report.IdRpt),
      idPet: String(report.IdPet),
      version: String(report.Version),
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseG01Concentrador),
    };
  }
}
