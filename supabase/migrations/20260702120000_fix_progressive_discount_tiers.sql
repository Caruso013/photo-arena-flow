-- Corrige as faixas do desconto progressivo para refletir a regra atual do produto
-- 2 a 4 fotos  -> 5%
-- 5 a 9 fotos  -> 10%
-- 10+ fotos    -> 20%

CREATE OR REPLACE FUNCTION public.calculate_progressive_discount(p_quantity integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_quantity >= 10 THEN
    RETURN 20;
  ELSIF p_quantity >= 5 THEN
    RETURN 10;
  ELSIF p_quantity >= 2 THEN
    RETURN 5;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_progressive_discount IS 'Calcula desconto progressivo: 2-4 fotos=5%, 5-9=10%, 10+=20%';

CREATE OR REPLACE FUNCTION public.apply_progressive_discount(
  p_quantity integer,
  p_unit_price numeric
)
RETURNS TABLE (
  quantity integer,
  unit_price numeric,
  subtotal numeric,
  discount_percentage numeric,
  discount_amount numeric,
  total numeric
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_subtotal numeric;
  v_discount_pct numeric;
  v_discount_amount numeric;
  v_total numeric;
BEGIN
  v_subtotal := p_quantity * p_unit_price;
  v_discount_pct := public.calculate_progressive_discount(p_quantity);
  v_discount_amount := v_subtotal * (v_discount_pct / 100);
  v_total := v_subtotal - v_discount_amount;

  RETURN QUERY SELECT
    p_quantity,
    p_unit_price,
    v_subtotal,
    v_discount_pct,
    v_discount_amount,
    v_total;
END;
$$;

COMMENT ON FUNCTION public.apply_progressive_discount IS 'Aplica desconto progressivo e retorna detalhes do cálculo';
