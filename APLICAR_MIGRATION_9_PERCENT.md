# 🚀 GUIA: Aplicar Migration - Taxa 9%

## ⚠️ PROBLEMA DETECTADO

```
❌ Verificar taxa da plataforma (9%) ... FALHOU (Taxa: 7% (esperado: 9%))
```

**Seu banco de dados ainda está com a taxa de 7%**. Precisamos aplicar a migration!

---

## 📋 MÉTODO 1: Supabase Dashboard (RECOMENDADO) ⭐

### Passo 1: Acessar o Supabase Dashboard
1. Abra: **https://app.supabase.com**
2. Faça login
3. Selecione o projeto: **gtpqppvyjrnnuhlsbpqd**

### Passo 2: Abrir SQL Editor
1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **+ New query**

### Passo 3: Copiar e Colar o SQL
1. Abra o arquivo: `supabase/migrations/20251105120000_update_platform_fee_to_9_percent.sql`
2. **Copie TODO o conteúdo** (119 linhas)
3. **Cole** no SQL Editor do Supabase

### Passo 4: Executar
1. Clique no botão **RUN** (ou pressione Ctrl+Enter)
2. Aguarde a execução (deve levar ~2-5 segundos)
3. Verifique se aparece **✅ Success** sem erros

### Passo 5: Verificar
Execute este SQL para confirmar:

```sql
SELECT 
  id, 
  title, 
  platform_percentage, 
  photographer_percentage, 
  organization_percentage 
FROM campaigns 
LIMIT 10;
```

**Resultado esperado**: Todas as campanhas devem ter `platform_percentage = 9`

---

## 📋 MÉTODO 2: Via psql (Avançado)

Se você tem o PostgreSQL client instalado:

```bash
# 1. Exportar variáveis
export SUPABASE_DB_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# 2. Aplicar migration
psql $SUPABASE_DB_URL < supabase/migrations/20251105120000_update_platform_fee_to_9_percent.sql

# 3. Verificar
psql $SUPABASE_DB_URL -c "SELECT platform_percentage FROM campaigns LIMIT 1;"
```

---

## 📋 MÉTODO 3: Copiar SQL Manualmente

### SQL Completo para Copiar:

```sql
-- Atualiza taxa da plataforma para 9% (era 7%)
-- Taxa fixa: Plataforma 9%, restante 91% dividido entre fotógrafo e organização

-- 1) Atualizar campanhas existentes para platform_percentage = 9
UPDATE public.campaigns
SET platform_percentage = 9
WHERE platform_percentage != 9;

-- 2) Ajustar photographer_percentage e organization_percentage para somarem 91%
-- Para campanhas SEM organização: fotógrafo fica com 91%
UPDATE public.campaigns
SET 
  photographer_percentage = 91,
  organization_percentage = 0
WHERE organization_id IS NULL;

-- Para campanhas COM organização: ajustar photographer para completar 91%
UPDATE public.campaigns
SET photographer_percentage = 91 - COALESCE(organization_percentage, 0)
WHERE organization_id IS NOT NULL;

-- 3) Atualizar DEFAULT da coluna para 9%
ALTER TABLE public.campaigns 
ALTER COLUMN platform_percentage SET DEFAULT 9;

-- 4) Atualizar DEFAULT do photographer_percentage para 91%
ALTER TABLE public.campaigns 
ALTER COLUMN photographer_percentage SET DEFAULT 91;

-- 5) Remover constraint antiga se existir
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS check_percentage_sum_with_fixed_platform;

-- 6) Criar nova constraint: platform = 9%, fotógrafo + org = 91%
ALTER TABLE public.campaigns
ADD CONSTRAINT check_percentage_sum_with_fixed_platform
CHECK (
  platform_percentage = 9 
  AND (photographer_percentage + COALESCE(organization_percentage, 0)) = 91
);

-- 7) Atualizar função de validação para forçar 9% na plataforma
CREATE OR REPLACE FUNCTION validate_campaign_percentages()
RETURNS TRIGGER AS $$
BEGIN
  -- Forçar platform sempre em 9%
  NEW.platform_percentage := 9;
  
  -- Se não tem organização, fotógrafo fica com 91%
  IF NEW.organization_id IS NULL THEN
    NEW.photographer_percentage := 91;
    NEW.organization_percentage := 0;
  ELSE
    -- Se tem organização, garantir que soma seja 91%
    IF NEW.photographer_percentage IS NULL THEN
      NEW.photographer_percentage := 91 - COALESCE(NEW.organization_percentage, 0);
    END IF;
    
    -- Validar que a soma seja exatamente 91%
    IF (NEW.photographer_percentage + COALESCE(NEW.organization_percentage, 0)) != 91 THEN
      RAISE EXCEPTION 'A soma das porcentagens do fotógrafo e organização deve ser 91%% (plataforma mantém 9%% fixo)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8) Recriar trigger com a função atualizada
DROP TRIGGER IF EXISTS trigger_validate_campaign_percentages ON public.campaigns;

CREATE TRIGGER trigger_validate_campaign_percentages
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_campaign_percentages();

-- 9) Atualizar view auxiliar para refletir os 9%
CREATE OR REPLACE VIEW campaign_revenue_distribution AS
SELECT 
  id,
  title,
  platform_percentage,
  photographer_percentage,
  organization_percentage,
  organization_id,
  photographer_id,
  -- Exemplos de cálculo para uma venda de R$ 100,00
  9.00 as platform_amount_example,
  (photographer_percentage * 1.0) as photographer_amount_example,
  (COALESCE(organization_percentage, 0) * 1.0) as organization_amount_example,
  CASE 
    WHEN organization_id IS NULL THEN 'Sem organização (Fotógrafo: 91%, Plataforma: 9%)'
    ELSE format('Com organização (Fotógrafo: %s%%, Organização: %s%%, Plataforma: 9%%)', 
                photographer_percentage, 
                COALESCE(organization_percentage, 0))
  END as revenue_split_description
FROM public.campaigns;

-- 10) Atualizar comentário da view
COMMENT ON VIEW campaign_revenue_distribution IS 'View auxiliar para visualizar a distribuição de receita. Taxa fixa: Plataforma 9% (R$ 9,00 de cada R$ 100,00), restante 91% dividido entre fotógrafo e organização.';

-- 11) Atualizar comentários das colunas
COMMENT ON COLUMN public.campaigns.platform_percentage IS 'Taxa da plataforma (FIXO: 9%)';
COMMENT ON COLUMN public.campaigns.photographer_percentage IS 'Percentual do fotógrafo (0-91%, padrão: 91%)';
COMMENT ON COLUMN public.campaigns.organization_percentage IS 'Percentual da organização (0-91%, padrão: 0%). A soma de photographer + organization deve ser 91%';
```

