-- Drop hardcoded CHECK constraint enforcing 7% platform if it exists
ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS check_percentage_sum_with_fixed_platform;

-- Create system_config table to store dynamic configurations (idempotent)
CREATE TABLE IF NOT EXISTS public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS and restrict to admins for all operations
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage system config" ON public.system_config;
CREATE POLICY "Admins can manage system config"
ON public.system_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Upsert platform_percentage configuration to 9%
INSERT INTO public.system_config (key, value, description)
VALUES ('platform_percentage', '{"value": 9, "min": 5, "max": 20}', 'Porcentagem da plataforma aplicada nas vendas')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Helper function to retrieve platform percentage (defaults to 9 when not configured)
CREATE OR REPLACE FUNCTION public.get_platform_percentage()
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT (value->>'value')::numeric FROM public.system_config WHERE key = 'platform_percentage'), 9);
$$;

-- Update validation trigger function to use dynamic platform percentage
CREATE OR REPLACE FUNCTION public.validate_campaign_percentages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_platform_pct numeric;
  v_available numeric;
BEGIN
  -- Fetch platform % dynamically
  v_platform_pct := public.get_platform_percentage();
  v_available := 100 - v_platform_pct;

  -- Always set platform percentage from config
  NEW.platform_percentage := v_platform_pct;

  -- If no organization is set, all available share goes to photographer
  IF NEW.organization_id IS NULL THEN
    NEW.photographer_percentage := v_available;
    NEW.organization_percentage := 0;
  ELSE
    -- If only one side provided, compute the other to match available
    IF NEW.photographer_percentage IS NULL AND NEW.organization_percentage IS NOT NULL THEN
      NEW.photographer_percentage := v_available - NEW.organization_percentage;
    ELSIF NEW.organization_percentage IS NULL AND NEW.photographer_percentage IS NOT NULL THEN
      NEW.organization_percentage := v_available - NEW.photographer_percentage;
    END IF;

    -- Validate exact sum equals available share
    IF (COALESCE(NEW.photographer_percentage, 0) + COALESCE(NEW.organization_percentage, 0)) != v_available THEN
      RAISE EXCEPTION 'A soma de fotógrafo e organização deve ser exatamente %%% (plataforma: %%%)', v_available, v_platform_pct;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on campaigns
DROP TRIGGER IF EXISTS trg_validate_campaign_percentages ON public.campaigns;
CREATE TRIGGER trg_validate_campaign_percentages
BEFORE INSERT OR UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.validate_campaign_percentages();

-- Adjust defaults on campaigns for safer inserts (9% platform, 91% photographer by default)
ALTER TABLE public.campaigns
  ALTER COLUMN platform_percentage SET DEFAULT 9,
  ALTER COLUMN photographer_percentage SET DEFAULT 91,
  ALTER COLUMN organization_percentage SET DEFAULT 0;

-- Create/refresh purchases trigger to compute revenue shares when completed
DROP TRIGGER IF EXISTS trg_calculate_revenue_shares ON public.purchases;
CREATE TRIGGER trg_calculate_revenue_shares
AFTER INSERT OR UPDATE OF status ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.calculate_revenue_shares();

-- Strengthen album deletion protection: block deleting sub_events with any completed sales
CREATE OR REPLACE FUNCTION public.prevent_album_deletion_with_pending_payouts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_prevent_album_delete ON public.sub_events;
CREATE TRIGGER trg_prevent_album_delete
BEFORE DELETE ON public.sub_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_album_deletion_with_pending_payouts();

-- Ensure photos soft-delete behavior when there are sales
CREATE OR REPLACE FUNCTION public.soft_delete_photos_with_sales()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_soft_delete_photos_with_sales ON public.photos;
CREATE TRIGGER trg_soft_delete_photos_with_sales
BEFORE DELETE ON public.photos
FOR EACH ROW
EXECUTE FUNCTION public.soft_delete_photos_with_sales();

-- Documentation comments
COMMENT ON TABLE public.revenue_shares IS 'Registro permanente de divisão de receita. Dados não devem ser excluídos mesmo se álbuns/fotos forem removidos.';