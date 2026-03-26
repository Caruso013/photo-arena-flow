
-- Update the validate_payout_minimum_balance trigger to account for 12h security period
CREATE OR REPLACE FUNCTION public.validate_payout_minimum_balance()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
DECLARE
  v_total_earned NUMERIC;
  v_available_before_payouts NUMERIC;
  v_blocked_amount NUMERIC;
  v_withdrawn_amount NUMERIC;
  v_available_balance NUMERIC;
BEGIN
  -- Calculate total earned from completed purchases (only those past 12h security period)
  SELECT COALESCE(SUM(rs.photographer_amount), 0)
  INTO v_available_before_payouts
  FROM revenue_shares rs
  JOIN purchases p ON p.id = rs.purchase_id
  WHERE rs.photographer_id = NEW.photographer_id
    AND p.status = 'completed'
    AND p.created_at < (now() - interval '12 hours');

  -- Calculate blocked amount (pending + approved payouts)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_blocked_amount
  FROM payout_requests
  WHERE photographer_id = NEW.photographer_id
    AND status IN ('pending', 'approved');

  -- Calculate already withdrawn amount
  SELECT COALESCE(SUM(amount), 0)
  INTO v_withdrawn_amount
  FROM payout_requests
  WHERE photographer_id = NEW.photographer_id
    AND status = 'completed';

  -- Available = earned (past 12h) - blocked - withdrawn
  v_available_balance := v_available_before_payouts - v_blocked_amount - v_withdrawn_amount;
  IF v_available_balance < 0 THEN
    v_available_balance := 0;
  END IF;

  -- Validate minimum R$ 50
  IF NEW.amount < 50 THEN
    RAISE EXCEPTION 'O valor mínimo para solicitar repasse é R$ 50,00';
  END IF;

  -- Validate sufficient balance
  IF NEW.amount > v_available_balance THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %. Solicitado: R$ %', 
      ROUND(v_available_balance, 2), ROUND(NEW.amount, 2);
  END IF;

  RETURN NEW;
END;
$function$;
