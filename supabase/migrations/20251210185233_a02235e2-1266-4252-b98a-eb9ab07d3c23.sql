-- Corrigir a view buyer_names_for_photographers para ser SECURITY INVOKER
DROP VIEW IF EXISTS public.buyer_names_for_photographers;

CREATE VIEW public.buyer_names_for_photographers
WITH (security_invoker = true)
AS
SELECT DISTINCT
  pr.id AS buyer_id,
  pr.full_name AS buyer_name,
  p.photographer_id
FROM public.profiles pr
INNER JOIN public.purchases p ON p.buyer_id = pr.id
WHERE p.status = 'completed';

COMMENT ON VIEW public.buyer_names_for_photographers IS 'View segura (SECURITY INVOKER) que permite fotógrafos verem APENAS o nome de clientes que compraram suas fotos.';