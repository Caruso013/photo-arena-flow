-- Add payout recipient fields: pix_key, recipient_name, institution
ALTER TABLE public.payout_requests
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS institution TEXT;

-- Optional: ensure recipient_name is not empty when pix_key is present
CREATE OR REPLACE FUNCTION public.validate_payout_recipient()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pix_key IS NOT NULL AND (NEW.recipient_name IS NULL OR trim(NEW.recipient_name) = '') THEN
    RAISE EXCEPTION 'recipient_name is required when pix_key is provided';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_payout_recipient_trigger ON public.payout_requests;
CREATE TRIGGER validate_payout_recipient_trigger
BEFORE INSERT OR UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_payout_recipient();
