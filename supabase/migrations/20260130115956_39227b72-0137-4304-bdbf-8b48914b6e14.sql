-- =============================================
-- SISTEMA DE QR CODE PARA VALIDAÇÃO DE FOTÓGRAFOS
-- =============================================

-- Tabela 1: Sessões de Mesários (login temporário 24h)
CREATE TABLE public.mesario_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL UNIQUE,
  mesario_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela 2: Tokens QR dos Fotógrafos
CREATE TABLE public.photographer_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela 3: Registro de Presença em Eventos
CREATE TABLE public.event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed_by UUID REFERENCES public.mesario_sessions(id),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, photographer_id)
);

-- Índices para performance
CREATE INDEX idx_mesario_sessions_access_code ON public.mesario_sessions(access_code);
CREATE INDEX idx_mesario_sessions_campaign ON public.mesario_sessions(campaign_id);
CREATE INDEX idx_mesario_sessions_expires ON public.mesario_sessions(expires_at);
CREATE INDEX idx_photographer_qr_tokens_photographer ON public.photographer_qr_tokens(photographer_id);
CREATE INDEX idx_event_attendance_campaign ON public.event_attendance(campaign_id);
CREATE INDEX idx_event_attendance_photographer ON public.event_attendance(photographer_id);

-- Habilitar RLS
ALTER TABLE public.mesario_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photographer_qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - mesario_sessions
-- =============================================

-- Admins podem gerenciar todas as sessões
CREATE POLICY "Admins can manage all mesario sessions"
ON public.mesario_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Organizações podem criar e ver sessões de seus eventos
CREATE POLICY "Organizations can manage their mesario sessions"
ON public.mesario_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = mesario_sessions.campaign_id
    AND c.organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = mesario_sessions.campaign_id
    AND c.organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  )
);

-- Leitura pública para validação (necessário para edge functions)
CREATE POLICY "Public read for validation"
ON public.mesario_sessions FOR SELECT
USING (is_active = true AND expires_at > now());

-- =============================================
-- RLS POLICIES - photographer_qr_tokens
-- =============================================

-- Admins podem ver todos os tokens
CREATE POLICY "Admins can view all qr tokens"
ON public.photographer_qr_tokens FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Fotógrafos podem ver/gerenciar seu próprio token
CREATE POLICY "Photographers can manage own qr token"
ON public.photographer_qr_tokens FOR ALL
USING (auth.uid() = photographer_id)
WITH CHECK (auth.uid() = photographer_id);

-- =============================================
-- RLS POLICIES - event_attendance
-- =============================================

-- Admins podem ver todas as presenças
CREATE POLICY "Admins can view all attendance"
ON public.event_attendance FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Organizações podem ver presenças de seus eventos
CREATE POLICY "Organizations can view their event attendance"
ON public.event_attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = event_attendance.campaign_id
    AND c.organization_id IN (
      SELECT organization_id FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  )
);

-- Fotógrafos podem ver suas próprias presenças
CREATE POLICY "Photographers can view own attendance"
ON public.event_attendance FOR SELECT
USING (auth.uid() = photographer_id);

-- Inserção via service role (edge functions)
CREATE POLICY "Service role can insert attendance"
ON public.event_attendance FOR INSERT
WITH CHECK (true);

-- =============================================
-- FUNÇÃO: Gerar código de acesso para mesário
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_mesario_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  done BOOLEAN;
BEGIN
  done := FALSE;
  WHILE NOT done LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.mesario_sessions WHERE access_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- =============================================
-- TRIGGER: Atualizar updated_at em photographer_qr_tokens
-- =============================================
CREATE OR REPLACE FUNCTION public.update_photographer_qr_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_photographer_qr_tokens_updated_at
BEFORE UPDATE ON public.photographer_qr_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_photographer_qr_tokens_updated_at();

-- =============================================
-- TRIGGER: Auto-desativar sessões expiradas
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_deactivate_expired_mesario_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.mesario_sessions
  SET is_active = false
  WHERE is_active = true AND expires_at < now();
  RETURN NEW;
END;
$$;