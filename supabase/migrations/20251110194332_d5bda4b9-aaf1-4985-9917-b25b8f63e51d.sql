-- Sprint 1: Corrigir Security Warnings
-- Adicionar SET search_path = 'public' em todas as funções que faltam

-- 1. update_photographer_applications_updated_at
CREATE OR REPLACE FUNCTION public.update_photographer_applications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 2. update_photo_collaborators_updated_at
CREATE OR REPLACE FUNCTION public.update_photo_collaborators_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. validate_payout_recipient
CREATE OR REPLACE FUNCTION public.validate_payout_recipient()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.pix_key IS NOT NULL AND (NEW.recipient_name IS NULL OR trim(NEW.recipient_name) = '') THEN
    RAISE EXCEPTION 'recipient_name is required when pix_key is provided';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. prevent_album_deletion_with_pending_payouts
CREATE OR REPLACE FUNCTION public.prevent_album_deletion_with_pending_payouts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  has_completed_sales boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.purchases p
    JOIN public.photos ph ON p.photo_id = ph.id
    WHERE ph.sub_event_id = OLD.id
      AND p.status = 'completed'
  ) INTO has_completed_sales;

  IF has_completed_sales THEN
    RAISE EXCEPTION 'Não é possível excluir este álbum porque há vendas registradas. O histórico financeiro deve ser preservado.';
  END IF;

  RETURN OLD;
END;
$function$;

-- 5. soft_delete_photos_with_sales
CREATE OR REPLACE FUNCTION public.soft_delete_photos_with_sales()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  has_sales boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.purchases WHERE photo_id = OLD.id AND status = 'completed'
  ) INTO has_sales;

  IF has_sales THEN
    UPDATE public.photos
    SET is_available = false, updated_at = now()
    WHERE id = OLD.id;
    RAISE EXCEPTION 'Foto com vendas não pode ser excluída. Foi marcada como indisponível.';
  END IF;

  RETURN OLD;
END;
$function$;

-- 6. campaigns_set_org_percentage
CREATE OR REPLACE FUNCTION public.campaigns_set_org_percentage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Ensure platform_percentage defaults to 7 if NULL
    IF NEW.platform_percentage IS NULL THEN
      NEW.platform_percentage := 7;
    END IF;

    -- Only calculate organization if not provided
    IF NEW.organization_percentage IS NULL THEN
      NEW.organization_percentage := 100
        - COALESCE(NEW.platform_percentage, 0)
        - COALESCE(NEW.photographer_percentage, 0);
      IF NEW.organization_percentage < 0 OR NEW.organization_percentage > 100 THEN
        RAISE EXCEPTION 'Computed organization_percentage % is out of bounds (0..100)', NEW.organization_percentage;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. validate_campaign_percentages
CREATE OR REPLACE FUNCTION public.validate_campaign_percentages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Aplicar regra de 9% APENAS para novos registros (INSERT)
  IF TG_OP = 'INSERT' THEN
    NEW.platform_percentage := 9;
    
    IF NEW.organization_id IS NULL THEN
      NEW.photographer_percentage := 91;
      NEW.organization_percentage := 0;
    ELSE
      IF NEW.photographer_percentage IS NULL THEN
        NEW.photographer_percentage := 91 - COALESCE(NEW.organization_percentage, 0);
      END IF;
      
      IF (NEW.photographer_percentage + COALESCE(NEW.organization_percentage, 0)) != 91 THEN
        RAISE EXCEPTION 'Soma fotografo + organizacao deve ser 91 (plataforma: 9)';
      END IF;
    END IF;
  END IF;
  -- Para UPDATE, não forçar mudança (permite manter 7% em campanhas antigas)
  
  RETURN NEW;
END;
$function$;

-- 8. validate_campaign_date
CREATE OR REPLACE FUNCTION public.validate_campaign_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Apenas log, sem bloquear
  -- A validação de data passada foi removida para permitir registro de eventos retroativos
  RETURN NEW;
END;
$function$;

-- 9. sync_photographer_id_from_purchase
CREATE OR REPLACE FUNCTION public.sync_photographer_id_from_purchase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  correct_photographer_id UUID;
BEGIN
  -- Buscar photographer_id da purchase
  SELECT photographer_id INTO correct_photographer_id
  FROM purchases
  WHERE id = NEW.purchase_id;
  
  IF correct_photographer_id IS NULL THEN
    RAISE EXCEPTION 'Purchase % não tem photographer_id definido', NEW.purchase_id;
  END IF;
  
  -- Sempre sobrescrever com o ID correto da purchase
  NEW.photographer_id := correct_photographer_id;
  
  RETURN NEW;
END;
$function$;