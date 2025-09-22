-- ========================================
-- SCRIPT PARA ATUALIZAR PORCENTAGEM PADRÃO DOS FOTÓGRAFOS PARA 10%
-- Execute este script no Supabase Dashboard para atualizar registros existentes
-- ========================================

-- Atualizar a coluna padrão na tabela organization_members
ALTER TABLE organization_members 
ALTER COLUMN photographer_percentage SET DEFAULT 10.00;

-- Atualizar a coluna padrão na tabela event_applications
ALTER TABLE event_applications 
ALTER COLUMN photographer_percentage SET DEFAULT 10.00;

-- Atualizar registros existentes que estão com 0.00 ou 70.00 para 10.00
-- (apenas se você quiser atualizar registros existentes)
UPDATE organization_members 
SET photographer_percentage = 10.00 
WHERE photographer_percentage = 0.00 OR photographer_percentage = 70.00;

UPDATE event_applications 
SET photographer_percentage = 10.00 
WHERE photographer_percentage = 0.00;

-- Verificar as alterações
SELECT 'organization_members' as tabela, photographer_percentage, COUNT(*) as quantidade
FROM organization_members 
GROUP BY photographer_percentage
UNION ALL
SELECT 'event_applications' as tabela, photographer_percentage, COUNT(*) as quantidade
FROM event_applications 
GROUP BY photographer_percentage;

-- ========================================
-- RESUMO:
-- ========================================
-- ✅ Porcentagem padrão dos fotógrafos: 10%
-- ✅ Pode ser alterada individualmente por evento/organização
-- ✅ Registros existentes atualizados (se aplicável)
-- ========================================