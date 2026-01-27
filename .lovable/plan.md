
# Plano de Correção: Compras Pendentes, Liberação de Foto e Webhook

## Resumo dos Problemas

| # | Problema | Causa Raiz | Impacto |
|---|----------|------------|---------|
| 1 | Compras "pending" não liberadas (3113 registros) | Webhook não atualiza status corretamente | Clientes pagaram mas não recebem fotos |
| 2 | Erro RLS ao liberar foto como admin | Policy INSERT na tabela `purchases` não permite admins | Erro "new row violates row-level security" |
| 3 | Webhook não é confiável | Não há sistema de reconciliação para pagamentos aprovados | Pagamentos podem ficar pendentes indefinidamente |

---

## Problema 1: Erro de RLS ao Liberar Foto

### Causa
A política de INSERT na tabela `purchases` permite apenas:
```sql
auth.uid() = buyer_id
```
Isso bloqueia administradores de criar compras gratuitas para outros usuários.

### Solução
Criar nova política RLS que permite admins inserir compras em nome de qualquer usuário:

```sql
CREATE POLICY "Admins can create purchases for any user"
ON public.purchases
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
);
```

### Arquivos Afetados
- **Migration SQL** (nova política RLS)

---

## Problema 2: Sistema de Reconciliação Automática

### Objetivo
Liberar automaticamente compras pendentes cujo pagamento foi aprovado no Mercado Pago.

### Solução
1. **Edge Function `reconcile-pending-purchases`**: Verifica pagamentos no MP e atualiza status
2. **Botão manual no Admin Dashboard**: Permite forçar reconciliação
3. **Reconciliação automática**: Roda ao carregar o dashboard

### Lógica de Reconciliação
```text
1. Buscar purchases com:
   - status = 'pending'
   - created_at < now() - 10 minutos
   - stripe_payment_intent_id contém "|mp:"
   
2. Para cada purchase:
   - Extrair payment_id do MP
   - Consultar API do MP
   - Se status = 'approved' → atualizar para 'completed'
   
3. Trigger existente cria revenue_shares automaticamente
```

### Arquivos a Criar/Modificar
- **`supabase/functions/reconcile-pending-purchases/index.ts`** (nova edge function)
- **`src/components/dashboard/AdminDashboard.tsx`** (botão + auto-reconciliação)

---

## Problema 3: Cupons + Desconto Progressivo

### Status Atual
Os cupons já estão funcionando corretamente:
- `PROMO20`: ativo, válido até 28/02/2026, 20% de desconto
- `BEMVINDO10`: ativo, sem data de expiração, 10% de desconto (mínimo R$50)

### O que falta
O sistema de cupons não está integrado ao checkout transparente (`TransparentCheckout.tsx`). O desconto progressivo já está, mas o cupom precisa ser passado para a edge function.

### Solução
1. Adicionar `appliedCoupon` como prop do `TransparentCheckout`
2. Enviar `coupon_id` e `coupon_discount` para a edge function `mercadopago-checkout`
3. Aplicar desconto do cupom após o desconto progressivo

### Arquivos a Modificar
- **`src/components/checkout/TransparentCheckout.tsx`** (receber coupon)
- **`src/components/modals/PaymentModal.tsx`** (passar coupon para checkout)
- **`supabase/functions/mercadopago-checkout/index.ts`** (aplicar coupon)

---

## Detalhes Técnicos

### 1. Nova Edge Function: reconcile-pending-purchases

```typescript
// Fluxo principal
1. Buscar purchases pending com >10min de idade e payment_id do MP
2. Para cada uma, consultar API do MP
3. Se approved → update para completed
4. Retornar relatório: {reconciled: 5, failed: 1, skipped: 3}
```

**Segurança:**
- Apenas admins podem chamar (validação via authHelpers)
- Rate limit para evitar spam na API do MP

### 2. Modificação AdminDashboard

```typescript
// Novo estado
const [reconciling, setReconciling] = useState(false);
const [lastReconciliation, setLastReconciliation] = useState(null);

// Auto-reconciliação ao carregar (1x por sessão)
useEffect(() => {
  if (!hasRunReconciliation) {
    runReconciliation();
    setHasRunReconciliation(true);
  }
}, []);

// Botão manual
<Button onClick={runReconciliation} disabled={reconciling}>
  {reconciling ? "Reconciliando..." : "Reconciliar Pagamentos"}
</Button>
```

### 3. Política RLS para Admins

```sql
-- Permitir admins criar purchases (liberação gratuita)
CREATE POLICY "Admins can create purchases for any user"
ON public.purchases
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
```

---

## Fluxo de Cupom no Checkout

```text
Carrinho
   ↓
Aplica Cupom (CouponInput)
   ↓
Abre PaymentModal com appliedCoupon
   ↓
Passa para TransparentCheckout
   ↓
Envia para mercadopago-checkout:
  - discount.progressive_amount
  - discount.coupon_amount
  - discount.coupon_id
   ↓
Calcula finalTotal = subtotal - progressive - coupon
   ↓
Cria pagamento no MP com finalTotal
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/reconcile-pending-purchases/index.ts` | Edge function de reconciliação |
| `supabase/migrations/xxx_admin_purchase_policy.sql` | Política RLS para admins |

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/dashboard/AdminDashboard.tsx` | Adicionar reconciliação automática + botão manual |
| `src/components/checkout/TransparentCheckout.tsx` | Receber e processar cupom |
| `src/components/modals/PaymentModal.tsx` | Passar appliedCoupon para TransparentCheckout |
| `supabase/functions/mercadopago-checkout/index.ts` | Processar cupom no cálculo de desconto |

---

## Ordem de Implementação

1. **Primeiro**: Corrigir RLS (liberar foto como admin)
2. **Segundo**: Criar edge function de reconciliação
3. **Terceiro**: Integrar reconciliação no dashboard
4. **Quarto**: Integrar cupom no checkout transparente

---

## Resultado Esperado

Após as correções:
- Admins poderão liberar fotos gratuitamente sem erro RLS
- Compras pendentes serão reconciliadas automaticamente (após 10min)
- Admin terá botão para forçar reconciliação manual
- Cupons funcionarão no checkout transparente (PIX + Cartão)
- Os 3113 registros pendentes serão processados e liberados conforme status no MP
