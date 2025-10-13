-- Criar tabela para colaboradores de fotos
-- Permite que fotógrafos adicionem colaboradores ao fazer upload

CREATE TABLE IF NOT EXISTS public.photo_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  added_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Evitar duplicação: mesma foto + colaborador
  UNIQUE(photo_id, collaborator_id)
);

-- Índices para performance
CREATE INDEX idx_photo_collaborators_photo_id ON public.photo_collaborators(photo_id);
CREATE INDEX idx_photo_collaborators_collaborator_id ON public.photo_collaborators(collaborator_id);

-- RLS Policies
ALTER TABLE public.photo_collaborators ENABLE ROW LEVEL SECURITY;

-- Fotógrafos podem ver colaboradores das suas fotos
CREATE POLICY "Photographers can view own photo collaborators"
ON public.photo_collaborators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.photos
    WHERE photos.id = photo_collaborators.photo_id
    AND photos.photographer_id = auth.uid()
  )
);

-- Colaboradores podem ver suas próprias colaborações
CREATE POLICY "Collaborators can view their collaborations"
ON public.photo_collaborators
FOR SELECT
USING (collaborator_id = auth.uid());

-- Fotógrafos podem adicionar colaboradores às suas fotos
CREATE POLICY "Photographers can add collaborators to own photos"
ON public.photo_collaborators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.photos
    WHERE photos.id = photo_collaborators.photo_id
    AND photos.photographer_id = auth.uid()
  )
);

-- Fotógrafos podem atualizar colaboradores das suas fotos
CREATE POLICY "Photographers can update own photo collaborators"
ON public.photo_collaborators
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.photos
    WHERE photos.id = photo_collaborators.photo_id
    AND photos.photographer_id = auth.uid()
  )
);

-- Fotógrafos podem remover colaboradores das suas fotos
CREATE POLICY "Photographers can delete own photo collaborators"
ON public.photo_collaborators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.photos
    WHERE photos.id = photo_collaborators.photo_id
    AND photos.photographer_id = auth.uid()
  )
);

-- Admins têm acesso total
CREATE POLICY "Admins can manage all collaborators"
ON public.photo_collaborators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_photo_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photo_collaborators_updated_at
BEFORE UPDATE ON public.photo_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_photo_collaborators_updated_at();

-- Comentários
COMMENT ON TABLE public.photo_collaborators IS 'Colaboradores de fotos - sistema de divisão de créditos entre fotógrafos';
COMMENT ON COLUMN public.photo_collaborators.percentage IS 'Percentual do crédito/receita que este colaborador receberá (0-100)';
COMMENT ON COLUMN public.photo_collaborators.added_by IS 'Fotógrafo que adicionou este colaborador';
