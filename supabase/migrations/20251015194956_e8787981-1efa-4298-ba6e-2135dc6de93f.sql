-- ============================================
-- Fix: Fotógrafos podem criar eventos
-- ============================================

-- 1. Garantir que fotógrafos podem criar campanhas
-- A política já existe, mas vamos recriar para garantir

DROP POLICY IF EXISTS "Admins and photographers can create campaigns" ON public.campaigns;

CREATE POLICY "Admins and photographers can create campaigns"
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role) 
  OR 
  has_role(auth.uid(), 'photographer'::user_role)
);

-- 2. Garantir que o trigger de auto-assign funciona
-- Recriar a função para garantir que está correta

CREATE OR REPLACE FUNCTION public.auto_assign_photographer_to_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas auto-atribuir se o criador for fotógrafo
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.photographer_id
    AND role = 'photographer'::user_role
  ) THEN
    -- Inserir em campaign_photographers
    INSERT INTO public.campaign_photographers (
      campaign_id,
      photographer_id,
      assigned_by,
      is_active
    )
    VALUES (
      NEW.id,
      NEW.photographer_id,
      NEW.photographer_id, -- Auto-atribuído
      true
    )
    ON CONFLICT (campaign_id, photographer_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger se não existir
DROP TRIGGER IF EXISTS trg_auto_assign_photographer ON public.campaigns;

CREATE TRIGGER trg_auto_assign_photographer
AFTER INSERT ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_photographer_to_campaign();

-- 3. Garantir que fotógrafos podem criar sub_events (álbuns) em suas campanhas
DROP POLICY IF EXISTS "Photographers can create albums in assigned campaigns" ON public.sub_events;

CREATE POLICY "Photographers can create albums in assigned campaigns"
ON public.sub_events
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1
      FROM public.campaign_photographers
      WHERE campaign_photographers.campaign_id = sub_events.campaign_id
        AND campaign_photographers.photographer_id = auth.uid()
        AND campaign_photographers.is_active = true
    )
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);

-- 4. Garantir que fotógrafos podem criar fotos em campanhas atribuídas
DROP POLICY IF EXISTS "Photographers can insert photos only in assigned campaigns" ON public.photos;

CREATE POLICY "Photographers can insert photos only in assigned campaigns"
ON public.photos
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1
      FROM public.campaign_photographers
      WHERE campaign_photographers.campaign_id = photos.campaign_id
        AND campaign_photographers.photographer_id = auth.uid()
        AND campaign_photographers.is_active = true
    )
  )
  AND has_role(auth.uid(), 'photographer'::user_role)
);