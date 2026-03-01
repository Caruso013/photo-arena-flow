

## Análise do Problema

Olhando o screenshot, os eventos passados estão em ordem **ascendente** (19/02 → 25/02 → 27/02), quando deveriam estar em ordem **descendente** (27/02 → 25/02 → 19/02 = mais recentes primeiro).

O código de ordenação no `Events.tsx` (linhas 146-159) já foi corrigido na última edição e parece correto. Porém, identifiquei que há campanhas no banco com `event_date = NULL` (ex: "4ª Rodada Copa Biritiba"), o que pode corromper a ordenação do `Array.sort()`.

### Correção

**Arquivo:** `src/pages/Events.tsx`

1. Adicionar proteção contra `event_date` nulo no sort — tratar como data muito antiga (final da lista)
2. Garantir que a query do banco também ordene por `event_date` em vez de `created_at`, para que o estado inicial já venha na ordem correta antes do `useMemo` rodar

**Mudanças específicas:**
- Na função `fetchCampaigns`: trocar `.order('created_at', { ascending: false })` → `.order('event_date', { ascending: false, nullsFirst: false })`
- No sort do `useMemo`: adicionar fallback para `event_date` nulo (`new Date(a.event_date || '1970-01-01')`)

São ajustes mínimos em ~4 linhas no arquivo `Events.tsx`.

