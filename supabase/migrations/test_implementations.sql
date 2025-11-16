-- ================================================================
-- SCRIPT DE TESTES - Implementações 14/01/2025
-- ================================================================
-- Este script testa todas as funcionalidades implementadas
-- Execute no Supabase SQL Editor para validar

-- ================================================================
-- 1. TESTAR SISTEMA DE TAXA DUPLA
-- ================================================================

-- Ver configurações atuais
SELECT 
  key,
  value,
  description,
  updated_at
FROM public.system_config 
WHERE key IN ('platform_percentage', 'variable_percentage');

-- Resultado esperado:
-- platform_percentage: {"value": 7, "min": 7, "max": 7}
-- variable_percentage: {"value": 3, "min": 0, "max": 20, "enabled": true}

-- Calcular taxa total
SELECT public.get_total_platform_percentage() AS taxa_total;

-- Resultado esperado: 10.00 (7% fixo + 3% variável)

-- Teste: Criar evento fictício e verificar divisão
DO $$
DECLARE
  v_test_campaign_id uuid;
BEGIN
  -- Criar campanha de teste (ajustar IDs conforme seu DB)
  INSERT INTO public.campaigns (
    title,
    photographer_id,
    organization_id,
    photographer_percentage,
    organization_percentage,
    event_date
  )
  VALUES (
    'TESTE - Campanha Validação Taxa',
    (SELECT id FROM profiles WHERE role = 'photographer' LIMIT 1),
    (SELECT id FROM organizations LIMIT 1),
    45,  -- Fotógrafo 45%
    45,  -- Organização 45%
    now()
  )
  RETURNING id INTO v_test_campaign_id;

  -- Verificar se taxa foi calculada corretamente
  RAISE NOTICE 'Campanha criada: %', v_test_campaign_id;
  
  SELECT 
    title,
    platform_percentage,
    photographer_percentage,
    organization_percentage,
    (platform_percentage + photographer_percentage + organization_percentage) AS soma_total
  FROM public.campaigns
  WHERE id = v_test_campaign_id;

  -- Limpar teste
  DELETE FROM public.campaigns WHERE id = v_test_campaign_id;
  RAISE NOTICE 'Teste concluído e limpo!';
END $$;

-- Resultado esperado:
-- platform_percentage: 10.00
-- photographer_percentage: 45.00
-- organization_percentage: 45.00
-- soma_total: 100.00

-- ================================================================
-- 2. TESTAR SISTEMA DE CUPONS
-- ================================================================

-- Listar cupons ativos
SELECT 
  code,
  type,
  value,
  is_active,
  start_date,
  end_date,
  max_uses,
  current_uses
FROM public.coupons
WHERE is_active = true;

-- Criar cupom de teste (se não existir)
INSERT INTO public.coupons (
  code,
  type,
  value,
  description,
  start_date,
  max_uses,
  is_active
)
VALUES (
  'TESTE10',
  'percentage',
  10,
  'Cupom de teste - 10% de desconto',
  now(),
  100,
  true
)
ON CONFLICT (code) DO NOTHING;

-- Validar cupom (AJUSTAR user_id para um válido do seu DB)
SELECT * FROM public.validate_coupon(
  'TESTE10',                                           -- código
  (SELECT id FROM profiles LIMIT 1),                   -- user_id
  100.00                                                -- valor da compra
);

-- Resultado esperado:
-- valid: true
-- coupon_id: <uuid>
-- discount_amount: 10.00 (10% de R$ 100)
-- message: "Cupom aplicado com sucesso!"

-- Testar cupom inválido
SELECT * FROM public.validate_coupon(
  'CUPOMINVALIDO',
  (SELECT id FROM profiles LIMIT 1),
  100.00
);

-- Resultado esperado:
-- valid: false
-- message: "Cupom inválido ou inativo"

-- Ver estatísticas de cupons
SELECT * FROM public.coupon_stats ORDER BY total_uses DESC;

-- Limpar cupom de teste
DELETE FROM public.coupons WHERE code = 'TESTE10';

-- ================================================================
-- 3. TESTAR DESCONTOS PROGRESSIVOS
-- ================================================================

-- Testar diferentes quantidades
-- 5 fotos a R$ 20,00 → 5% desconto
SELECT * FROM public.apply_progressive_discount(5, 20.00);

