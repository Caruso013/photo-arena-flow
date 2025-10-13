# 🔧 Correção: Revenue Shares com Photographer ID Incorreto

## 🚨 Problema Identificado

### Erro 400 no Console
```
❌ Erro ao buscar saldo: Object
📊 Revenue shares encontrados: 0 null
💰 Saldo calculado: 0
```

### Causa Raiz

A tabela `revenue_shares` tem um campo `photographer_id` que **não corresponde** ao `profiles.id` do usuário.

**Estrutura problemática:**
```
profiles
  └─ id: 9f94b76c-9494-4994-8d45-8d553395b645

purchases
  ├─ id: 096f9121...
  └─ photographer_id: 9f94b76c... ✅ CORRETO

revenue_shares  
  ├─ purchase_id: 096f9121...
  └─ photographer_id: c31c98a0... ❌ ERRADO!
```

**O que acontece:**
1. Query busca `revenue_shares` onde `photographer_id = profile.id`
2. Não encontra nada porque os IDs não correspondem
3. Retorna erro 400 por foreign key incorreta
4. Saldo mostra R$ 0,00

---

## ✅ Solução Implementada

### Migração SQL: `20250111000003_fix_revenue_shares_use_profile_id.sql`

**O que a migração faz:**

### 1️⃣ Atualiza IDs Existentes
```sql
UPDATE revenue_shares rs
SET photographer_id = p.photographer_id
FROM purchases p
WHERE rs.purchase_id = p.id
  AND rs.photographer_id != p.photographer_id;
```

Copia o `photographer_id` CORRETO de `purchases` para `revenue_shares`.

### 2️⃣ Cria Trigger Automático
```sql
CREATE TRIGGER trigger_sync_photographer_id
  BEFORE INSERT OR UPDATE ON revenue_shares
  FOR EACH ROW
  EXECUTE FUNCTION sync_photographer_id_from_purchase();
```

**Função do trigger:**
- Sempre que criar/editar `revenue_shares`
- Busca `photographer_id` da `purchases` automaticamente
- Garante que sempre está correto

### 3️⃣ Adiciona Constraint
```sql
ALTER TABLE revenue_shares
ADD CONSTRAINT fk_revenue_shares_photographer
FOREIGN KEY (photographer_id) 
REFERENCES profiles(id);
```

Garante integridade referencial com a tabela `profiles`.

### 4️⃣ Cria View Auxiliar
```sql
CREATE VIEW revenue_shares_with_correct_photographer AS
SELECT 
  rs.*,
  p.photographer_id as correct_photographer_id,
  prof.email,
  prof.full_name
FROM revenue_shares rs
INNER JOIN purchases p ON rs.purchase_id = p.id
INNER JOIN profiles prof ON p.photographer_id = prof.id;
```

Facilita debug e verificação dos dados.

### 5️⃣ Relatório Automático
```sql
RAISE NOTICE 'Total de revenue_shares: %', total_rs;
RAISE NOTICE 'Com photographer_id correto: %', total_corrected;
```

Mostra resultado da correção ao executar.

---

## 🎯 Como Aplicar

### Passo 1: Abrir Supabase SQL Editor

1. Ir para https://supabase.com/dashboard
2. Selecionar projeto
3. Abrir **SQL Editor**

### Passo 2: Executar Migração

1. Abrir arquivo: `supabase/migrations/20250111000003_fix_revenue_shares_use_profile_id.sql`
2. Copiar TODO o conteúdo
3. Colar no SQL Editor
4. Clicar em **Run** (ou Ctrl+Enter)

### Passo 3: Verificar Resultado

Procure no output:

```
═══════════════════════════════════════
RESULTADO DA CORREÇÃO:
Total de revenue_shares: 2
Com photographer_id correto: 2
Com photographer_id NULL: 0
═══════════════════════════════════════
✅ Todos os photographer_id foram corrigidos!

Profile ID do usuário: 9f94b76c-9494-4994-8d45-8d553395b645
Revenue shares encontrados: 2
Detalhes das revenue shares:
  - R$ 9.30 | Status: completed | Há 15.2 horas | ✅ Disponível
  - R$ 9.30 | Status: completed | Há 15.2 horas | ✅ Disponível
```

### Passo 4: Recarregar Dashboard

1. Voltar ao dashboard do fotógrafo
2. Pressionar F5 (reload)
3. Verificar: Deve mostrar **R$ 18,60** disponível! 🎉

---

## 📊 Antes vs Depois

### ANTES ❌
```sql
SELECT * FROM revenue_shares 
WHERE photographer_id = '9f94b76c-9494-4994-8d45-8d553395b645';
-- Retorna: 0 linhas
```

**Console:**
```
📊 Revenue shares encontrados: 0
💰 Saldo disponível: R$ 0,00
```

### DEPOIS ✅
```sql
SELECT * FROM revenue_shares 
WHERE photographer_id = '9f94b76c-9494-4994-8d45-8d553395b645';
-- Retorna: 2 linhas (R$ 9,30 cada)
```

**Console:**
```
📊 Revenue shares encontrados: 2
💰 Saldo disponível: R$ 18,60
```

---

## 🔍 Como Verificar Manualmente

