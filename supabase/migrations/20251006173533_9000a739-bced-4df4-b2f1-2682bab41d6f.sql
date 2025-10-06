-- Remove a política antiga que permite apenas admins criarem campanhas
DROP POLICY IF EXISTS "Only admins can create campaigns" ON campaigns;

-- Cria nova política que permite admins E fotógrafos criarem campanhas
CREATE POLICY "Admins and photographers can create campaigns" 
ON campaigns 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'photographer'::user_role)
);