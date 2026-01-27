
# ✅ Plano de Correção: Compras Pendentes, Liberação de Foto e Webhook

## Status: IMPLEMENTADO ✅

---

## Correções Aplicadas

### 1. ✅ Política RLS para Admin Liberar Fotos
**Migration aplicada**: Admins e fotógrafos podem criar purchases em nome de outros usuários.
- `Admins can create purchases for any user`
- `Photographers can create free purchases for their photos`

### 2. ✅ Edge Function de Reconciliação Automática
**Arquivo criado**: `supabase/functions/reconcile-pending-purchases/index.ts`
- Busca purchases pending com >10min de idade
- Verifica status no Mercado Pago
- Atualiza para 'completed' se aprovado
- Rate limit de 100ms entre requests

### 3. ✅ Integração no AdminDashboard
**Arquivo modificado**: `src/components/dashboard/AdminDashboard.tsx`
- Auto-reconciliação ao carregar (1x por sessão)
- Botão manual "Executar Reconciliação"
- Exibe resultado da última reconciliação

### 4. ✅ Cupons no Checkout Transparente
**Arquivos modificados**:
- `src/components/checkout/TransparentCheckout.tsx` - Recebe `appliedCoupon` prop
- `src/components/modals/PaymentModal.tsx` - Passa cupom para checkout
- `supabase/functions/mercadopago-checkout/index.ts` - Processa desconto do cupom

---

## Resumo das Compras Pendentes

| Métrica | Valor |
|---------|-------|
| Total pendentes | 3.113 |
| Com payment_id do MP | 43 |
| Prontas para reconciliação | 43 |

A reconciliação automática será executada quando um admin acessar o dashboard.

---

## Como Funciona Agora

### Fluxo de Reconciliação
```
Admin acessa dashboard
        ↓
Após 2s, executa reconcile-pending-purchases
        ↓
Busca purchases pending com >10min
        ↓
Verifica cada payment no MP
        ↓
Se approved → UPDATE status = 'completed'
        ↓
Trigger cria revenue_shares automaticamente
```

### Fluxo de Cupom
```
Carrinho com cupom aplicado
        ↓
Abre PaymentModal (recebe appliedCoupon)
        ↓
Passa para TransparentCheckout
        ↓
Envia para mercadopago-checkout:
  - discount.amount (progressivo)
  - coupon.amount (cupom)
        ↓
finalTotal = subtotal - progressivo - cupom
        ↓
Cria pagamento no MP com valor final
```

---

## Edge Functions Deployadas
- ✅ `reconcile-pending-purchases` (nova)
- ✅ `mercadopago-checkout` (atualizada)

---

## Próximos Passos Recomendados
1. Testar liberação de foto como admin
2. Verificar reconciliação automática no dashboard
3. Testar checkout com cupom aplicado
