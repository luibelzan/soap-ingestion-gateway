import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh, tryParseFh } from '../../core/fhParser';
import { S24Concentrador, S24File, S24Meter, S24Snapshot } from './s24.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  isArray: (name) => ['Cnc', 'S24', 'Meter'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function parseS24Meter(raw: any): S24Meter {
  const dateRaw = raw.Date !== undefined ? String(raw.Date) : null;
  const parsedDate = dateRaw !== null ? tryParseFh(dateRaw) : null;

  return {
    meterId: String(raw.MeterId),
    comStatus: toNullableNumber(raw.ComStatus),

    meterFecha: parsedDate?.fecha ?? null,
    meterHora: parsedDate?.hora ?? null,
    meterMs: parsedDate?.ms ?? null,
    meterFlagHorario: parsedDate?.flagHorario ?? null,
    meterDateRaw: dateRaw,

    active: raw.Active !== undefined ? String(raw.Active) : null,
  };
}

function parseS24Snapshot(raw: any): S24Snapshot {
  const { fecha, hora, ms, flagHorario } = parseFh(String(raw.Fh));
  const metersRaw = raw.Meter ?? [];

  return {
    fecha,
    hora,
    ms,
    flagHorario,
    fhRaw: String(raw.Fh),
    meters: (Array.isArray(metersRaw) ? metersRaw : [metersRaw]).map(parseS24Meter),
  };
}

function parseS24Concentrador(raw: any): S24Concentrador {
  const snapshotsRaw = raw.S24 ?? [];

  return {
    cncId: String(raw.Id),
    snapshots: (Array.isArray(snapshotsRaw) ? snapshotsRaw : [snapshotsRaw]).map(
      parseS24Snapshot
    ),
  };
}

export class S24Parser implements FileParser<S24File> {
  tipo = 'S24';

  parse(xmlContent: string): S24File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS24Concentrador),
    };
  }
}
