# 🔍 DEBUG: Saldo Disponível não Aparece

## 🚨 Problema Reportado

**Situação:**
- ✅ 2 vendas realizadas (R$ 93,00 cada)
- ✅ Vendas com mais de 12 horas (05:34, agora são 20:35)
- ❌ Saldo mostra **R$ 0,00** (deveria ser R$ 186,00)

**Dados do banco:**
```
purchase_id: 096f9121-a340-41d1-a161-0af9cd7bc249
photographer_id (revenue): c31c98a0-b78f-41fc-9430-78559cf811d1
photographer_amount: 93.00
created_at: 2025-10-11 05:34

purchase_id: 71fba373-6ab0-43cd-b50f-7019cfbc719b  
photographer_id (revenue): c31c98a0-b78f-41fc-9430-78559cf811d1
photographer_amount: 93.00
created_at: 2025-10-11 05:34

profile_id (usuário): 9f94b76c-9494-4994-8d45-8d553395b6c4
email: kauan.castao1@gmail.com
role: photographer
```

---

## 🎯 Possíveis Causas

### 1️⃣ **IDs Não Correspondem** (MAIS PROVÁVEL)

**Hipótese:** As `revenue_shares` estão com `photographer_id` diferente do `profile.id` do usuário logado.

**Evidência:**
- Profile do usuário: `9f94b76c-9494-4994-8d45-8d553395b6c4`
- Revenue shares: `c31c98a0-b78f-41fc-9430-78559cf811d1`

**Query atual:**
```typescript
.from('revenue_shares')
.select('...')
.eq('photographer_id', profile?.id) // Busca pelo profile.id
```

**Se os IDs não correspondem:** Query retorna 0 resultados!

---

### 2️⃣ **Problema na Foreign Key**

**Hipótese:** A query com foreign key está retornando NULL para purchases.

**Query problemática:**
```typescript
.select('photographer_amount, purchases!revenue_shares_purchase_id_fkey(created_at, status)')
```

**Se purchase_id está NULL ou FK está errada:** `row.purchases` será NULL.

---

### 3️⃣ **Status Não é 'completed'**

**Hipótese:** Compras estão com status diferente de 'completed'.

**Verificar:**
```sql
SELECT status FROM purchases 
WHERE id IN (
  '096f9121-a340-41d1-a161-0af9cd7bc249',
  '71fba373-6ab0-43cd-b50f-7019cfbc719b'
);
```

---

### 4️⃣ **created_at NULL ou Formato Errado**

**Hipótese:** Data está NULL ou em formato que não é reconhecido.

**Verificar:**
```sql
SELECT created_at, status 
FROM purchases 
WHERE id = '096f9121-a340-41d1-a161-0af9cd7bc249';
```

---

## 🧪 Como Debugar

### Passo 1: Abrir Console do Navegador

1. Login como fotógrafo (kauan.castao1@gmail.com)
2. Ir no Dashboard
3. Abrir DevTools (F12)
4. Ir na aba **Console**
5. Recarregar página (F5)

### Passo 2: Verificar Logs

Procure pelos logs que adicionei:

```
═══════════════════════════════════════════
🚀 Iniciando fetchStats
👤 Profile ID: 9f94b76c-9494-4994-8d45-8d553395b6c4
👤 User ID: ...
📧 Email: kauan.castao1@gmail.com
═══════════════════════════════════════════

🔍 Buscando revenue_shares para photographer_id: 9f94b76c...

📊 Revenue shares encontrados: X [...]

📌 Revenue share 1: { amount: 93, purchase_status: '...', ... }

⏰ Horas desde venda: XX.XXh { ... }

💰 Saldo calculado: XX
📋 Solicitações de repasse: [...]
💸 Valor em solicitações pendentes: XX
🎯 SALDO FINAL DISPONÍVEL: XX
```

---

## 📋 Checklist de Verificação

### No Console do Navegador