---

## ✅ APÓS APLICAR A MIGRATION

### 1. Rodar Testes Novamente
```bash
node test-local.cjs
```

**Resultado esperado**:
```
✅ Verificar taxa da plataforma (9%) ... PASSOU (Taxa: 9%)
```

### 2. Testar no App
1. Abra: http://localhost:8080
2. Login como fotógrafo
3. Criar novo evento
4. Verificar se mostra: "Taxa da plataforma: 9% | Você recebe: 91%"

### 3. Verificar Campanhas Existentes
No Supabase Dashboard, execute:
```sql
SELECT 
  id,
  title,
  platform_percentage AS "Taxa Plataforma",
  photographer_percentage AS "Taxa Fotógrafo",
  organization_percentage AS "Taxa Organização",
  (platform_percentage + photographer_percentage + organization_percentage) AS "Total"
FROM campaigns;
```

**Todas devem somar 100%** ✅

---

## 🆘 PROBLEMAS COMUNS

### Erro: "constraint check_percentage_sum_with_fixed_platform"
**Solução**: A migration já remove a constraint antiga antes de criar a nova. Execute novamente.

### Erro: "relation campaigns does not exist"
**Solução**: Verifique se você está conectado ao banco correto no projeto correto.

### Erro: "permission denied"
**Solução**: Certifique-se de usar o usuário `postgres` ou um usuário com privilégios de ALTER TABLE.

---

## 📊 IMPACTO DA MUDANÇA

### Receita de uma venda de R$ 100,00:

| Item | Antes (7%) | Agora (9%) | Diferença |
|------|------------|------------|-----------|
| **Plataforma** | R$ 7,00 | R$ 9,00 | +R$ 2,00 |
| **Fotógrafo** | R$ 93,00 | R$ 91,00 | -R$ 2,00 |
| **Total** | 100% | 100% | - |

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Aplicar migration no banco
2. ✅ Rodar testes: `node test-local.cjs`
3. ✅ Verificar no app: http://localhost:8080
4. ✅ Commit e push:
   ```bash
   git add .
   git commit -m "feat: atualiza taxa para 9% e melhora navegação"
   git push origin main
   ```

---

**Data**: 05 de Novembro de 2025  
**Status**: ⚠️ Aguardando aplicação no banco  
**Link Direto**: https://app.supabase.com/project/gtpqppvyjrnnuhlsbpqd/sql
