-- Create trigger to automatically calculate revenue shares when purchase is completed
DROP TRIGGER IF EXISTS trigger_calculate_revenue_shares ON purchases;

CREATE TRIGGER trigger_calculate_revenue_shares
  AFTER INSERT OR UPDATE OF status ON purchases
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION calculate_revenue_shares();

-- Populate revenue_shares for existing completed purchases that don't have entries yet
INSERT INTO revenue_shares (
  purchase_id,
  photographer_id,
  organization_id,
  platform_amount,
  photographer_amount,
  organization_amount
)
SELECT 
  p.id as purchase_id,
  p.photographer_id,
  c.organization_id,
  p.amount * (c.platform_percentage / 100) as platform_amount,
  p.amount * (c.photographer_percentage / 100) as photographer_amount,
  p.amount * (COALESCE(c.organization_percentage, 0) / 100) as organization_amount
FROM purchases p
JOIN photos ph ON p.photo_id = ph.id
JOIN campaigns c ON ph.campaign_id = c.id
WHERE p.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM revenue_shares rs WHERE rs.purchase_id = p.id
  );

-- If organization is NULL, reallocate organization percentage to platform
UPDATE revenue_shares
SET 
  platform_amount = platform_amount + organization_amount,
  organization_amount = 0
WHERE organization_id IS NULL;