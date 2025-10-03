-- Política para permitir fotógrafos criarem álbuns em eventos aos quais estão atribuídos
CREATE POLICY "Fotógrafos podem criar álbuns em seus eventos"
ON sub_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaign_photographers
    WHERE campaign_photographers.campaign_id = sub_events.campaign_id
    AND campaign_photographers.photographer_id = auth.uid()
  )
);