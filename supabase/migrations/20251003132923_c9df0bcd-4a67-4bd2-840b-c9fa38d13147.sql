-- Remover política antiga que permite fotógrafos criarem campanhas
DROP POLICY IF EXISTS "Photographers can create campaigns" ON public.campaigns;

-- Adicionar política permitindo apenas admins criarem campanhas
CREATE POLICY "Only admins can create campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Garantir que admins possam excluir campanhas
DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.campaigns;

CREATE POLICY "Admins can delete campaigns"
ON public.campaigns
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);