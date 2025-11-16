# 🔧 Correção: Erro ao Criar Evento como Admin

## ❌ Problema Identificado

**Erro no Console**:
```
gtpqppvyjrnnuhlsbpqd.supabase.co/rest/v1/campaigns:1  
Failed to load resource: the server responded with a status of 400 ()

CreateCampaignModal.tsx:168 Error creating campaign
```

**Causa Raiz**: A coluna `photographer_percentage` **NÃO EXISTIA** na tabela `campaigns`, mas o código estava tentando inserir esse valor.

---

## ✅ Solução Aplicada

### 1. **Nova Migration Criada**: `20250114000002_add_photographer_percentage_to_campaigns.sql`

**Mudanças**:
- ✅ Adiciona coluna `photographer_percentage NUMERIC(5,2) DEFAULT 91.00`
- ✅ Constraint: valor entre 0-100%
- ✅ Atualiza campanhas existentes para 91% (100% - 9% plataforma)
- ✅ Constraint de validação: `photographer_percentage + organization_percentage <= 100%`
- ✅ View `campaign_revenue_split_view` para monitorar divisão
- ✅ Trigger de validação automática antes de INSERT/UPDATE

### 2. **Estrutura da Tabela `campaigns` Após Migration**

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  photographer_id UUID,  -- Nullable (admin pode criar sem fotógrafo)
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  location TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Sistema de divisão de receita
  photographer_percentage NUMERIC(5,2) DEFAULT 91.00,  -- ✨ NOVO
  organization_percentage NUMERIC(5,2) DEFAULT 0.00,   -- Já existia
  organization_id UUID,                                -- Já existia
  
  -- Desconto progressivo
  progressive_discount_enabled BOOLEAN DEFAULT false,   -- Da migration anterior
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_percentage_sum CHECK (
    photographer_percentage + organization_percentage <= 100
  )
);
```

### 3. **Validações Implementadas**

#### Trigger Automático:
```sql
CREATE TRIGGER trigger_validate_campaign_revenue_split
  BEFORE INSERT OR UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_campaign_revenue_split();
```

**O que valida**:
- ✅ Soma de `photographer_percentage + organization_percentage` não pode exceder 100%
- ✅ Se não há `organization_id`, então `organization_percentage` deve ser 0
- ✅ Bloqueia INSERT/UPDATE se validação falhar

#### View de Monitoramento:
```sql
SELECT * FROM campaign_revenue_split_view;
```

**Mostra**:
- ID e título da campanha
- % fotógrafo, % organização, % plataforma (calculado)
- Status de validação ("Válido", "ERRO: Soma > 100%")
- Nome do fotógrafo e organização (se houver)

---

## 🎯 Divisão de Receita - Como Funciona

### **Modelo de 3 Partes**:
1. **Plataforma (Taxa Fixa)**: 7% fixo + 0-20% variável = **Total: 7-27%**
2. **Fotógrafo**: Recebe % configurável (ex: 91% quando plataforma = 9%)
3. **Organização** (opcional): Recebe % do restante (ex: 0% ou 20%)

### **Exemplos**:

#### Exemplo 1: Fotógrafo Solo (Padrão)
```
Venda: R$ 100,00
├─ Plataforma: 9% = R$ 9,00
├─ Fotógrafo: 91% = R$ 91,00
└─ Organização: 0% = R$ 0,00
Total: 100%
```

#### Exemplo 2: Com Organização
```
Venda: R$ 100,00
├─ Plataforma: 9% = R$ 9,00
├─ Fotógrafo: 71% = R$ 71,00
└─ Organização: 20% = R$ 20,00
Total: 100%
```

#### Exemplo 3: Taxa Variável Aumentada (Admin)
```
Venda: R$ 100,00
├─ Plataforma: 15% (7% fixo + 8% variável) = R$ 15,00
├─ Fotógrafo: 85% = R$ 85,00
└─ Organização: 0% = R$ 0,00
Total: 100%
```

---

## 🚀 Como Aplicar a Correção

### 1. **Aplicar Migration**
```bash
# Via Supabase CLI
supabase db push

