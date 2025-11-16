# 🛒 Guia de Integração: Carrinho com Descontos

Este guia mostra como integrar **descontos progressivos** e **cupons** no carrinho de compras.

---

## 📦 Componentes Disponíveis

### 1. `ProgressiveDiscountDisplay`
Exibe desconto progressivo e mensagens de incentivo.

**Localização:** `src/components/cart/ProgressiveDiscountDisplay.tsx`

```tsx
import { ProgressiveDiscountDisplay, ProgressiveDiscountLine } from '@/components/cart/ProgressiveDiscountDisplay';

// Versão completa (com incentivos)
<ProgressiveDiscountDisplay
  quantity={cartItems.length}
  unitPrice={20.00}
  showIncentive={true}
  compact={false}
/>

// Versão compacta (badge no header)
<ProgressiveDiscountDisplay
  quantity={cartItems.length}
  unitPrice={20.00}
  compact={true}
/>

// Linha de resumo (checkout)
<ProgressiveDiscountLine
  quantity={cartItems.length}
  unitPrice={20.00}
/>
```

### 2. `CouponInput`
Campo para aplicar cupons de desconto.

**Localização:** `src/components/cart/CouponInput.tsx`

```tsx
import { CouponInput, CouponDiscountLine } from '@/components/cart/CouponInput';
import { useState } from 'react';

const [appliedCoupon, setAppliedCoupon] = useState(null);

// Input de cupom
<CouponInput
  purchaseAmount={subtotal}
  onCouponApplied={(result) => setAppliedCoupon(result)}
  onCouponRemoved={() => setAppliedCoupon(null)}
  appliedCoupon={appliedCoupon}
/>

// Linha de resumo (checkout)
<CouponDiscountLine appliedCoupon={appliedCoupon} />
```

---

## 🔧 Exemplo Completo: Carrinho de Compras

```tsx
import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useProgressiveDiscount } from '@/hooks/useProgressiveDiscount';
import { ProgressiveDiscountDisplay, ProgressiveDiscountLine } from '@/components/cart/ProgressiveDiscountDisplay';
import { CouponInput, CouponDiscountLine } from '@/components/cart/CouponInput';
import { CouponValidationResult } from '@/hooks/useCoupons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const ShoppingCart = () => {
  const { items } = useCart();
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);

  // Configurações
  const UNIT_PRICE = 20.00; // Preço por foto
  const quantity = items.length;

  // Calcular descontos
  const progressiveDiscount = useProgressiveDiscount(quantity, UNIT_PRICE);
  const couponDiscount = appliedCoupon?.discount_amount || 0;

  // Totais
  const subtotal = quantity * UNIT_PRICE;
  const totalDiscounts = progressiveDiscount.discountAmount + couponDiscount;
  const finalTotal = subtotal - totalDiscounts;

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">🛒 Seu Carrinho</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Itens */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fotos Selecionadas ({quantity})</CardTitle>
            </CardHeader>
            <CardContent>
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 border-b last:border-0">
                  <img 
                    src={item.thumbnail_url} 
                    alt="Foto" 
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">Foto #{item.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {UNIT_PRICE.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Desconto Progressivo */}
          <ProgressiveDiscountDisplay
            quantity={quantity}
            unitPrice={UNIT_PRICE}
            showIncentive={true}
          />

          {/* Cupom de Desconto */}
          <CouponInput
            purchaseAmount={subtotal}
            onCouponApplied={setAppliedCoupon}
            onCouponRemoved={() => setAppliedCoupon(null)}
            appliedCoupon={appliedCoupon}
          />
        </div>

        {/* Resumo do Pedido */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({quantity} fotos)</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>

              <Separator />

              {/* Desconto Progressivo */}
              <ProgressiveDiscountLine
                quantity={quantity}
                unitPrice={UNIT_PRICE}
              />

              {/* Desconto de Cupom */}
              <CouponDiscountLine appliedCoupon={appliedCoupon} />

              {/* Total de Descontos */}
              {totalDiscounts > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between font-medium text-red-600 dark:text-red-400">
                    <span>Total de Descontos</span>
                    <span>-R$ {totalDiscounts.toFixed(2)}</span>
                  </div>
                </>
              )}

              <Separator />

              {/* Total Final */}
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {finalTotal.toFixed(2)}</span>
              </div>

              {/* Economia */}
              {totalDiscounts > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    🎉 Você está economizando
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    R$ {totalDiscounts.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Botão de Finalizar */}
              <Button 
                className="w-full" 
                size="lg"
                disabled={quantity === 0}
              >
                Finalizar Compra
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
```

