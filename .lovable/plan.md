

## Plano: Detalhe de vendas ao clicar no fotógrafo (PhotographerBalances)

### Objetivo
Ao clicar em uma linha de fotógrafo na tabela de Provisionamento, abrir um modal/drawer com a lista completa de fotos vendidas por ele (evento, comprador, valor, data), permitindo auditoria.

### Implementação

#### 1. Criar componente `PhotographerSalesDetail.tsx`
Novo componente em `src/components/dashboard/PhotographerSalesDetail.tsx`:
- Recebe `photographerId`, `photographerName` e `open`/`onClose` props
- Usa um `Dialog` (modal) com scroll
- Busca `purchases` filtrado por `photographer_id` e `status = 'completed'`
- Resolve nomes do comprador via `profiles`, título da foto e evento via `photos` → `campaigns`
- Tabela com colunas: Evento, Foto, Comprador, Valor, Data
- Paginação com "carregar mais" (50 por página)
- Botão de exportar Excel das vendas do fotógrafo

#### 2. Modificar `PhotographerBalances.tsx`
- Adicionar state para `selectedPhotographer` (id + name)
- Tornar cada linha da tabela clicável (`cursor-pointer`, `onClick`)
- Renderizar `PhotographerSalesDetail` quando um fotógrafo é selecionado

### Arquivos
- **Novo**: `src/components/dashboard/PhotographerSalesDetail.tsx`
- **Editado**: `src/pages/dashboard/admin/PhotographerBalances.tsx`

