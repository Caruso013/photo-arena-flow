-- Permitir visualização pública de fotógrafos (apenas nome e avatar, sem email)
-- Necessário para exibir informações dos fotógrafos nos cards de eventos

CREATE POLICY "Public photographer basic info" ON public.profiles
FOR SELECT 
USING (
  role = 'photographer'::user_role 
  AND id IN (
    SELECT DISTINCT photographer_id 
    FROM campaigns 
    WHERE is_active = true AND photographer_id IS NOT NULL
  )
);