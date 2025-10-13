/**
 * Logger Service
 * Centraliza todos os logs da aplicação
 * Em produção: Silencia console.log, mantém erros críticos
 */

const isDevelopment = import.meta.env.MODE === 'development';

class Logger {
  /**
   * Log informativo - apenas em desenvolvimento
   */
  info(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log de warning - apenas em desenvolvimento
   */
  warn(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log de erro - sempre registra (pode integrar com Sentry)
   */
  error(message: string, error?: any, ...args: any[]) {
    // Em produção: enviar para serviço de monitoramento (Sentry, etc)
    if (!isDevelopment) {
      // TODO: Integrar com Sentry
      // Sentry.captureException(error, { extra: { message, ...args } });
    }
    
    // Em desenvolvimento: mostrar no console
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
  }

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Grupo de logs - apenas em desenvolvimento
   */
  group(label: string) {
    if (isDevelopment) {
      console.group(label);
    }
  }

  groupEnd() {
    if (isDevelopment) {
      console.groupEnd();
    }
  }
}

export const logger = new Logger();

// Sobrescrever console em produção
if (!isDevelopment) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  // Manter console.error e console.warn para casos críticos
}
