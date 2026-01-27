-- Permitir admins criar purchases em nome de qualquer usuário (liberação gratuita)
CREATE POLICY "Admins can create purchases for any user"
ON public.purchases
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Permitir fotógrafos criar purchases para liberação gratuita também
CREATE POLICY "Photographers can create free purchases for their photos"
ON public.purchases
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'photographer'::user_role) AND
  EXISTS (
    SELECT 1 FROM photos 
    WHERE photos.id = purchases.photo_id 
    AND photos.photographer_id = auth.uid()
  )
);