-- Resultado esperado:
-- quantity: 5
-- unit_price: 20.00
-- subtotal: 100.00
-- discount_percentage: 5.00
-- discount_amount: 5.00
-- total: 95.00

-- 15 fotos a R$ 20,00 → 10% desconto
SELECT * FROM public.apply_progressive_discount(15, 20.00);

-- Resultado esperado:
-- quantity: 15
-- unit_price: 20.00
-- subtotal: 300.00
-- discount_percentage: 10.00
-- discount_amount: 30.00
-- total: 270.00

-- 25 fotos a R$ 20,00 → 15% desconto
SELECT * FROM public.apply_progressive_discount(25, 20.00);

-- Resultado esperado:
-- quantity: 25
-- unit_price: 20.00
-- subtotal: 500.00
-- discount_percentage: 15.00
-- discount_amount: 75.00
-- total: 425.00

-- 3 fotos a R$ 20,00 → sem desconto
SELECT * FROM public.apply_progressive_discount(3, 20.00);

-- Resultado esperado:
-- quantity: 3
-- unit_price: 20.00
-- subtotal: 60.00
-- discount_percentage: 0.00
-- discount_amount: 0.00
-- total: 60.00

-- Testar apenas função de cálculo de percentual
SELECT 
  quantity,
  public.calculate_progressive_discount(quantity) AS discount_pct
FROM generate_series(1, 30) AS quantity;

-- Resultado esperado:
-- 1-4: 0%
-- 5-10: 5%
-- 11-20: 10%
-- 21+: 15%

-- ================================================================
-- 4. TESTAR VALIDAÇÃO DE ÁLBUNS
-- ================================================================

-- Ver status de todos os álbuns
SELECT * FROM public.album_status_view
ORDER BY published_photos_count DESC;

-- Resultado esperado: lista de álbuns com:
-- - nome
-- - quantidade de fotos publicadas
-- - se deveria estar ativo
-- - descrição do status

-- Álbuns com status incorreto
SELECT 
  id,
  name,
  published_photos_count,
  is_active AS status_atual,
  should_be_active AS status_correto,
  status_description
FROM public.album_status_view
WHERE is_active != should_be_active;

-- Se retornar resultados, executar correção:
SELECT * FROM public.fix_existing_album_status();

-- Testar trigger automático (AJUSTAR IDs conforme seu DB)
DO $$
DECLARE
  v_test_subevent_id uuid;
  v_test_campaign_id uuid;
  v_photo_count integer;
BEGIN
  -- Criar campanha de teste
  INSERT INTO public.campaigns (
    title,
    photographer_id,
    event_date
  )
  VALUES (
    'TESTE - Campanha Álbum',
    (SELECT id FROM profiles WHERE role = 'photographer' LIMIT 1),
    now()
  )
  RETURNING id INTO v_test_campaign_id;

  -- Criar álbum (sub_event) de teste
  INSERT INTO public.sub_events (
    campaign_id,
    name,
    is_active
  )
  VALUES (
    v_test_campaign_id,
    'TESTE - Álbum Validação',
    false  -- Começa inativo
  )
  RETURNING id INTO v_test_subevent_id;

  RAISE NOTICE 'Álbum criado (inativo): %', v_test_subevent_id;

  -- Adicionar 4 fotos (ainda não ativa)
  FOR i IN 1..4 LOOP
    INSERT INTO public.photos (
      campaign_id,
      sub_event_id,
      photo_url,
      status
    )
    VALUES (
      v_test_campaign_id,
      v_test_subevent_id,
      'https://example.com/test' || i || '.jpg',
      'published'
    );
  END LOOP;

  -- Verificar se ainda está inativo
  SELECT COUNT(*) INTO v_photo_count
  FROM public.photos
  WHERE sub_event_id = v_test_subevent_id AND status = 'published';

  RAISE NOTICE 'Fotos publicadas: % (álbum deve estar INATIVO)', v_photo_count;

  -- Verificar status
  IF EXISTS (
    SELECT 1 FROM public.sub_events 
    WHERE id = v_test_subevent_id AND is_active = false
  ) THEN
    RAISE NOTICE '✅ TESTE OK: Álbum está inativo com < 5 fotos';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Álbum deveria estar inativo!';
  END IF;

  -- Adicionar 5ª foto (deve ativar automaticamente)
  INSERT INTO public.photos (
    campaign_id,
    sub_event_id,
    photo_url,
    status
  )
  VALUES (
    v_test_campaign_id,
    v_test_subevent_id,
    'https://example.com/test5.jpg',
    'published'
  );

  -- Verificar se ativou
  SELECT COUNT(*) INTO v_photo_count
  FROM public.photos
  WHERE sub_event_id = v_test_subevent_id AND status = 'published';

  RAISE NOTICE 'Fotos publicadas: % (álbum deve estar ATIVO)', v_photo_count;

  -- Verificar status
  IF EXISTS (
    SELECT 1 FROM public.sub_events 
    WHERE id = v_test_subevent_id AND is_active = true
  ) THEN
    RAISE NOTICE '✅ TESTE OK: Álbum ativou automaticamente com 5+ fotos';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Álbum deveria estar ativo!';
  END IF;

  -- Limpar testes
  DELETE FROM public.photos WHERE sub_event_id = v_test_subevent_id;
  DELETE FROM public.sub_events WHERE id = v_test_subevent_id;
  DELETE FROM public.campaigns WHERE id = v_test_campaign_id;

  RAISE NOTICE '🧹 Testes limpos com sucesso!';
