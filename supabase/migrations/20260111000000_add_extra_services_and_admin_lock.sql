-- =====================================================
-- MIGRATION: Add Extra Services + Admin Price Lock
-- =====================================================

-- 1. TABELA DE SERVIÇOS EXTRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.extra_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  service_type TEXT NOT NULL DEFAULT 'custom', -- 'fast_delivery', 'video', 'recording', 'custom'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_extra_services_photographer ON public.extra_services(photographer_id);
CREATE INDEX IF NOT EXISTS idx_extra_services_active ON public.extra_services(is_active);

-- RLS
ALTER TABLE public.extra_services ENABLE ROW LEVEL SECURITY;

-- Fotógrafos podem gerenciar seus próprios serviços
CREATE POLICY "Photographers can manage own services"
ON public.extra_services
FOR ALL
USING (photographer_id = auth.uid())
WITH CHECK (photographer_id = auth.uid());

-- Todos podem visualizar serviços ativos
CREATE POLICY "Anyone can view active services"
ON public.extra_services
FOR SELECT
USING (is_active = true);

-- Admins podem ver tudo
CREATE POLICY "Admins can manage all services"
ON public.extra_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Comentários
COMMENT ON TABLE public.extra_services IS 'Serviços extras oferecidos por fotógrafos (entrega rápida, vídeo, gravação, etc)';
COMMENT ON COLUMN public.extra_services.service_type IS 'Tipo: fast_delivery, video, recording, custom';

-- 2. TABELA DE SERVIÇOS CONTRATADOS POR COMPRA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.purchase_extra_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.extra_services(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL, -- Snapshot do nome no momento da compra
  price DECIMAL(10,2) NOT NULL, -- Snapshot do preço no momento da compra
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_purchase_extra_services_purchase ON public.purchase_extra_services(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_extra_services_service ON public.purchase_extra_services(service_id);

-- RLS
ALTER TABLE public.purchase_extra_services ENABLE ROW LEVEL SECURITY;

-- Comprador pode ver seus próprios serviços
CREATE POLICY "Buyers can view own purchase services"
ON public.purchase_extra_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchases 
    WHERE id = purchase_id AND buyer_id = auth.uid()
  )
);

-- Fotógrafos podem ver serviços de suas vendas
CREATE POLICY "Photographers can view their sales services"
ON public.purchase_extra_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchases 
    WHERE id = purchase_id AND photographer_id = auth.uid()
  )
);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all purchase services"
ON public.purchase_extra_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. ADICIONAR CAMPOS DE BLOQUEIO DE PREÇO EM CAMPAIGNS
-- =====================================================
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_price DECIMAL(10,2) DEFAULT NULL;

-- Comentários
COMMENT ON COLUMN public.campaigns.created_by_admin IS 'Se o evento foi criado por um admin';
COMMENT ON COLUMN public.campaigns.price_locked IS 'Se o preço está bloqueado para alterações';
COMMENT ON COLUMN public.campaigns.locked_price IS 'Preço fixo definido pelo admin (imutável)';

-- 4. ADICIONAR SERVIÇOS PADRÃO PARA NOVOS FOTÓGRAFOS
-- =====================================================
-- Esta função cria serviços padrão quando um fotógrafo é aprovado
CREATE OR REPLACE FUNCTION public.create_default_services_for_photographer()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas se o perfil é de fotógrafo
  IF NEW.role = 'photographer' AND (OLD.role IS NULL OR OLD.role != 'photographer') THEN
    -- Inserir serviços padrão (inativos por padrão)
    INSERT INTO public.extra_services (photographer_id, name, description, price, is_active, service_type)
    VALUES 
      (NEW.id, 'Entrega Rápida (24h)', 'Receba suas fotos em até 24 horas após o evento', 15.00, false, 'fast_delivery'),
      (NEW.id, 'Videozinho de Fotos', 'Montagem em vídeo com suas melhores fotos', 25.00, false, 'video'),
      (NEW.id, 'Gravação Pessoal', 'Gravação personalizada do atleta durante o evento', 50.00, false, 'recording')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar serviços padrão
DROP TRIGGER IF EXISTS trg_create_default_services ON public.profiles;
CREATE TRIGGER trg_create_default_services
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (NEW.role = 'photographer')
EXECUTE FUNCTION public.create_default_services_for_photographer();

-- 5. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extra_services TO authenticated;
GRANT SELECT ON public.extra_services TO anon;
GRANT SELECT, INSERT ON public.purchase_extra_services TO authenticated;
