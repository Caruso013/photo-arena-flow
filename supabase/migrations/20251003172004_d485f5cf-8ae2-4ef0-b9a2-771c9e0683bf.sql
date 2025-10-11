-- Permitir que fotógrafos criem álbuns em campanhas onde têm fotos
-- Remover política antiga que só permitia para donos de campanhas
DROP POLICY IF EXISTS "Photographers can manage sub events for own campaigns" ON public.sub_events;

-- Nova política: Fotógrafos podem criar e gerenciar álbuns em eventos onde já fizeram upload
CREATE POLICY "Photographers can create albums in their campaigns"
ON public.sub_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.photos
    WHERE photos.campaign_id = sub_events.campaign_id
      AND photos.photographer_id = auth.uid()
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);

CREATE POLICY "Photographers can update their campaign albums"
ON public.sub_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.photos
    WHERE photos.campaign_id = sub_events.campaign_id
      AND photos.photographer_id = auth.uid()
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);

CREATE POLICY "Photographers can delete their campaign albums"
ON public.sub_events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.photos
    WHERE photos.campaign_id = sub_events.campaign_id
      AND photos.photographer_id = auth.uid()
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);