
-- Liberar compras que tiveram payment.updated ou payment_approved
UPDATE purchases 
SET status = 'completed'
WHERE status = 'pending'
  AND (
    -- Pagamentos com payment.updated confirmado
    stripe_payment_intent_id LIKE '%|mp:142848593113'
    OR stripe_payment_intent_id LIKE '%|mp:142652153653'
    OR stripe_payment_intent_id LIKE '%|mp:142674031047'
    -- Pagamentos com payment_approved no webhook
    OR stripe_payment_intent_id LIKE '%142652565421%'
  );
