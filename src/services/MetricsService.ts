import { performance } from 'perf_hooks';
import { Logger } from '../utils/logger';

const logger = new Logger('Metrics');

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: any;
}

export class MetricsService {
  private static metrics: PerformanceMetrics[] = [];
  private static maxMetrics = 1000; // Mantener últimas 1000 métricas

  /**
   * Mide el tiempo de ejecución de una operación
   */
  static async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const start = performance.now();
    let success = true;
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - start;
      
      this.recordMetric({
        operation,
        duration,
        timestamp: new Date(),
        success,
        metadata
      });

      if (duration > 1000) {
        logger.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Registra una métrica
   */
  private static recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Mantener solo las últimas N métricas
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Obtiene estadísticas de rendimiento
   */
  static getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
  } {
    let filtered = this.metrics;
    
    if (operation) {
      filtered = this.metrics.filter(m => m.operation === operation);
    }

    if (filtered.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0
      };
    }

    const durations = filtered.map(m => m.duration);
    const successes = filtered.filter(m => m.success).length;

    return {
      count: filtered.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successes / filtered.length) * 100
    };
  }

  /**
   * Obtiene todas las operaciones registradas
   */
  static getOperations(): string[] {
    const operations = new Set(this.metrics.map(m => m.operation));
    return Array.from(operations);
  }

  /**
   * Limpia las métricas
   */
  static clear(): void {
    this.metrics = [];
  }

  /**
   * Obtiene métricas recientes
   */
  static getRecent(limit: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }
}
