/**
 * Sistema de Rate Limiting no cliente
 * Previne spam de requisições e múltiplos cliques
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestLog {
  timestamps: number[];
}

// Storage em memória (reseta ao recarregar página)
const requestLogs = new Map<string, RequestLog>();

// Configurações padrão
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  email: { maxRequests: 3, windowMs: 60000 }, // 3 emails por minuto
  payment: { maxRequests: 1, windowMs: 30000 }, // 1 pagamento a cada 30s
  upload: { maxRequests: 10, windowMs: 60000 }, // 10 uploads por minuto
  faceRecognition: { maxRequests: 5, windowMs: 300000 }, // 5 buscas a cada 5min
  default: { maxRequests: 10, windowMs: 60000 }, // Padrão: 10 req/min
};

/**
 * Verifica se requisição está dentro do rate limit
 */
export const checkRateLimit = (
  key: string,
  type: keyof typeof DEFAULT_CONFIGS = 'default'
): { allowed: boolean; retryAfter?: number } => {
  const config = DEFAULT_CONFIGS[type] || DEFAULT_CONFIGS.default;
  const now = Date.now();

  // Obter ou criar log de requisições
  let log = requestLogs.get(key);
  if (!log) {
    log = { timestamps: [] };
    requestLogs.set(key, log);
  }

  // Filtrar apenas requisições dentro da janela de tempo
  log.timestamps = log.timestamps.filter(
    (timestamp) => now - timestamp < config.windowMs
  );

  // Verificar se excedeu o limite
  if (log.timestamps.length >= config.maxRequests) {
    const oldestRequest = Math.min(...log.timestamps);
    const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);
    
    return {
      allowed: false,
      retryAfter,
    };
  }

  // Adicionar timestamp atual
  log.timestamps.push(now);

  return { allowed: true };
};

/**
 * Limpa rate limit de uma chave específica
 */
export const clearRateLimit = (key: string): void => {
  requestLogs.delete(key);
};

/**
 * Limpa todos os rate limits
 */
export const clearAllRateLimits = (): void => {
  requestLogs.clear();
};

/**
 * Decorator/wrapper para funções com rate limit
 */
export const withRateLimit = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  type: keyof typeof DEFAULT_CONFIGS = 'default'
): T => {
  return (async (...args: any[]) => {
    const check = checkRateLimit(key, type);

    if (!check.allowed) {
      throw new Error(
        `Muitas requisições. Aguarde ${check.retryAfter} segundos.`
      );
    }

    return await fn(...args);
  }) as T;
};

/**
 * Hook React para rate limiting
 */
export const useRateLimit = () => {
  return {
    checkRateLimit,
    clearRateLimit,
    clearAllRateLimits,
  };
};
