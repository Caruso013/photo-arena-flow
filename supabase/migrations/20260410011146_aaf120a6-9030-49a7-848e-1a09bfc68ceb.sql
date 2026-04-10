
-- Update validate function to use extensions schema
CREATE OR REPLACE FUNCTION public.validate_mesario_credentials(p_username text, p_password text)
 RETURNS TABLE(mesario_id uuid, mesario_name text, org_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT ma.id, ma.full_name, ma.organization_id
  FROM public.mesario_accounts ma
  WHERE ma.username = lower(trim(p_username))
    AND ma.password_hash = crypt(p_password, ma.password_hash)
    AND ma.is_active = true;
END;
$function$;

-- Update hash trigger to use extensions schema
CREATE OR REPLACE FUNCTION public.hash_mesario_password()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash NOT LIKE '$2%' THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS hash_mesario_password_trigger ON public.mesario_accounts;
CREATE TRIGGER hash_mesario_password_trigger
  BEFORE INSERT OR UPDATE ON public.mesario_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_mesario_password();
