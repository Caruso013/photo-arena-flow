

## Melhorias: Mobile, Performance e Fluxo de Compra

Baseado na analise do codigo, identifiquei melhorias concretas nas 3 areas solicitadas.

---

### 1. Performance e Velocidade

**1a. Eliminar N+1 queries na Home (Index.tsx e Home.tsx)**
Ambas as paginas fazem queries individuais por campanha em um loop (`Promise.all` com queries por campanha). Refatorar para buscar fotos e capas em batch usando `.in()` ao inves de queries individuais.

**1b. Home.tsx duplica a mesma secao "Por que escolher"**
A pagina Home tem duas secoes de features praticamente identicas (linhas 327-367 repetem o conceito das linhas 188-226 no Index.tsx). Remover a secao duplicada da Home.

**1c. Otimizar carregamento de imagens no grid de campanhas**
Adicionar `sizes` e `srcset` hints nas tags `<img>` dos cards de campanha para que o browser carregue o tamanho correto. Adicionar `fetchpriority="high"` nas 2 primeiras imagens e `loading="lazy"` nas demais.

**1d. Reduzir re-renders na Campaign.tsx**
O arquivo tem 1634 linhas com muitos estados. Extrair o grid de fotos em um componente separado memoizado para evitar re-renders quando estados nao relacionados mudam (ex: modal de release).

---

### 2. Experiencia Mobile

**2a. Melhorar BottomNavigation - remover item duplicado**
Os itens "Eventos" e "Buscar" apontam para a mesma rota `/events`. Substituir "Buscar" por um botao de reconhecimento facial que abre diretamente o modal de busca por selfie, ou mudar para "Favoritos" (`/dashboard/favorites`).

**2b. Carrinho mobile - layout compacto**
No Cart.tsx, os cards de foto ocupam muito espaco vertical. Criar um layout horizontal compacto (thumbnail + titulo + preco em uma linha) para mobile, mantendo o layout atual em desktop.

**2c. Checkout mobile - sticky total bar**
Adicionar uma barra fixa no bottom (acima do BottomNavigation) mostrando o total e botao "Finalizar" no carrinho, para o usuario nao precisar scrollar ate o fim.

**2d. Galeria de fotos (Campaign) - grid 3 colunas no mobile**
Atualmente usa grid 2 colunas. Mudar para 3 colunas em mobile (como Instagram) para mostrar mais fotos sem scroll, ja que as fotos sao pequenas previews com marca dagua.

---

### 3. Fluxo de Compra

**3a. Feedback visual no botao de adicionar ao carrinho**
Quando o usuario adiciona foto ao carrinho na Campaign.tsx, mostrar animacao breve (checkmark) no botao e badge do carrinho.

**3b. Cart drawer persistente na Campaign**
O CartDrawer ja existe mas pode ser mais proeminente. Mostrar um floating action button com contagem quando ha itens no carrinho, facilitando acesso rapido ao checkout.

**3c. Resumo de preco inline na galeria**
Mostrar o preco unitario e desconto progressivo estimado diretamente no header da galeria, para o usuario saber o valor antes de adicionar fotos.

---

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Home.tsx` | Remover secao duplicada, batch queries |
| `src/pages/Index.tsx` | Batch queries para campanhas |
| `src/pages/Campaign.tsx` | Grid 3 cols mobile, feedback carrinho, preco inline |
| `src/pages/Cart.tsx` | Layout compacto mobile, sticky checkout bar |
| `src/components/layout/BottomNavigation.tsx` | Corrigir item duplicado |

### Ordem de implementacao
1. Performance (queries batch + remover duplicatas)
2. Mobile (grid, bottom nav, cart compacto)
3. Fluxo de compra (feedback, FAB, preco inline)

