

# Plano de Emergencia: Corrigir Vendas Nao Computadas

## Diagnostico Completo

Apos investigacao profunda no banco de dados, encontrei **3 problemas criticos** que estao causando perda de vendas:

### Problema 1: Webhook falha silenciosamente para compras em lote (CRITICO)

No arquivo `supabase/functions/mercadopago-webhook/index.ts`, linha 84:

```text
.or(`stripe_payment_intent_id.like.%${externalRef}%,id.eq.${externalRef}`)
```

Quando o cliente compra mais de 1 foto, o `externalRef` vem no formato `batch_43dde03f_2_mlirtb1k`. A parte `id.eq.batch_43dde03f_2_mlirtb1k` tenta comparar uma coluna UUID com um texto invalido, causando erro no Postgres. O erro faz a query inteira falhar e o webhook nao processa o pagamento.

**Impacto medido:**
- 125 compras em lote travadas (R$ 1.529,46)
- 39 compras avulsas travadas (R$ 464,92)
- Total: **164 compras, R$ 1.994,38** com webhooks recebidos mas nao processados
- Dessas, **74 compras (R$ 927,55)** sao vendas realmente perdidas (cliente nunca recebeu as fotos e nao retentou)

### Problema 2: Saldo do fotografo limitado a 1000 registros

O hook `usePhotographerBalance.ts` busca todos os `revenue_shares` sem paginacao. O Supabase limita a 1000 linhas por padrao. O fotografo Kauan tem **1.037 vendas**, entao 37 sao ignoradas no calculo.

**Impacto:** O dashboard mostra R$ 111,46 quando o saldo real e R$ 435,78. Isso causa confusao e reclamacoes.

### Problema 3: Pagina de processamento nao encontra compras em lote

No `CheckoutProcessing.tsx`, linha 39:

```text
.like('stripe_payment_intent_id', `batch:${externalRef}%`)
```

Usa `batch:` (dois pontos) mas o formato real e `batch_` (underscore). Compras em lote nunca sao encontradas pelo polling, e o cliente ve "tempo limite" mesmo quando o pagamento foi aprovado.

---

## Plano de Correcao (3 etapas)

### Etapa 1: Corrigir o webhook (URGENTE)

**Arquivo:** `supabase/functions/mercadopago-webhook/index.ts`

Remover o `id.eq.` da query OR para evitar erro de UUID invalido. Usar apenas o LIKE que funciona para ambos os formatos:

```text
ANTES:  .or(`stripe_payment_intent_id.like.%${externalRef}%,id.eq.${externalRef}`)
DEPOIS: .like('stripe_payment_intent_id', `%${externalRef}%`)
```

Tambem adicionar tratamento para compras com status `failed` (nao apenas `pending`), para que o webhook consiga recuperar vendas que foram marcadas como falhas pela reconciliacao antes do pagamento chegar.

### Etapa 2: Corrigir o calculo de saldo

**Arquivo:** `src/hooks/usePhotographerBalance.ts`

Adicionar paginacao para buscar TODOS os revenue_shares, nao apenas os primeiros 1000:

```text
// Buscar em lotes de 1000 ate pegar todos
let allRevenue = [];
let from = 0;
const PAGE_SIZE = 1000;
while (true) {
  const { data } = await supabase
    .from('revenue_shares')
    .select(...)
    .eq('photographer_id', effectiveId)
    .range(from, from + PAGE_SIZE - 1);
  
  allRevenue = [...allRevenue, ...(data || [])];
  if (!data || data.length < PAGE_SIZE) break;
  from += PAGE_SIZE;
}
```

### Etapa 3: Corrigir pagina de processamento

**Arquivo:** `src/pages/CheckoutProcessing.tsx`

Corrigir o filtro de busca para usar o formato correto:

```text
ANTES:  .like('stripe_payment_intent_id', `batch:${externalRef}%`)
DEPOIS: .like('stripe_payment_intent_id', `${externalRef}%`)
```

---

## Recuperacao dos Dados Perdidos

Apos corrigir e deployar o webhook, sera necessario executar a reconciliacao manual para tentar recuperar as 74 vendas perdidas (R$ 927,55). O sistema ja tem um botao de reconciliacao no painel admin. Porem, a funcao de reconciliacao tambem precisa de um ajuste: atualmente so verifica purchases `pending`, mas muitas vendas travadas estao como `failed`. Vou atualizar o `reconcile-pending-purchases` para tambem verificar `failed`.

**Arquivo:** `supabase/functions/reconcile-pending-purchases/index.ts`

```text
ANTES:  .eq('status', 'pending')
DEPOIS: .in('status', ['pending', 'failed'])
```

---

## Ordem de Execucao

1. Corrigir webhook (etapa 1) + deploy imediato
2. Corrigir reconciliacao + deploy
3. Executar reconciliacao manual para recuperar vendas perdidas
4. Corrigir calculo de saldo (etapa 2)
5. Corrigir pagina de processamento (etapa 3)

## Resumo dos Arquivos Alterados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/mercadopago-webhook/index.ts` | Remover `id.eq.` da query, aceitar status `failed` |
| `supabase/functions/reconcile-pending-purchases/index.ts` | Incluir `failed` na busca |
| `src/hooks/usePhotographerBalance.ts` | Paginar busca de revenue_shares |
| `src/pages/CheckoutProcessing.tsx` | Corrigir filtro `batch:` para `batch_` |

