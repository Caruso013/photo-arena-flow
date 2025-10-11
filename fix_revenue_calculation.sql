-- =====================================================
-- FIX: Cálculo de Saldo do Fotógrafo
-- =====================================================
-- 
-- PROBLEMA: Saldo está mostrando valor a mais do que foi vendido
-- CAUSA: revenue_shares pode ter valores incorretos ou registros duplicados
--
-- SOLUÇÃO: Revisar e corrigir registros em revenue_shares
-- =====================================================

-- 1. VERIFICAR REVENUE_SHARES ATUAIS
-- Mostra todas as divisões de receita
SELECT 
  rs.id,
  rs.purchase_id,
  rs.campaign_id,
  c.title AS campaign_title,
  rs.total_amount,
  rs.photographer_amount,
  rs.organization_amount,
  p_photo.full_name AS photographer_name,
  rs.created_at
FROM revenue_shares rs
JOIN campaigns c ON c.id = rs.campaign_id
JOIN profiles p_photo ON p_photo.id = rs.photographer_id
ORDER BY rs.created_at DESC;

-- 2. VERIFICAR SE HÁ DUPLICATAS
-- Encontra purchases com múltiplos revenue_shares
SELECT 
  purchase_id,
  COUNT(*) as count,
  SUM(total_amount) as total_sum
FROM revenue_shares
GROUP BY purchase_id
HAVING COUNT(*) > 1;

-- 3. COMPARAR PURCHASES COM REVENUE_SHARES
-- Verifica se cada purchase tem exatamente 1 revenue_share com valor correto
SELECT 
  p.id AS purchase_id,
  p.amount AS purchase_amount,
  rs.id AS revenue_share_id,
  rs.total_amount AS revenue_total,
  rs.photographer_amount,
  rs.organization_amount,
  CASE 
    WHEN rs.id IS NULL THEN 'FALTA REVENUE_SHARE'
    WHEN p.amount != rs.total_amount THEN 'VALOR DIFERENTE'
    WHEN (rs.photographer_amount + rs.organization_amount) != rs.total_amount THEN 'SOMA INCORRETA'
    ELSE 'OK'
  END AS status
FROM purchases p
LEFT JOIN revenue_shares rs ON rs.purchase_id = p.id
WHERE p.status = 'completed'
ORDER BY p.created_at DESC;

-- 4. VERIFICAR SALDO POR FOTÓGRAFO
-- Compara total de vendas com saldo calculado
SELECT 
  prof.id,
  prof.full_name,
  prof.email,
  
  -- Total de vendas (purchases)
  COUNT(DISTINCT p.id) AS total_purchases,
  COALESCE(SUM(p.amount), 0) AS total_sales_amount,
  
  -- Total em revenue_shares
  COUNT(DISTINCT rs.id) AS total_revenue_shares,
  COALESCE(SUM(rs.total_amount), 0) AS revenue_shares_total,
  COALESCE(SUM(rs.photographer_amount), 0) AS photographer_revenue,
  COALESCE(SUM(rs.organization_amount), 0) AS organization_revenue,
  
  -- Status
  CASE 
    WHEN COUNT(DISTINCT p.id) != COUNT(DISTINCT rs.id) THEN 'CONTAGEM DIFERENTE'
    WHEN SUM(p.amount) != SUM(rs.total_amount) THEN 'VALORES DIFERENTES'
    ELSE 'OK'
  END AS status
FROM profiles prof
LEFT JOIN purchases p ON p.photographer_id = prof.id AND p.status = 'completed'
LEFT JOIN revenue_shares rs ON rs.purchase_id = p.id
WHERE prof.role = 'photographer'
GROUP BY prof.id, prof.full_name, prof.email
ORDER BY prof.full_name;

-- =====================================================
-- CORREÇÃO: Remover revenue_shares duplicados
-- =====================================================

-- ATENÇÃO: Execute apenas se encontrar duplicatas na query 2
-- Remove revenue_shares duplicados, mantendo apenas o mais recente
WITH duplicates AS (
  SELECT 
    id,
    purchase_id,
    ROW_NUMBER() OVER (PARTITION BY purchase_id ORDER BY created_at DESC) as rn
  FROM revenue_shares
)
DELETE FROM revenue_shares
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- =====================================================
-- CORREÇÃO: Recriar revenue_shares faltantes
-- =====================================================

-- Insere revenue_shares para purchases que não têm
-- ATENÇÃO: Só funciona se campaigns tiverem organization_percentage correto
INSERT INTO revenue_shares (
  purchase_id,
  campaign_id,
  photographer_id,
  organization_id,
  total_amount,
  photographer_amount,
  organization_amount
)
SELECT 
  p.id AS purchase_id,
  ph.campaign_id,
  p.photographer_id,
  c.organization_id,
  p.amount AS total_amount,
  
  -- Calcular parte do fotógrafo (100% - organization_percentage)
  ROUND(p.amount * (100 - COALESCE(c.organization_percentage, 0)) / 100, 2) AS photographer_amount,
  
  -- Calcular parte da organização
  ROUND(p.amount * COALESCE(c.organization_percentage, 0) / 100, 2) AS organization_amount
FROM purchases p
JOIN photos ph ON ph.id = p.photo_id
JOIN campaigns c ON c.id = ph.campaign_id
LEFT JOIN revenue_shares rs ON rs.purchase_id = p.id
WHERE 
  p.status = 'completed' 
  AND rs.id IS NULL; -- Apenas purchases SEM revenue_share

-- =====================================================
-- CORREÇÃO: Atualizar revenue_shares com valores errados
-- =====================================================

-- Corrige valores onde a soma está incorreta
UPDATE revenue_shares
SET 
  photographer_amount = ROUND(total_amount * (100 - COALESCE(c.organization_percentage, 0)) / 100, 2),
  organization_amount = ROUND(total_amount * COALESCE(c.organization_percentage, 0) / 100, 2)
FROM campaigns c
WHERE 
  revenue_shares.campaign_id = c.id
  AND (
    (revenue_shares.photographer_amount + revenue_shares.organization_amount) != revenue_shares.total_amount
  );

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Deve retornar todas as linhas com status = 'OK'
SELECT 
  prof.full_name,
  COUNT(p.id) AS total_purchases,
  SUM(p.amount) AS total_sales,
  SUM(rs.photographer_amount) AS photographer_revenue,
  CASE 
    WHEN COUNT(p.id) = COUNT(rs.id) AND SUM(p.amount) = SUM(rs.total_amount) THEN 'OK'
    ELSE 'ERRO'
  END AS status
FROM profiles prof
LEFT JOIN purchases p ON p.photographer_id = prof.id AND p.status = 'completed'
LEFT JOIN revenue_shares rs ON rs.purchase_id = p.id
WHERE prof.role = 'photographer'
GROUP BY prof.id, prof.full_name
ORDER BY prof.full_name;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
--
-- 1. Execute primeiro as queries de VERIFICAÇÃO (1, 2, 3, 4)
-- 2. Analise os resultados para identificar o problema
-- 3. Se houver duplicatas, execute a query de REMOÇÃO
-- 4. Se faltarem revenue_shares, execute a query de INSERÇÃO
-- 5. Se valores estiverem errados, execute a query de ATUALIZAÇÃO
-- 6. Execute a VERIFICAÇÃO FINAL para confirmar
--
-- =====================================================
