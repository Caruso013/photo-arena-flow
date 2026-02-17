

# Plano: Filtros Funcionais + Remover Publico Esperado + Melhorias

## 1. Corrigir Filtros da Pagina de Eventos (Print 1)

**Problema:** O filtro de fotografo no `EventFilters.tsx` aceita texto (nome), mas o `Events.tsx` compara esse texto diretamente com `photographer_id` (UUID). Resultado: o filtro por nome nunca funciona. Alem disso, os filtros de preco nao sao aplicados porque nao ha logica para eles no `Events.tsx`.

**Solucao:**
| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Events.tsx` | Corrigir filtro de fotografo para comparar por NOME (nao por ID). Adicionar logica de filtro por preco usando `photo_price_display` da query. Buscar `photo_price_display` na query do Supabase |
| `src/components/events/EventFilters.tsx` | Ajustar placeholder do campo fotografo para deixar claro que eh busca por nome |

### Detalhes tecnicos:

O filtro de fotografo passara a comparar o texto digitado com `photographer.full_name` e `campaign_photographers.profiles.full_name` (busca por nome, case-insensitive).

O filtro de preco comparara com `photo_price_display` de cada campanha (campo ja existente na tabela `campaigns`). A query precisara incluir `photo_price_display` no select.

---

## 2. Remover "Publico Esperado" do Modal de Edicao (Print 2)

**Problema:** O campo "Publico Esperado" ainda aparece no modal de edicao (`EditEventModal.tsx`). O cliente nao quer essa informacao.

**Solucao:**
| Arquivo | Mudanca |
|---------|---------|
| `src/components/modals/EditEventModal.tsx` | Remover campo "Publico Esperado" (linhas 383-391). Remover estado `expectedAudience` e referencia no submit. Manter o campo no banco (sem migration), apenas nao exibir mais |

---

## 3. Remover "Publico Esperado" do Modal de Criacao

**Problema:** O `CreateEventDialog.tsx` nao tem o campo visivel, mas o `EditEventModal` sim. Confirmar que a criacao nao envia `expected_audience`.

**Solucao:** Ja esta limpo no `CreateEventDialog.tsx` - nenhuma mudanca necessaria.

---

## 4. Limpeza no EventApplications

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/dashboard/photographer/EventApplications.tsx` | Remover `expected_audience` da interface `CampaignWithApplication` (linha 35) e da query (linha 67) - limpeza de codigo morto |

---

## Resumo de Arquivos

| Arquivo | Tipo |
|---------|------|
| `src/pages/Events.tsx` | Editar - corrigir filtros fotografo e preco |
| `src/components/events/EventFilters.tsx` | Editar - melhorar placeholder |
| `src/components/modals/EditEventModal.tsx` | Editar - remover Publico Esperado |
| `src/pages/dashboard/photographer/EventApplications.tsx` | Editar - limpeza |

Nenhuma migration de banco necessaria.