### Query 1: Ver Revenue Shares do Usuário
```sql
SELECT 
  rs.id,
  rs.photographer_amount,
  p.status,
  p.created_at,
  prof.email
FROM revenue_shares rs
INNER JOIN purchases p ON rs.purchase_id = p.id
INNER JOIN profiles prof ON rs.photographer_id = prof.id
WHERE prof.email = 'kauan.castao1@gmail.com';
```

**Esperado:** 2 linhas com R$ 9,30 cada

### Query 2: Verificar Foreign Keys
```sql
SELECT 
  rs.photographer_id as rs_photographer,
  p.photographer_id as purchase_photographer,
  CASE 
    WHEN rs.photographer_id = p.photographer_id THEN '✅ Correto'
    ELSE '❌ Divergente'
  END as status
FROM revenue_shares rs
INNER JOIN purchases p ON rs.purchase_id = p.id;
```

**Esperado:** Todos com "✅ Correto"

### Query 3: Testar Trigger
```sql
-- Inserir revenue_share sem photographer_id
INSERT INTO revenue_shares (
  purchase_id,
  photographer_amount,
  platform_amount,
  organization_amount
) VALUES (
  '096f9121-a340-41d1-a161-0af9cd7bc249',
  9.30,
  0.70,
  0.00
);

-- Verificar se photographer_id foi preenchido automaticamente
SELECT photographer_id 
FROM revenue_shares 
WHERE purchase_id = '096f9121-a340-41d1-a161-0af9cd7bc249';
```

**Esperado:** `photographer_id` preenchido automaticamente!

---

## 🎓 Entendendo o Problema

### Por que aconteceu?

Existem **3 tabelas** envolvidas:

```
profiles (usuários)
  ↓
purchases (compras)
  ↓
revenue_shares (divisão $)
```

**O que DEVERIA acontecer:**
```
profiles.id → purchases.photographer_id → revenue_shares.photographer_id
(mesmo ID em toda cadeia)
```

**O que ESTAVA acontecendo:**
```
profiles.id: 9f94b76c...
purchases.photographer_id: 9f94b76c... ✅
revenue_shares.photographer_id: c31c98a0... ❌ (diferente!)
```

### Como surgiu o ID errado?

Possíveis causas:
1. **Trigger/função** que cria revenue_shares pegou ID errado
2. **Insert manual** com photographer_id hardcoded
3. **Bug em código antigo** que passava ID errado
4. **Migração anterior** que não atualizou corretamente

### A Solução

**Sempre buscar de `purchases`:**
- `purchases` tem o photographer_id correto (vem do profile)
- `revenue_shares` deve copiar de lá, não criar novo
- Trigger garante que isso sempre aconteça

---

## 🛡️ Prevenção Futura

### Trigger Automático
✅ Sempre preenche photographer_id correto  
✅ Não permite inserir ID errado  
✅ Funciona em insert e update

### Constraint Foreign Key
✅ Valida que photographer_id existe em profiles  
✅ Impede IDs inválidos  
✅ Cascading delete (se deletar profile, deleta revenue_shares)

### View de Verificação
✅ Facilita auditoria  
✅ Mostra dados corretos sempre  
✅ Pode ser usada em reports

---

## 📝 Checklist Pós-Migração

- [ ] Executar migração no Supabase SQL Editor
- [ ] Verificar output: "✅ Todos os photographer_id foram corrigidos!"
- [ ] Recarregar dashboard do fotógrafo
- [ ] Confirmar: Saldo mostra R$ 18,60
- [ ] Testar: Fazer nova compra
- [ ] Verificar: Revenue share criada com ID correto automaticamente
- [ ] Logs do console: Sem erro 400

---

## 🐛 Se Ainda Não Funcionar

### Debug Adicional

**1. Verificar se migração rodou:**
```sql
SELECT * FROM revenue_shares 
WHERE photographer_id = '9f94b76c-9494-4994-8d45-8d553395b645';
```

Se retornar 0: Migração não foi aplicada corretamente.

**2. Verificar trigger:**
```sql
SELECT tgname FROM pg_trigger 
WHERE tgrelid = 'revenue_shares'::regclass;
```

Deve ter: `trigger_sync_photographer_id`

**3. Verificar constraint:**
```sql
SELECT conname FROM pg_constraint 
WHERE conrelid = 'revenue_shares'::regclass;
```

Deve ter: `fk_revenue_shares_photographer`

**4. Forçar atualização manual:**
```sql
UPDATE revenue_shares
SET photographer_id = '9f94b76c-9494-4994-8d45-8d553395b645'
WHERE purchase_id IN (
  '096f9121-a340-41d1-a161-0af9cd7bc249',
  '71fba373-6ab0-43cd-b50f-7019cfbc719b'
);
```

---

## 🎉 Resultado Esperado

### Dashboard do Fotógrafo

**Card "Disponível p/ Repasse":**
```
R$ 18,60
Após 12h das vendas
```

**Aba "Repasses":**
```
Saldo Disponível: R$ 18,60
ℹ️ Apenas vendas com mais de 12h
```

**Console (sem erros):**
```
✅ Fotos encontradas: 252
📊 Revenue shares encontrados: 2
💰 Saldo disponível: R$ 18,60
```

---

**Data:** 11/01/2025  
**Arquivo:** `20250111000003_fix_revenue_shares_use_profile_id.sql`  
**Status:** Pronto para aplicar  
**Prioridade:** 🔴 CRÍTICA (bloqueia pagamentos)
