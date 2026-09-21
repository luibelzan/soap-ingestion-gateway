import { TKeys } from '../entities/TKeys';
import { Logger } from '../utils/logger';

const logger = new Logger('B32Builder');

export interface B32OrderData {
  idReq: string;
  idPet: number;
  version: string;
  cncId: string;
  cntId: string;
  keys: TKeys;
}

export class B32Builder {
  /**
   * Construye el XML SOAP para una orden B32
   */
  static buildB32Order(data: B32OrderData): string {
    const { idReq, idPet, version, cncId, cntId, keys } = data;

    logger.info(`Building B32 order for CNT: ${cntId}, CNC: ${cncId}`);

    // Construir el XML B32 interno sin escapar
    const b32XmlRaw = `<Order xmlns="http://stgdc/ws/B32" IdReq="${idReq}" IdPet="${idPet}" Version="${version}">
                <Cnc Id="${cncId}">
                <Cnt Id="${cntId}">
                <B32>
                <MasterKey KeyId="${keys.master_key_id}" KeyWrap="${keys.masterkey_wrap}"/>
                <LocalDASec ClientId="${keys.local_1_client_id}" Secret="${keys.local_1_secret}"/>
                <LocalDASec ClientId="${keys.local_2_client_id}" Secret="${keys.local_2_secret}"/>
                <RemoteDASec ClientId="${keys.remote_client_id}" FactorySecret="${keys.remote_factory_secret}" Secret="${keys.remote_secret}">
                <CDTSec KeyId="${keys.gun_key_id}" KeyType="GUnKey" KeyWrap="${keys.gun_key_wrap}" KeyVal="${keys.gun_key_val}"/>
                <CDTSec KeyId="${keys.gau_key_id}" KeyType="GAuKey" KeyWrap="${keys.gau_key_wrap}" KeyVal="${keys.gau_key_val}"/>
                </RemoteDASec>
                </B32>
                </Cnt>
                </Cnc>
                </Order>`;

    // Escapar el XML B32 para incluirlo en el SOAP
    const b32XmlEscaped = b32XmlRaw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // SOAP Envelope con formato final
    const soapEnvelope = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns="http://www.asais.fr/ns/Saturne/DC/ws">
    <soap:Body>
        <Order>
            <IdPet>${idPet}</IdPet>
            <Format>0</Format>
            <Order>
                ${b32XmlEscaped}
            </Order>
            <Fini></Fini>
            <Ffin></Ffin>
            <Priority>0</Priority>
        </Order>
    </soap:Body>
</soap:Envelope>`;

    return soapEnvelope;
  }

  /**
   * Construye el XML SOAP para una orden B31
   */
  static buildB31Order(data: B32OrderData): string {
    const { idReq, idPet, version, cncId, cntId, keys } = data;

    logger.info(`Building B31 order for CNT: ${cntId}, CNC: ${cncId}`);

    // Construir el XML B31 interno con CntId como atributo de B31
    const b31XmlRaw = `<Order xmlns="http://stgdc/ws/B31" IdReq="${idReq}" IdPet="${idPet}" Version="${version}">
                <Cnc Id="${cncId}">
                <B31 CntId="${cntId}">
                <DASec ClientId="${keys.remote_client_id}" Secret="${keys.remote_secret}">
                <CDTSec KeyId="${keys.gun_key_id}" KeyType="GUnKey" KeyVal="${keys.gun_key_val}"/>
                <CDTSec KeyId="${keys.gau_key_id}" KeyType="GAuKey" KeyVal="${keys.gau_key_val}"/>
                </DASec>
                </B31>
                </Cnc>
                </Order>`;

    // Escapar el XML B31 para incluirlo en el SOAP
    const b31XmlEscaped = b31XmlRaw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // SOAP Envelope con formato final
    const soapEnvelope = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns="http://www.asais.fr/ns/Saturne/DC/ws">
    <soap:Body>
        <Order>
            <IdPet>${idPet}</IdPet>
            <Format>0</Format>
            <Order>
                ${b31XmlEscaped}
            </Order>
            <Fini></Fini>
            <Ffin></Ffin>
            <Priority>1</Priority>
        </Order>
    </soap:Body>
</soap:Envelope>`;

    return soapEnvelope;
  }

  /**
   * Valida que los datos de claves estén completos para B32
   */
  static validateKeys(keys: TKeys): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!keys.master_key_id) errors.push('master_key_id is missing');
    if (!keys.masterkey_wrap) errors.push('masterkey_wrap is missing');
    if (!keys.local_1_client_id) errors.push('local_1_client_id is missing');
    if (!keys.local_1_secret) errors.push('local_1_secret is missing');
    if (!keys.local_2_client_id) errors.push('local_2_client_id is missing');
    if (!keys.local_2_secret) errors.push('local_2_secret is missing');
    if (!keys.remote_client_id) errors.push('remote_client_id is missing');
    if (!keys.remote_secret) errors.push('remote_secret is missing');
    if (!keys.remote_factory_secret) errors.push('remote_factory_secret is missing');
    if (!keys.gun_key_id) errors.push('gun_key_id is missing');
    if (!keys.gun_key_wrap) errors.push('gun_key_wrap is missing');
    if (!keys.gun_key_val) errors.push('gun_key_val is missing');
    if (!keys.gau_key_id) errors.push('gau_key_id is missing');
    if (!keys.gau_key_wrap) errors.push('gau_key_wrap is missing');
    if (!keys.gau_key_val) errors.push('gau_key_val is missing');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida que los datos de claves estén completos para B31
   */
  static validateKeysB31(keys: TKeys): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!keys.remote_client_id) errors.push('remote_client_id is missing');
    if (!keys.remote_secret) errors.push('remote_secret is missing');
    if (!keys.gun_key_id) errors.push('gun_key_id is missing');
    if (!keys.gun_key_val) errors.push('gun_key_val is missing');
    if (!keys.gau_key_id) errors.push('gau_key_id is missing');
    if (!keys.gau_key_val) errors.push('gau_key_val is missing');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}