import { ParserRegistryEntry } from '../core/types';
import { S02Parser } from './s02/s02.parser';
import { S02Repository } from './s02/s02.repository';
import { S04Parser } from './s04/s04.parser';
import { S04Repository } from './s04/s04.repository';
import { S05Parser } from './s05/s05.parser';
import { S05Repository } from './s05/s05.repository';
import { S09Parser } from './s09/s09.parser';
import { S09Repository } from './s09/s09.repository';
import { G01Parser } from './g01/g01.parser';
import { G01Repository } from './g01/g01.repository';
import { G02Parser } from './g02/g02.parser';
import { G02Repository } from './g02/g02.repository';
import { G56Parser } from './g56/g56.parser';
import { G56Repository } from './g56/g56.repository';
import { G57Parser } from './g57/g57.parser';
import { G57Repository } from './g57/g57.repository';
import { G58Parser } from './g58/g58.parser';
import { G58Repository } from './g58/g58.repository';
import { S93Parser } from './s93/s93.parser';
import { S93Repository } from './s93/s93.repository';
import { S94Parser } from './s94/s94.parser';
import { S94Repository } from './s94/s94.repository';
import { S96Parser } from './s96/s96.parser';
import { S96Repository } from './s96/s96.repository';
import { S97Parser } from './s97/s97.parser';
import { S97Repository } from './s97/s97.repository';
import { S06Parser } from './s06/s06.parser';
import { S06Repository } from './s06/s06.repository';
import { S12Parser } from './s12/s12.parser';
import { S12Repository } from './s12/s12.repository';
import { S14Parser } from './s14/s14.parser';
import { S14Repository } from './s14/s14.repository';
import { S17Parser } from './s17/s17.parser';
import { S17Repository } from './s17/s17.repository';
import { S24Parser } from './s24/s24.parser';
import { S24Repository } from './s24/s24.repository';
import { G59Parser } from './g59/g59.parser';
import { G59Repository } from './g59/g59.repository';
import { S52Parser } from './s52/s52.parser';
import { S52Repository } from './s52/s52.repository';
import { S53Parser } from './s53/s53.parser';
import { S53Repository } from './s53/s53.repository';
import { S59Parser } from './s59/s59.parser';
import { S59Repository } from './s59/s59.repository';
import { S64Parser } from './s64/s64.parser';
import { S64Repository } from './s64/s64.repository';
import { S98Parser } from './s98/s98.parser';
import { S98Repository } from './s98/s98.repository';
import { S95Parser } from './s95/s95.parser';
import { S95Repository } from './s95/s95.repository';
import { G53Parser } from './g53/g53.parser';
import { G53Repository } from './g53/g53.repository';
import { S67Parser } from './s67/s67.parser';
import { S67Repository } from './s67/s67.repository';
import { S62Parser } from './s62/s62.parser';
import { S62Repository } from './s62/s62.repository';
import { S45Parser } from './s45/s45.parser';
import { S45Repository } from './s45/s45.repository';
import { S44Parser } from './s44/s44.parser';
import { S44Repository } from './s44/s44.repository';
import { S24BParser } from './s24b/s24b.parser';
import { S24BRepository } from './s24b/s24b.repository';
import { S29Parser } from './s29/s29.parser';
import { S29Repository } from './s29/s29.repository';
import { S07Parser } from './s07/s07.parser';
import { S07Repository } from './s07/s07.repository';
import { S08Parser } from './s08/s08.parser';
import { S08Repository } from './s08/s08.repository';
import { S26Parser } from './s26/s26.parser';
import { S26Repository } from './s26/s26.repository';
import { G03Parser } from './g03/g03.parser';
import { G03Repository } from './g03/g03.repository';
import { G04Parser } from './g04/g04.parser';
import { G04Repository } from './g04/g04.repository';
import { G05Parser } from './g05/g05.parser';
import { G05Repository } from './g05/g05.repository';

/**
 * Registro central: añadir aquí una entrada por cada nuevo tipo de fichero
 * (S13, S15, G03...). El resto de la infraestructura (watchers, orquestador)
 * no necesita tocarse al añadir un tipo nuevo.
 */
export const parserRegistry: Record<string, ParserRegistryEntry> = {
  S02: { parser: new S02Parser(), repository: new S02Repository() },
  S04: { parser: new S04Parser(), repository: new S04Repository() },
  S05: { parser: new S05Parser(), repository: new S05Repository() },
  S06: { parser: new S06Parser(), repository: new S06Repository() },
  S07: { parser: new S07Parser(), repository: new S07Repository() },
  S08: { parser: new S08Parser(), repository: new S08Repository() },
  S09: { parser: new S09Parser(), repository: new S09Repository() },
  S12: { parser: new S12Parser(), repository: new S12Repository() },
  S14: { parser: new S14Parser(), repository: new S14Repository() },
  S17: { parser: new S17Parser(), repository: new S17Repository() },
  S24: { parser: new S24Parser(), repository: new S24Repository() },
  S24B: { parser: new S24BParser(), repository: new S24BRepository() },
  S26: { parser: new S26Parser(), repository: new S26Repository() },
  S29: { parser: new S29Parser(), repository: new S29Repository() },
  S44: { parser: new S44Parser(), repository: new S44Repository() },
  S45: { parser: new S45Parser(), repository: new S45Repository() },
  S52: { parser: new S52Parser(), repository: new S52Repository() },
  S53: { parser: new S53Parser(), repository: new S53Repository() },
  S59: { parser: new S59Parser(), repository: new S59Repository() },
  S62: { parser: new S62Parser(), repository: new S62Repository() },
  S64: { parser: new S64Parser(), repository: new S64Repository() },
  S67: { parser: new S67Parser(), repository: new S67Repository() },
  S95: { parser: new S95Parser(), repository: new S95Repository() },
  S98: { parser: new S98Parser(), repository: new S98Repository() },
  G01: { parser: new G01Parser(), repository: new G01Repository() },
  G02: { parser: new G02Parser(), repository: new G02Repository() },
  G03: { parser: new G03Parser(), repository: new G03Repository() },
  G04: { parser: new G04Parser(), repository: new G04Repository() },
  G05: { parser: new G05Parser(), repository: new G05Repository() },
  G53: { parser: new G53Parser(), repository: new G53Repository() },
  G56: { parser: new G56Parser(), repository: new G56Repository() },
  G57: { parser: new G57Parser(), repository: new G57Repository() },
  G58: { parser: new G58Parser(), repository: new G58Repository() },
  G59: { parser: new G59Parser(), repository: new G59Repository() },
  S93: { parser: new S93Parser(), repository: new S93Repository() },
  S94: { parser: new S94Parser(), repository: new S94Repository() },
  S96: { parser: new S96Parser(), repository: new S96Repository() },
  S97: { parser: new S97Parser(), repository: new S97Repository() },
  // S13: { parser: new S13Parser(), repository: new S13Repository() },
  // G03: { parser: new G03Parser(), repository: new G03Repository() },
};