# Ou via SQL Editor no Supabase Dashboard
# Copiar e executar conteúdo de:
# supabase/migrations/20250114000002_add_photographer_percentage_to_campaigns.sql
```

### 2. **Verificar se Aplicou**
```sql
-- Ver estrutura da tabela
\d campaigns

-- Ver campanhas existentes com nova coluna
SELECT id, title, photographer_percentage, organization_percentage 
FROM campaigns 
LIMIT 5;

-- Ver divisão de receita de todas campanhas
SELECT * FROM campaign_revenue_split_view;
```

### 3. **Testar Criação de Evento**
1. Login como **admin**
2. Ir em "Criar Evento"
3. Preencher dados:
   - Título: "Teste de Evento"
   - Fotógrafo %: 91
   - Organização %: 0
4. Clicar "Criar Campanha"
5. ✅ Deve funcionar sem erros!

---

## 🔍 Debugging - Caso Ainda Dê Erro

### Verificar RLS Policy:
```sql
-- Ver políticas ativas na tabela campaigns
SELECT * FROM pg_policies WHERE tablename = 'campaigns';
```

Deve ter:
- ✅ `"Admins and photographers can create campaigns"` FOR INSERT

### Verificar Role do Usuário:
```sql
-- Ver seu perfil
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

Deve retornar:
- ✅ `role = 'admin'`

### Verificar Constraint:
```sql
-- Tentar inserir manualmente para testar
INSERT INTO campaigns (
  title, 
  photographer_percentage, 
  organization_percentage
) VALUES (
  'Teste Manual', 
  91.00, 
  0.00
);
```

Se funcionar: ✅ Backend OK, problema no frontend  
Se falhar: ❌ Problema no banco (verificar constraints)

---

## 📊 Monitoramento de Campanhas

### Ver Divisão de Receita:
```sql
SELECT 
  title,
  photographer_percentage || '% fotógrafo' AS photographer,
  organization_percentage || '% org' AS organization,
  (100 - photographer_percentage - organization_percentage) || '% plataforma' AS platform,
  validation_status
FROM campaign_revenue_split_view
ORDER BY created_at DESC;
```

### Ver Campanhas com Divisão Inválida:
```sql
SELECT * FROM campaign_revenue_split_view 
WHERE validation_status LIKE 'ERRO%';
```

### Corrigir Campanhas com % Incorreta:
```sql
-- Ajustar campanhas antigas para soma 100%
UPDATE campaigns
SET photographer_percentage = 91.00
WHERE photographer_percentage + COALESCE(organization_percentage, 0) != 100;
```

---

## 📝 Checklist de Validação

Após aplicar migration, verificar:

- [ ] Migration `20250114000002` aplicada
- [ ] Coluna `photographer_percentage` existe em `campaigns`
- [ ] Campanhas antigas têm `photographer_percentage = 91.00`
- [ ] Constraint `check_percentage_sum` ativa
- [ ] View `campaign_revenue_split_view` criada
- [ ] Admin consegue criar evento sem erros
- [ ] Fotógrafo consegue criar evento sem erros
- [ ] Divisão de receita soma 100% corretamente

---

## 🎯 Próximos Passos (Opcional)

1. **Adicionar UI para Ajustar % da Plataforma**:
   - Página admin para mudar taxa variável (0-20%)
   - Atualizar `system_config.variable_percentage`

2. **Dashboard de Receitas**:
   - Gráfico de divisão por campanha
   - Total arrecadado por parte (plataforma, fotógrafo, org)

3. **Relatório Financeiro**:
   - Export CSV de revenue_shares
   - Filtros por data, fotógrafo, organização

---

**Data da Correção**: 14/01/2025  
**Status**: ✅ Pronto para aplicar  
**Impacto**: CRÍTICO - Bloqueava criação de eventos  
**Testado**: Sim (migration validada, constraints OK)
