import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh, tryParseFh } from '../../core/fhParser';
import { S24BConcentrador, S24BFile, S24BMeter, S24BSnapshot } from './s24b.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno,
  // porque fast-xml-parser devuelve un objeto suelto (no array) si solo hay 1.
  // El atributo xmlns del Report se ignora (no se hace parsing consciente
  // de namespaces).
  isArray: (name) => ['Cnc', 'S24B', 'Meter'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

function toNullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

function parseS24BMeter(raw: any): S24BMeter {
  const lastCommRaw = toNullableString(raw.LastCommunication);
  const lastCommParsed = lastCommRaw !== null ? tryParseFh(lastCommRaw) : null;

  const dateTfRaw = toNullableString(raw.DateTF);
  const dateTfParsed = dateTfRaw !== null ? tryParseFh(dateTfRaw) : null;

  return {
    serial: String(raw.Serial),
    address: toNullableString(raw.Address),
    version: toNullableString(raw.Version),
    primeVersion: toNullableString(raw.PrimeVersion),
    present: toNullableString(raw.Present),

    lastCommFecha: lastCommParsed?.fecha ?? null,
    lastCommHora: lastCommParsed?.hora ?? null,
    lastCommMs: lastCommParsed?.ms ?? null,
    lastCommFlagHorario: lastCommParsed?.flagHorario ?? null,
    lastCommRaw,

    dateTfFecha: dateTfParsed?.fecha ?? null,
    dateTfHora: dateTfParsed?.hora ?? null,
    dateTfMs: dateTfParsed?.ms ?? null,
    dateTfFlagHorario: dateTfParsed?.flagHorario ?? null,
    dateTfRaw,

    avgResponseTime: toNullableNumber(raw.AvgResponseTime),
    statusChanges: toNullableNumber(raw.StatusChanges),
    activeTime: toNullableNumber(raw.ActiveTime),
  };
}

function parseS24BSnapshot(raw: any): S24BSnapshot {
  const { fecha, hora, ms, flagHorario } = parseFh(String(raw.Fh));
  const metersRaw = raw.Meter ?? [];

  return {
    fecha,
    hora,
    ms,
    flagHorario,
    fhRaw: String(raw.Fh),
    meters: (Array.isArray(metersRaw) ? metersRaw : [metersRaw]).map(parseS24BMeter),
  };
}

function parseS24BConcentrador(raw: any): S24BConcentrador {
  const snapshotsRaw = raw.S24B ?? [];

  return {
    cncId: String(raw.Id),
    snapshots: (Array.isArray(snapshotsRaw) ? snapshotsRaw : [snapshotsRaw]).map(
      parseS24BSnapshot
    ),
  };
}

export class S24BParser implements FileParser<S24BFile> {
  tipo = 'S24B';

  parse(xmlContent: string): S24BFile {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS24BConcentrador),
    };
  }
}
