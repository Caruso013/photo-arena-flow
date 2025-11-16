-- Migration: Descontos Progressivos e Validação de Álbuns
-- Data: 2025-01-14
-- Descrição: Sistema de descontos automáticos por quantidade + álbuns inativos com menos de 5 fotos

-- ================================================================
-- 1. FUNCTION: CALCULAR DESCONTO PROGRESSIVO
-- ================================================================

CREATE OR REPLACE FUNCTION public.calculate_progressive_discount(p_quantity integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- De 5 a 10 fotos → 5%
  IF p_quantity >= 5 AND p_quantity <= 10 THEN
    RETURN 5;
  -- De 11 a 20 fotos → 10%
  ELSIF p_quantity >= 11 AND p_quantity <= 20 THEN
    RETURN 10;
  -- Acima de 20 fotos → 15%
  ELSIF p_quantity > 20 THEN
    RETURN 15;
  -- Menos de 5 fotos → sem desconto
  ELSE
    RETURN 0;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_progressive_discount IS 'Calcula desconto progressivo: 5-10 fotos=5%, 11-20=10%, 20+=15%';

-- ================================================================
-- 2. FUNCTION: APLICAR DESCONTO PROGRESSIVO NO TOTAL
-- ================================================================

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

-- ================================================================
-- 3. NOTA: Sistema de Álbuns (sub_events)
-- ================================================================

-- A tabela sub_events ainda não foi criada neste projeto.
-- Quando for implementada, adicionar triggers de validação de 5+ fotos.
-- Por ora, fotos são associadas diretamente às campanhas.

-- ================================================================
-- 5. ADICIONAR COLUNA DE DESCONTO PROGRESSIVO EM CAMPAIGNS
-- ================================================================

DO $$
BEGIN
  -- Coluna para ativar/desativar desconto progressivo por campanha
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'campaigns' 
    AND column_name = 'progressive_discount_enabled'
  ) THEN
    ALTER TABLE public.campaigns 
    ADD COLUMN progressive_discount_enabled boolean DEFAULT false;
    
    COMMENT ON COLUMN public.campaigns.progressive_discount_enabled IS 'Se TRUE, desconto progressivo está ativo nesta campanha (fotógrafo decide)';
  END IF;
END $$;

-- ================================================================
-- 6. ADICIONAR COLUNA DE DESCONTO NA TABELA PURCHASES (SE NÃO EXISTIR)
-- ================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchases' 
    AND column_name = 'progressive_discount_percentage'
  ) THEN
    ALTER TABLE public.purchases 
    ADD COLUMN progressive_discount_percentage numeric DEFAULT 0 CHECK (progressive_discount_percentage >= 0 AND progressive_discount_percentage <= 100);
    
    COMMENT ON COLUMN public.purchases.progressive_discount_percentage IS 'Desconto progressivo aplicado (0-15%)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'purchases' 
    AND column_name = 'progressive_discount_amount'
  ) THEN
    ALTER TABLE public.purchases 
    ADD COLUMN progressive_discount_amount numeric DEFAULT 0 CHECK (progressive_discount_amount >= 0);
    
    COMMENT ON COLUMN public.purchases.progressive_discount_amount IS 'Valor do desconto progressivo em R$';
  END IF;
END $$;

-- ================================================================
-- 7. NOTA: Função de Correção de Álbuns
-- ================================================================

-- Esta função será implementada quando a tabela sub_events for criada.
-- Por ora, mantemos apenas o sistema de descontos progressivos.

-- ================================================================
-- 8. GRANTS
-- ================================================================

GRANT EXECUTE ON FUNCTION public.calculate_progressive_discount(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_progressive_discount(integer, numeric) TO authenticated;

-- ================================================================
-- 9. EXEMPLO DE USO
-- ================================================================

-- Calcular desconto para 7 fotos a R$ 20 cada
SELECT * FROM public.apply_progressive_discount(7, 20.00);
-- Resultado: 7 fotos, R$ 20,00, subtotal R$ 140,00, 5% desconto = R$ 7,00, total R$ 133,00

-- Calcular desconto para 15 fotos a R$ 20 cada
SELECT * FROM public.apply_progressive_discount(15, 20.00);
-- Resultado: 15 fotos, R$ 20,00, subtotal R$ 300,00, 10% desconto = R$ 30,00, total R$ 270,00

-- Calcular desconto para 25 fotos a R$ 20 cada
SELECT * FROM public.apply_progressive_discount(25, 20.00);
-- Resultado: 25 fotos, R$ 20,00, subtotal R$ 500,00, 15% desconto = R$ 75,00, total R$ 425,00
