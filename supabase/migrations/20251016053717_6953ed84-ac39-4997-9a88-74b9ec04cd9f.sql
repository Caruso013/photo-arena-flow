-- Allow photographers to delete their own campaigns
CREATE POLICY "Photographers can delete own campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING ((auth.uid() = photographer_id) AND has_role(auth.uid(), 'photographer'::user_role));
