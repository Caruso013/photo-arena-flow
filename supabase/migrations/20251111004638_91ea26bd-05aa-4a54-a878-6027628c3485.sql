-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, photo_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_photo ON public.favorites(photo_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON public.favorites(created_at DESC);

-- RLS Policies
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios favoritos
CREATE POLICY "Users can view own favorites"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem adicionar favoritos
CREATE POLICY "Users can add favorites"
  ON public.favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem remover favoritos
CREATE POLICY "Users can remove favorites"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins podem ver todos os favoritos
CREATE POLICY "Admins can view all favorites"
  ON public.favorites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.favorites IS 'Fotos favoritadas pelos usuários';