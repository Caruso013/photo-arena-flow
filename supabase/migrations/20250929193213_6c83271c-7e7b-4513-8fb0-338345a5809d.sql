-- FASE 4: MELHORIAS DE PERFORMANCE E AUDITORIA

-- 1. Criar índices para melhorar performance de queries comuns
-- Índices para foreign keys frequentemente consultados
CREATE INDEX IF NOT EXISTS idx_campaigns_photographer_id 
ON public.campaigns(photographer_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id 
ON public.campaigns(organization_id);

CREATE INDEX IF NOT EXISTS idx_photos_campaign_id 
ON public.photos(campaign_id);

CREATE INDEX IF NOT EXISTS idx_photos_photographer_id 
ON public.photos(photographer_id);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id 
ON public.purchases(buyer_id);

CREATE INDEX IF NOT EXISTS idx_purchases_photographer_id 
ON public.purchases(photographer_id);

CREATE INDEX IF NOT EXISTS idx_purchases_photo_id 
ON public.purchases(photo_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id 
ON public.organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id 
ON public.organization_members(organization_id);

-- Índices compostos para queries de filtro comum
CREATE INDEX IF NOT EXISTS idx_campaigns_active_date 
ON public.campaigns(is_active, event_date) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_photos_available 
ON public.photos(is_available, campaign_id) 
WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_organization_members_active 
ON public.organization_members(organization_id, is_active, role) 
WHERE is_active = true;

-- Índices para ordenação por data
CREATE INDEX IF NOT EXISTS idx_purchases_created_at 
ON public.purchases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payout_requests_created_at 
ON public.payout_requests(requested_at DESC);

-- 2. Criar função de auditoria para mudanças importantes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins can view audit logs" 
ON public.audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

-- Aplicar trigger de auditoria em tabelas críticas
CREATE TRIGGER audit_payout_requests
AFTER INSERT OR UPDATE OR DELETE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_purchases
AFTER INSERT OR UPDATE OR DELETE ON public.purchases
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_revenue_shares
AFTER INSERT OR UPDATE OR DELETE ON public.revenue_shares
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 3. Adicionar comentários de documentação
COMMENT ON TABLE public.audit_log IS 
'Tabela de auditoria para rastrear mudanças em dados críticos';

COMMENT ON FUNCTION public.audit_trigger_func IS 
'Função genérica para registrar mudanças em tabelas auditadas';

COMMENT ON INDEX idx_campaigns_active_date IS 
'Índice para melhorar performance de queries de campanhas ativas ordenadas por data';

COMMENT ON INDEX idx_photos_available IS 
'Índice para melhorar performance de queries de fotos disponíveis por campanha';