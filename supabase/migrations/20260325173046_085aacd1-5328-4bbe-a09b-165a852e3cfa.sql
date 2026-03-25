DROP POLICY IF EXISTS "Admins can create purchases for any user" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can create purchases" ON public.purchases;
DROP POLICY IF EXISTS "Photographers can create free purchases for their photos" ON public.purchases;

CREATE POLICY "Admins can create pending paid purchases"
ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
  AND status = 'pending'
  AND amount > 0
  AND EXISTS (
    SELECT 1
    FROM public.photos ph
    WHERE ph.id = purchases.photo_id
      AND ph.photographer_id = purchases.photographer_id
  )
);

CREATE POLICY "Users can create pending paid purchases"
ON public.purchases
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND status = 'pending'
  AND amount > 0
  AND EXISTS (
    SELECT 1
    FROM public.photos ph
    WHERE ph.id = purchases.photo_id
      AND ph.photographer_id = purchases.photographer_id
  )
);