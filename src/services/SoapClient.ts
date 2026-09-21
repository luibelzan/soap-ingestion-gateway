import axios, { AxiosError } from 'axios';
import { Logger } from '../utils/logger';

const logger = new Logger('SoapClient');

export interface SoapResponse {
  success: boolean;
  statusCode?: number;
  data?: string;
  error?: string;
}

export class SoapClient {
  /**
   * Envía una orden SOAP a un endpoint específico
   */
  static async sendOrder(
    endpoint: string,
    xmlPayload: string,
    timeout: number = 30000
  ): Promise<SoapResponse> {
    logger.info(`Sending SOAP order to: ${endpoint}`);

    try {
      const response = await axios.post(endpoint, xmlPayload, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '"http://www.asais.fr/ns/Saturne/DC/ws/Order"'
        },
        timeout,
        validateStatus: () => true // No lanzar error en códigos de estado HTTP
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`SOAP order sent successfully to ${endpoint}, status: ${response.status}`);
        return {
          success: true,
          statusCode: response.status,
          data: response.data
        };
      } else {
        logger.warn(`SOAP order failed with status ${response.status} for ${endpoint}`);
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNREFUSED') {
        logger.error(`Connection refused to ${endpoint}`);
        return {
          success: false,
          error: 'Connection refused - Concentrator may be offline'
        };
      }
      
      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        logger.error(`Timeout connecting to ${endpoint}`);
        return {
          success: false,
          error: 'Connection timeout'
        };
      }

      logger.error(`Error sending SOAP order to ${endpoint}:`, error);
      return {
        success: false,
        error: axiosError.message || 'Unknown error'
      };
    }
  }

  /**
   * Valida que un endpoint tenga formato correcto
   */
  static validateEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
