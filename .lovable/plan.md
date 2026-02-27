

## Plano: Adicionar aba "Vendas" no painel de Eventos do Admin

### Objetivo
Criar uma nova aba "Vendas" dentro da página `/dashboard/admin/events` que mostra todas as fotos vendidas, agrupadas por evento, com informações de comprador, fotógrafo, valor e data.

### Implementação

#### 1. Criar componente `EventSalesManager.tsx`
Novo componente em `src/components/dashboard/EventSalesManager.tsx` que:
- Busca purchases com status `completed` junto com dados da foto, campanha, comprador e fotógrafo
- Query: `purchases` → join `photos` (photo title, campaign_id) → join `campaigns` (event title) → join `profiles` (buyer name, photographer name)
- Exibe tabela com colunas: Evento, Foto, Comprador, Fotógrafo, Valor, Data
- Filtro por evento (select dropdown com campanhas)
- Filtro por período (data início/fim)
- Badge de valor com desconto quando `progressive_discount_amount > 0`

#### 2. Modificar `Events.tsx`
Adicionar terceira aba "Vendas" com ícone `ShoppingCart` ao `TabsList` existente, renderizando o novo `EventSalesManager`.

### Detalhes Técnicos
- Query usa `supabase.from('purchases').select('*, photos(title, campaign_id, campaigns(title)), profiles!purchases_buyer_id_fkey(full_name)')` — como o schema não tem foreign key explícita no client types, buscaremos comprador e fotógrafo separadamente via profiles
- Paginação com limit de 50 registros + botão "carregar mais"
- RLS já permite admin ver todas as purchases

### Arquivos
- **Novo**: `src/components/dashboard/EventSalesManager.tsx`
- **Editado**: `src/pages/dashboard/admin/Events.tsx` (adicionar aba)