END $$;

-- ================================================================
-- 5. VERIFICAR TRIGGERS E FUNCTIONS
-- ================================================================

-- Listar todas as functions criadas
SELECT 
  routine_name AS function_name,
  routine_type AS type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE ANY(ARRAY[
    '%progressive%',
    '%coupon%',
    '%album%',
    '%platform_percentage%'
  ])
ORDER BY routine_name;

-- Resultado esperado:
-- calculate_progressive_discount
-- apply_progressive_discount
-- validate_coupon
-- get_total_platform_percentage
-- auto_manage_album_status
-- fix_existing_album_status

-- Listar triggers
SELECT 
  trigger_name,
  event_object_table AS table_name,
  action_timing,
  event_manipulation AS event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE ANY(ARRAY[
    '%coupon%',
    '%album%',
    '%campaign%'
  ])
ORDER BY trigger_name;

-- Resultado esperado:
-- trigger_auto_activate_album_on_insert (photos, AFTER INSERT)
-- trigger_auto_activate_album_on_update (photos, AFTER UPDATE)
-- trigger_auto_deactivate_album_on_delete (photos, AFTER DELETE)
-- trigger_increment_coupon_usage (coupon_uses, AFTER INSERT)
-- trigger_auto_deactivate_coupons (coupon_uses, AFTER INSERT)

-- ================================================================
-- 6. VERIFICAR TABELAS E VIEWS
-- ================================================================

-- Verificar estrutura da tabela coupons
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'coupons'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela coupon_uses
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'coupon_uses'
ORDER BY ordinal_position;

-- Verificar views criadas
SELECT 
  table_name AS view_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE ANY(ARRAY[
    '%coupon%',
    '%album%'
  ]);

-- Resultado esperado:
-- coupon_stats
-- album_status_view

-- ================================================================
-- 7. VERIFICAR RLS POLICIES
-- ================================================================

-- Listar policies de coupons
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('coupons', 'coupon_uses')
ORDER BY tablename, policyname;

-- Resultado esperado:
-- Admins manage coupons (coupons, ALL)
-- Anyone can view active coupons (coupons, SELECT)
-- Users view own coupon uses (coupon_uses, SELECT)
-- Admins view all coupon uses (coupon_uses, SELECT)

-- ================================================================
-- 8. RELATÓRIO FINAL
-- ================================================================

-- Gerar relatório resumido
SELECT 
  '✅ Sistema de Taxa Dupla' AS funcionalidade,
  EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'get_total_platform_percentage'
  ) AS implementado;

SELECT 
  '✅ Sistema de Cupons' AS funcionalidade,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'coupons'
  ) AS implementado;

SELECT 
  '✅ Descontos Progressivos' AS funcionalidade,
  EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'calculate_progressive_discount'
  ) AS implementado;

SELECT 
  '✅ Validação de Álbuns' AS funcionalidade,
  EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'auto_manage_album_status'
  ) AS implementado;

-- ================================================================
-- FIM DOS TESTES
-- ================================================================

-- Se todos os testes passaram, você verá:
-- ✅ Sistema de Taxa Dupla: true
-- ✅ Sistema de Cupons: true
-- ✅ Descontos Progressivos: true
-- ✅ Validação de Álbuns: true
--
-- 🎉 PARABÉNS! Todas as funcionalidades foram implementadas com sucesso!
