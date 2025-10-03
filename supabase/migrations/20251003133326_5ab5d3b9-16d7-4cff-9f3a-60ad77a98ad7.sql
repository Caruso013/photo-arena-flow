-- Criar tabela para relacionamento N:N entre eventos e fotógrafos
CREATE TABLE IF NOT EXISTS public.campaign_photographers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(campaign_id, photographer_id)
);

-- Habilitar RLS
ALTER TABLE public.campaign_photographers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage campaign photographers"
ON public.campaign_photographers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Photographers can view their assignments"
ON public.campaign_photographers
FOR SELECT
USING (
  auth.uid() = photographer_id
);

CREATE POLICY "Anyone can view active assignments"
ON public.campaign_photographers
FOR SELECT
USING (is_active = true);

-- Índices para performance
CREATE INDEX idx_campaign_photographers_campaign_id ON public.campaign_photographers(campaign_id);
CREATE INDEX idx_campaign_photographers_photographer_id ON public.campaign_photographers(photographer_id);