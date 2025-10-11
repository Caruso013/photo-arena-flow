-- ============================================
-- MIGRAÇÃO COMPLETA: Sistema Evento → Fotógrafo → Álbuns
-- ============================================

-- 1. ATUALIZAR RLS DE PHOTOS - Restringir upload apenas para fotógrafos atribuídos
-- ============================================

-- Remover política antiga que permite qualquer fotógrafo
DROP POLICY IF EXISTS "Photographers can manage own photos" ON public.photos;

-- Nova política: Fotógrafos só podem inserir fotos em eventos onde estão atribuídos
CREATE POLICY "Photographers can insert photos only in assigned campaigns"
ON public.photos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaign_photographers
    WHERE campaign_photographers.campaign_id = photos.campaign_id
      AND campaign_photographers.photographer_id = auth.uid()
      AND campaign_photographers.is_active = true
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);

-- Fotógrafos podem ver, editar e deletar APENAS suas próprias fotos
CREATE POLICY "Photographers can manage their own photos"
ON public.photos
FOR ALL
USING (
  auth.uid() = photographer_id 
  AND has_role(auth.uid(), 'photographer'::user_role)
);

-- 2. ATUALIZAR RLS DE SUB_EVENTS - Permitir criação de pastas ANTES do upload
-- ============================================

-- Remover políticas antigas que exigiam fotos prévias
DROP POLICY IF EXISTS "Photographers can create albums in their campaigns" ON public.sub_events;
DROP POLICY IF EXISTS "Photographers can update their campaign albums" ON public.sub_events;
DROP POLICY IF EXISTS "Photographers can delete their campaign albums" ON public.sub_events;

-- Nova política: Fotógrafos podem criar álbuns em eventos onde estão atribuídos
-- (não precisam ter fotos ainda)
CREATE POLICY "Photographers can create albums in assigned campaigns"
ON public.sub_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaign_photographers
    WHERE campaign_photographers.campaign_id = sub_events.campaign_id
      AND campaign_photographers.photographer_id = auth.uid()
      AND campaign_photographers.is_active = true
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);

-- Fotógrafos podem atualizar álbuns em eventos onde estão atribuídos
CREATE POLICY "Photographers can update albums in assigned campaigns"
ON public.sub_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_photographers
    WHERE campaign_photographers.campaign_id = sub_events.campaign_id
      AND campaign_photographers.photographer_id = auth.uid()
      AND campaign_photographers.is_active = true
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);

-- Fotógrafos podem deletar álbuns em eventos onde estão atribuídos
CREATE POLICY "Photographers can delete albums in assigned campaigns"
ON public.sub_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_photographers
    WHERE campaign_photographers.campaign_id = sub_events.campaign_id
      AND campaign_photographers.photographer_id = auth.uid()
      AND campaign_photographers.is_active = true
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);