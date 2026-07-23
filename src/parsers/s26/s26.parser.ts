import { XMLParser } from 'fast-xml-parser';
import { FileParser } from '../../core/types';
import { parseFh } from '../../core/fhParser';
import { S26_COLUMNAS, S26Campos, S26Concentrador, S26Contador, S26File, S26Lectura } from './s26.types';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  // Fuerza estos elementos a ser SIEMPRE array, aunque solo aparezca uno.
  // DataId y DataValue también se fuerzan a array: fast-xml-parser
  // agrupa cada nombre de etiqueta repetido en su propio array,
  // preservando el orden de aparición. Como en el XML siempre vienen
  // alternados en pares estrictos (un DataValue justo después de cada
  // DataId), el índice i de un array se corresponde con el índice i
  // del otro.
  isArray: (name) => ['Cnc', 'Cnt', 'S26', 'DataId', 'DataValue'].includes(name),
});

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Valor numérico inválido: "${value}"`);
  }
  return n;
}

/**
 * Convierte los arrays paralelos DataId/DataValue en un objeto de
 * columnas conocidas + una lista de los DataId no reconocidos (para
 * poder avisar sin tumbar el procesado).
 */
function pivotarCampos(dataIds: any[], dataValues: any[]): { campos: S26Campos; desconocidos: string[] } {
  const campos: S26Campos = {};
  const desconocidos: string[] = [];

  for (let i = 0; i < dataIds.length; i++) {
    const dataId = String(dataIds[i]);
    const rawValue = dataValues[i];
    const columna = dataId.toLowerCase();

    const tipo = S26_COLUMNAS[columna];

    if (!tipo) {
      desconocidos.push(dataId);
      continue;
    }

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      campos[columna as keyof typeof S26_COLUMNAS] = null;
      continue;
    }

    if (tipo === 'text') {
      campos[columna as keyof typeof S26_COLUMNAS] = String(rawValue);
    } else {
      const n = Number(rawValue);
      if (Number.isNaN(n)) {
        throw new Error(`Valor numérico inválido para "${dataId}": "${rawValue}"`);
      }
      campos[columna as keyof typeof S26_COLUMNAS] = n;
    }
  }

  return { campos, desconocidos };
}

function parseS26Lectura(raw: any): S26Lectura {
  const { fecha, hora, flagHorario } = parseFh(String(raw.Fh));

  const dataIds: any[] = Array.isArray(raw.DataId) ? raw.DataId : raw.DataId !== undefined ? [raw.DataId] : [];
  const dataValues: any[] = Array.isArray(raw.DataValue)
    ? raw.DataValue
    : raw.DataValue !== undefined
    ? [raw.DataValue]
    : [];

  const { campos, desconocidos } = pivotarCampos(dataIds, dataValues);

  return {
    fecha,
    hora,
    flagHorario,
    fhRaw: String(raw.Fh),
    campos,
    camposDesconocidos: desconocidos,
  };
}

function parseS26Contador(raw: any): S26Contador {
  const lecturasRaw = raw.S26 ?? [];

  return {
    cntId: String(raw.Id),
    errCat: toNullableNumber(raw.ErrCat),
    errCode: toNullableNumber(raw.ErrCode),
    lecturas: (Array.isArray(lecturasRaw) ? lecturasRaw : [lecturasRaw]).map(parseS26Lectura),
  };
}

function parseS26Concentrador(raw: any): S26Concentrador {
  const contadoresRaw = raw.Cnt ?? [];

  return {
    cncId: String(raw.Id),
    contadores: (Array.isArray(contadoresRaw) ? contadoresRaw : [contadoresRaw]).map(
      parseS26Contador
    ),
  };
}

export class S26Parser implements FileParser<S26File> {
  tipo = 'S26';

  parse(xmlContent: string): S26File {
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
      concentradores: (Array.isArray(cncsRaw) ? cncsRaw : [cncsRaw]).map(parseS26Concentrador),
    };
  }
}
