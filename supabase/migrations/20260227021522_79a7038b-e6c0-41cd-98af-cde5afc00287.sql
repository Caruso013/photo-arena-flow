-- Allow organization users to view purchases related to their organization's campaigns
CREATE POLICY "Organization users can view purchases for their events"
ON public.purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM photos ph
    JOIN campaigns c ON ph.campaign_id = c.id
    JOIN organization_users ou ON ou.organization_id = c.organization_id
    WHERE ph.id = purchases.photo_id
    AND ou.user_id = auth.uid()
  )
);