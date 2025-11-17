-- Migration: Server-side Rate Limiting
-- Data: 2025-11-17
-- Descrição: Tabela para armazenar contadores de rate limiting das Edge Functions

CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_rate_limit_key ON public.rate_limit_requests(key);
CREATE INDEX idx_rate_limit_created_at ON public.rate_limit_requests(created_at);
CREATE INDEX idx_rate_limit_key_created ON public.rate_limit_requests(key, created_at DESC);

-- Função para limpeza automática (executar via cron)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Deletar requisições com mais de 1 hora
  DELETE FROM public.rate_limit_requests
  WHERE created_at < now() - interval '1 hour';
END;
$$;

COMMENT ON TABLE public.rate_limit_requests IS 'Registra requisições para rate limiting das Edge Functions';
COMMENT ON FUNCTION public.cleanup_rate_limit_requests() IS 'Limpa requisições antigas (> 1 hora) para economizar espaço';

-- Grant para service role (Edge Functions usam service role)
GRANT ALL ON public.rate_limit_requests TO service_role;
