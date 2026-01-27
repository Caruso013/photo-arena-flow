
-- Corrigir compras da cliente jossanariasilvasilva@gmail.com que foram aprovadas pelo MP
-- O webhook recebeu event_type: payment_approved para payment_id: 142622701571
-- mas as purchases permaneceram como 'pending'

UPDATE public.purchases 
SET status = 'completed'
WHERE stripe_payment_intent_id = '142622701571'
  AND status = 'pending';