- [ ] **Profile ID** está correto?
- [ ] **Revenue shares encontrados** retorna > 0?
  - Se retorna 0: Problema de ID (causa #1)
- [ ] **Purchase status** é 'completed'?
  - Se não: Problema de status (causa #3)
- [ ] **Horas desde venda** é > 12?
  - Se não: Ainda não liberou (aguardar)
- [ ] **Saldo calculado** é > 0?
  - Se sim mas final é 0: Problema de solicitações pendentes

### No Supabase (SQL Editor)

**Query 1: Verificar Revenue Shares**
```sql
SELECT 
  rs.id,
  rs.purchase_id,
  rs.photographer_id,
  rs.photographer_amount,
  p.status as purchase_status,
  p.created_at as purchase_created,
  EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 as hours_ago
FROM revenue_shares rs
LEFT JOIN purchases p ON rs.purchase_id = p.id
WHERE rs.purchase_id IN (
  '096f9121-a340-41d1-a161-0af9cd7bc249',
  '71fba373-6ab0-43cd-b50f-7019cfbc719b'
);
```

**Esperado:**
- `photographer_id` deve ser igual ao profile.id do usuário
- `purchase_status` = 'completed'
- `hours_ago` > 12
- `photographer_amount` = 93.00

---

**Query 2: Verificar Profile**
```sql
SELECT 
  id,
  email,
  full_name,
  role
FROM profiles
WHERE email = 'kauan.castao1@gmail.com';
```

**Esperado:**
- `id` = `9f94b76c-9494-4994-8d45-8d553395b6c4`
- `role` = 'photographer'

---

**Query 3: Buscar Revenue Shares do Fotógrafo**
```sql
SELECT 
  rs.*,
  p.status,
  p.created_at
FROM revenue_shares rs
LEFT JOIN purchases p ON rs.purchase_id = p.id
WHERE rs.photographer_id = '9f94b76c-9494-4994-8d45-8d553395b6c4';
```

**Se retornar 0 linhas:**
- ❌ Problema confirmado: `photographer_id` nas revenue_shares está errado!

---

## 🔧 Correções Possíveis

### Correção 1: Atualizar photographer_id nas Revenue Shares

**Se o photographer_id está errado:**

```sql
-- Buscar o ID correto do profile
SELECT id FROM profiles WHERE email = 'kauan.castao1@gmail.com';
-- Resultado: 9f94b76c-9494-4994-8d45-8d553395b6c4

-- Atualizar revenue_shares
UPDATE revenue_shares
SET photographer_id = '9f94b76c-9494-4994-8d45-8d553395b6c4'
WHERE purchase_id IN (
  '096f9121-a340-41d1-a161-0af9cd7bc249',
  '71fba373-6ab0-43cd-b50f-7019cfbc719b'
);
```

---

### Correção 2: Verificar Trigger de Revenue Shares

O problema pode estar no trigger que cria as revenue_shares automaticamente.

**Verificar trigger:**
```sql
-- Ver triggers na tabela purchases
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'purchases'::regclass;
```

**Procurar por:** Trigger que cria `revenue_shares` após insert em `purchases`

---

### Correção 3: Atualizar Status das Compras

**Se status não é 'completed':**

```sql
UPDATE purchases
SET status = 'completed'
WHERE id IN (
  '096f9121-a340-41d1-a161-0af9cd7bc249',
  '71fba373-6ab0-43cd-b50f-7019cfbc719b'
)
AND status != 'completed';
```

---

## 🎯 Próximos Passos

### 1. Coletar Informações (COM OS LOGS)

1. ✅ Logs já adicionados no código
2. Recarregar dashboard
3. Copiar TODOS os logs do console
4. Enviar para análise

### 2. Verificar no Banco

1. Executar as 3 queries no Supabase SQL Editor
2. Anotar resultados
3. Comparar IDs

### 3. Aplicar Correção

Baseado nos logs/queries, aplicar a correção apropriada:
- **Se IDs errados:** Correção #1
- **Se trigger problema:** Correção #2  
- **Se status errado:** Correção #3

---

## 📊 Template de Resposta

**Por favor, envie:**

```
=== LOGS DO CONSOLE ===
[Cole aqui todos os logs começando com 🚀]

=== QUERY 1 (Revenue Shares) ===
[Resultado da query]

=== QUERY 2 (Profile) ===
[Resultado da query]

=== QUERY 3 (Buscar Revenue Shares) ===
[Resultado da query - quantas linhas retornou?]
```

---

## 🔍 Análise Rápida

Com base nos prints, **minha suspeita principal:**

❌ **Os `photographer_id` nas revenue_shares estão errados!**

**Evidência:**
- Revenue shares: `c31c98a0-b78f-41fc-9430-78559cf811d1`
- Profile do usuário: `9f94b76c-9494-4994-8d45-8d553395b6c4`

**São IDs diferentes!**

**Solução rápida:**
```sql
UPDATE revenue_shares
SET photographer_id = '9f94b76c-9494-4994-8d45-8d553395b6c4'
WHERE photographer_id = 'c31c98a0-b78f-41fc-9430-78559cf811d1';
```

⚠️ **MAS VERIFIQUE PRIMEIRO** se `c31c98a0...` é outro fotógrafo válido!

---

**Criado em:** 11/01/2025 20:40  
**Status:** Aguardando logs do console para diagnóstico preciso  
**Prioridade:** 🔴 ALTA (afeta pagamentos)
