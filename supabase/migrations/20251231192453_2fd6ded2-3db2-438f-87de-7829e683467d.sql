-- Corrigir Security Definer View - adicionar SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles_safe;
CREATE VIEW public.public_profiles_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM profiles
WHERE role IN ('photographer', 'organizer');

-- Também verificar e corrigir outras views existentes
DROP VIEW IF EXISTS public.public_profiles;

-- Recriar public_profiles como security invoker se existir
-- (vou checar se existe primeiro)