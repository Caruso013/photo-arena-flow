

## Problema Identificado

O bug está no `mercadopago-checkout/index.ts` (linha 216): cada purchase armazena `amount: photo.price` (preço cheio), mas o desconto só é aplicado no valor total enviado ao Mercado Pago. Quando o trigger `calculate_revenue_shares()` calcula a divisão, usa `NEW.amount` — que é o preço cheio. Resultado: a soma dos revenue shares é maior que o valor realmente pago.

**Exemplo concreto:** 5 fotos × R$12,90 = R$64,50 bruto. Com 5% desconto progressivo = R$61,28 pago. Mas os revenue shares são calculados em cima dos R$64,50, gerando valores incorretos para todos (organização, fotógrafo e plataforma).

## Plano de Correção

### 1. Corrigir `mercadopago-checkout/index.ts`
- Calcular o valor descontado proporcional por foto
- Armazenar o valor **final após desconto** no campo `amount` de cada purchase
- Também preencher os campos `progressive_discount_percentage` e `progressive_discount_amount` que já existem na tabela mas não estão sendo usados

**Lógica:**
```text
desconto_total = desconto_progressivo + desconto_cupom
fator_desconto = finalTotal / subtotal  (ex: 61.28/64.50 = 0.95)
amount_por_foto = photo.price * fator_desconto  (ex: 12.90 * 0.95 = 12.255)
```

### 2. Nenhuma mudança necessária no trigger SQL
O trigger `calculate_revenue_shares()` já calcula corretamente com base em `NEW.amount`. Basta garantir que `amount` contenha o valor correto (pós-desconto).

### Arquivo modificado
- `supabase/functions/mercadopago-checkout/index.ts` — seção de criação de purchases (linhas 196-228)

### Impacto
- Compras futuras terão revenue shares corretos
- Compras passadas **não serão afetadas** (já estão gravadas com valores antigos)

