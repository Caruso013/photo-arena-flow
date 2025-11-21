-- Criar tabela de metas dos fotógrafos
CREATE TABLE IF NOT EXISTS public.photographer_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- Mês de referência (YYYY-MM-01)
  
  -- Metas
  sales_target NUMERIC DEFAULT 0 CHECK (sales_target >= 0),
  photos_target INTEGER DEFAULT 0 CHECK (photos_target >= 0),
  events_target INTEGER DEFAULT 0 CHECK (events_target >= 0),
  
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(photographer_id, month)
);

-- Índice para buscas rápidas
CREATE INDEX idx_photographer_goals_photographer_month ON public.photographer_goals(photographer_id, month DESC);

-- RLS Policies
ALTER TABLE public.photographer_goals ENABLE ROW LEVEL SECURITY;

-- Fotógrafos podem ver suas próprias metas
CREATE POLICY "Photographers can view own goals"
  ON public.photographer_goals
  FOR SELECT
  USING (auth.uid() = photographer_id);

-- Fotógrafos podem criar suas próprias metas
CREATE POLICY "Photographers can create own goals"
  ON public.photographer_goals
  FOR INSERT
  WITH CHECK (auth.uid() = photographer_id);

-- Fotógrafos podem atualizar suas próprias metas
CREATE POLICY "Photographers can update own goals"
  ON public.photographer_goals
  FOR UPDATE
  USING (auth.uid() = photographer_id);

-- Fotógrafos podem deletar suas próprias metas
CREATE POLICY "Photographers can delete own goals"
  ON public.photographer_goals
  FOR DELETE
  USING (auth.uid() = photographer_id);

-- Admins podem ver todas as metas
CREATE POLICY "Admins can view all goals"
  ON public.photographer_goals
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_photographer_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photographer_goals_updated_at
  BEFORE UPDATE ON public.photographer_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_photographer_goals_updated_at();