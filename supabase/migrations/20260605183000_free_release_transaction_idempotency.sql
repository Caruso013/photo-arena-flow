-- Fluxo transacional e idempotente para liberações gratuitas (total <= 0)

CREATE UNIQUE INDEX IF NOT EXISTS purchases_buyer_photo_external_reference_uidx
ON public.purchases (buyer_id, photo_id, stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS coupon_uses_purchase_id_uidx
ON public.coupon_uses (purchase_id)
WHERE purchase_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_free_release_checkout(
  p_buyer_id uuid,
  p_photo_ids uuid[],
  p_external_reference text,
  p_progressive_discount_percentage numeric,
  p_purchase_amounts_by_photo jsonb,
  p_progressive_discount_amounts_by_photo jsonb,
  p_coupon_id uuid DEFAULT NULL,
  p_coupon_original_amounts_by_photo jsonb DEFAULT NULL
)
RETURNS TABLE (
  purchase_ids uuid[],
  reused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photo record;
  v_purchase_id uuid;
  v_purchase_ids uuid[] := ARRAY[]::uuid[];
  v_expected_count integer := COALESCE(array_length(p_photo_ids, 1), 0);
  v_existing_count integer := 0;
  v_purchase_amount numeric;
  v_progressive_discount_amount numeric;
  v_coupon_original_amount numeric;
BEGIN
  IF p_buyer_id IS NULL OR v_expected_count = 0 OR p_external_reference IS NULL OR btrim(p_external_reference) = '' THEN
    RAISE EXCEPTION 'Parâmetros inválidos para free release';
  END IF;

  SELECT ARRAY_AGG(p.id ORDER BY p.id), COUNT(*)
  INTO v_purchase_ids, v_existing_count
  FROM public.purchases p
  WHERE p.buyer_id = p_buyer_id
    AND p.stripe_payment_intent_id = p_external_reference
    AND p.photo_id = ANY(p_photo_ids);

  IF COALESCE(v_existing_count, 0) = v_expected_count THEN
    RETURN QUERY SELECT v_purchase_ids, true;
    RETURN;
  END IF;

  v_purchase_ids := ARRAY[]::uuid[];

  FOR v_photo IN
    SELECT ph.id, ph.photographer_id, ph.price
    FROM public.photos ph
    WHERE ph.id = ANY(p_photo_ids)
    ORDER BY ph.id
  LOOP
    v_purchase_amount := COALESCE((p_purchase_amounts_by_photo ->> v_photo.id::text)::numeric, 0.01);
    IF v_purchase_amount <= 0 THEN
      v_purchase_amount := 0.01;
    END IF;

    v_progressive_discount_amount := COALESCE((p_progressive_discount_amounts_by_photo ->> v_photo.id::text)::numeric, 0);

    INSERT INTO public.purchases (
      photo_id,
      buyer_id,
      photographer_id,
      amount,
      status,
      stripe_payment_intent_id,
      progressive_discount_percentage,
      progressive_discount_amount
    )
    VALUES (
      v_photo.id,
      p_buyer_id,
      v_photo.photographer_id,
      v_purchase_amount,
      'completed',
      p_external_reference,
      COALESCE(p_progressive_discount_percentage, 0),
      v_progressive_discount_amount
    )
    ON CONFLICT (buyer_id, photo_id, stripe_payment_intent_id)
    DO UPDATE SET
      status = 'completed',
      amount = EXCLUDED.amount,
      progressive_discount_percentage = EXCLUDED.progressive_discount_percentage,
      progressive_discount_amount = EXCLUDED.progressive_discount_amount
    RETURNING id INTO v_purchase_id;

    v_purchase_ids := ARRAY_APPEND(v_purchase_ids, v_purchase_id);

    IF p_coupon_id IS NOT NULL THEN
      v_coupon_original_amount := COALESCE((p_coupon_original_amounts_by_photo ->> v_photo.id::text)::numeric, 0);

      IF v_coupon_original_amount <= 0 THEN
        RAISE EXCEPTION 'Valor do cupom inválido para foto %', v_photo.id;
      END IF;

      INSERT INTO public.coupon_uses (
        coupon_id,
        user_id,
        purchase_id,
        discount_amount,
        original_amount,
        final_amount
      )
      VALUES (
        p_coupon_id,
        p_buyer_id,
        v_purchase_id,
        v_coupon_original_amount,
        v_coupon_original_amount,
        0
      )
      ON CONFLICT (purchase_id)
      DO UPDATE SET
        coupon_id = EXCLUDED.coupon_id,
        user_id = EXCLUDED.user_id,
        discount_amount = EXCLUDED.discount_amount,
        original_amount = EXCLUDED.original_amount,
        final_amount = EXCLUDED.final_amount;
    END IF;
  END LOOP;

  IF COALESCE(array_length(v_purchase_ids, 1), 0) <> v_expected_count THEN
    RAISE EXCEPTION 'Nem todas as purchases foram criadas para free release';
  END IF;

  IF p_coupon_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_existing_count
    FROM public.coupon_uses cu
    WHERE cu.purchase_id = ANY(v_purchase_ids);

    IF v_existing_count <> v_expected_count THEN
      RAISE EXCEPTION 'Nem todas as purchases tiveram coupon_uses no free release';
    END IF;
  END IF;

  RETURN QUERY SELECT v_purchase_ids, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_free_release_checkout(uuid, uuid[], text, numeric, jsonb, jsonb, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_free_release_checkout(uuid, uuid[], text, numeric, jsonb, jsonb, uuid, jsonb) TO service_role;
