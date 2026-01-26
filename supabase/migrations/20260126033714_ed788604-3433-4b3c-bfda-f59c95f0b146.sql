
-- Liberar compras da cliente Jaqueline
UPDATE purchases 
SET status = 'completed'
WHERE id IN (
  '8a38b8fb-a5aa-47b7-97de-0572a633b1cb',
  'd9ce9220-552f-4ce6-90e3-e4755da8dc9f'
);
