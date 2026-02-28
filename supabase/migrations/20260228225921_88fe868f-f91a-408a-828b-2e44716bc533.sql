-- Update all photo prices for APF organization to R$ 12.90
UPDATE photos SET price = 12.90 
WHERE campaign_id IN (
  SELECT id FROM campaigns WHERE organization_id = 'c31c98a0-b78f-41fc-9430-78559cf811d1'
);

-- Also update the display price on APF campaigns
UPDATE campaigns SET photo_price_display = 12.90 
WHERE organization_id = 'c31c98a0-b78f-41fc-9430-78559cf811d1';