---

## 💾 Salvar Descontos na Compra

Ao finalizar a compra, salve os descontos na tabela `purchases`:

```tsx
const handleCheckout = async () => {
  try {
    const purchaseData = {
      user_id: user.id,
      campaign_id: campaignId,
      amount: finalTotal,
      status: 'pending',
      
      // Desconto Progressivo
      progressive_discount_percentage: progressiveDiscount.discountPercentage,
      progressive_discount_amount: progressiveDiscount.discountAmount,
      
      // Cupom (adicionar colunas na tabela purchases)
      coupon_id: appliedCoupon?.coupon_id || null,
      coupon_discount_amount: couponDiscount,
    };

    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert(purchaseData)
      .select()
      .single();

    if (error) throw error;

    // Registrar uso do cupom se aplicado
    if (appliedCoupon && appliedCoupon.valid) {
      await supabase.from('coupon_uses').insert({
        coupon_id: appliedCoupon.coupon_id,
        user_id: user.id,
        purchase_id: purchase.id,
        discount_amount: couponDiscount,
        original_amount: subtotal,
        final_amount: finalTotal,
      });
    }

    // Prosseguir para pagamento...
  } catch (error) {
    console.error('Erro ao processar compra:', error);
  }
};
```

---

## 📊 Migration para Adicionar Colunas de Cupom

Adicione estas colunas na tabela `purchases`:

```sql
-- Adicionar coluna de cupom
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS coupon_discount_amount numeric DEFAULT 0 CHECK (coupon_discount_amount >= 0);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_purchases_coupon ON public.purchases(coupon_id);

-- Comentários
COMMENT ON COLUMN public.purchases.coupon_id IS 'ID do cupom aplicado na compra';
COMMENT ON COLUMN public.purchases.coupon_discount_amount IS 'Valor do desconto do cupom em R$';
```

---

## 🎨 Variações de Layout

### Badge Compacto (Header do Carrinho)

```tsx
<div className="flex items-center gap-2">
  <ShoppingCart className="h-5 w-5" />
  <span>{items.length} itens</span>
  <ProgressiveDiscountDisplay
    quantity={items.length}
    unitPrice={20.00}
    compact={true}
  />
</div>
```

### Sem Incentivos (Apenas Desconto Ativo)

```tsx
<ProgressiveDiscountDisplay
  quantity={items.length}
  unitPrice={20.00}
  showIncentive={false}
/>
```

---

## ✅ Checklist de Integração

- [ ] Importar componentes `ProgressiveDiscountDisplay` e `CouponInput`
- [ ] Criar state para `appliedCoupon`
- [ ] Calcular `progressiveDiscount` usando hook
- [ ] Calcular `finalTotal` com ambos os descontos
- [ ] Exibir linhas de desconto no resumo
- [ ] Adicionar colunas `coupon_id` e `coupon_discount_amount` em `purchases`
- [ ] Salvar descontos ao criar purchase
- [ ] Registrar uso do cupom em `coupon_uses`
- [ ] Testar fluxo completo de checkout

---

## 🐛 Troubleshooting

**Cupom não valida:**
- Verificar se usuário está autenticado
- Conferir se `purchaseAmount` está correto
- Validar se cupom está ativo no admin

**Desconto progressivo não aparece:**
- Verificar se `quantity` e `unitPrice` são válidos
- Testar com quantidade >= 5 para ver desconto

**Total incorreto:**
- Somar: `subtotal - progressiveDiscount - couponDiscount`
- Garantir que descontos não sejam negativos

---

## 📚 Documentação Relacionada

- [Sistema de Cupons](../IMPLEMENTACOES_14_JAN_2025.md#2-sistema-de-cupons)
- [Descontos Progressivos](../IMPLEMENTACOES_14_JAN_2025.md#3-descontos-progressivos)
- [Hook useCoupons](../../src/hooks/useCoupons.ts)
- [Hook useProgressiveDiscount](../../src/hooks/useProgressiveDiscount.ts)

---

**Pronto! 🎉**  
Seu carrinho agora tem descontos progressivos e sistema de cupons totalmente integrado!
