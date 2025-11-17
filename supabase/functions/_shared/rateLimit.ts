// @ts-nocheck - Deno Edge Function shared utility
/**
 * Server-side Rate Limiting for Supabase Edge Functions
 * 
 * Uses Supabase database to store rate limit counters
 * More reliable than memory-based rate limiting
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Verifica rate limit usando banco de dados
 * @param supabase - Cliente Supabase (service role)
 * @param identifier - Identificador único (user_id, IP, email, etc)
 * @param config - Configuração do rate limit
 * @returns Resultado da verificação
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Buscar requisições recentes
    const { data: recentRequests, error } = await supabase
      .from('rate_limit_requests')
      .select('*')
      .eq('key', key)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking rate limit:', error);
      // Em caso de erro, permitir a requisição
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }

    const requestCount = recentRequests?.length || 0;

    // Se excedeu o limite
    if (requestCount >= config.maxRequests) {
      const oldestRequest = recentRequests[recentRequests.length - 1];
      const resetAt = new Date(
        new Date(oldestRequest.created_at).getTime() + config.windowMs
      );

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Registrar nova requisição
    await supabase.from('rate_limit_requests').insert({
      key,
      created_at: now.toISOString(),
    });

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Em caso de erro, permitir a requisição
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }
}

/**
 * Limpa requisições antigas (executar periodicamente)
 * @param supabase - Cliente Supabase (service role)
 * @param olderThanMs - Deletar requisições mais antigas que X ms
 */
export async function cleanupOldRequests(
  supabase: SupabaseClient,
  olderThanMs: number = 3600000 // 1 hora por padrão
): Promise<void> {
  const cutoffDate = new Date(Date.now() - olderThanMs);

  try {
    await supabase
      .from('rate_limit_requests')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
  } catch (error) {
    console.error('Error cleaning up rate limit data:', error);
  }
}

// Configurações pré-definidas
export const RATE_LIMITS = {
  payment: {
    maxRequests: 3,
    windowMs: 60000, // 1 minuto
    keyPrefix: 'payment',
  },
  email: {
    maxRequests: 5,
    windowMs: 60000, // 1 minuto
    keyPrefix: 'email',
  },
  webhook: {
    maxRequests: 20,
    windowMs: 60000, // 1 minuto (webhooks podem vir múltiplas vezes)
    keyPrefix: 'webhook',
  },
  encryption: {
    maxRequests: 10,
    windowMs: 60000, // 1 minuto
    keyPrefix: 'encryption',
  },
};

/**
 * Middleware para adicionar rate limiting a Edge Functions
 * 
 * Exemplo de uso:
 * ```typescript
 * serve(async (req) => {
 *   if (req.method === 'OPTIONS') {
 *     return new Response('ok', { headers: corsHeaders });
 *   }
 * 
 *   const supabase = createClient(...);
 *   const userId = await getUserId(req);
 *   
 *   const rateLimit = await checkRateLimit(
 *     supabase,
 *     userId,
 *     RATE_LIMITS.payment
 *   );
 *   
 *   if (!rateLimit.allowed) {
 *     return new Response(
 *       JSON.stringify({
 *         error: 'Too many requests',
 *         resetAt: rateLimit.resetAt,
 *       }),
 *       {
 *         status: 429,
 *         headers: {
 *           ...corsHeaders,
 *           'X-RateLimit-Remaining': '0',
 *           'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
 *         },
 *       }
 *     );
 *   }
 *   
 *   // Continuar com a requisição...
 * });
 * ```
 */
