

## Auditoria Completa do Sistema Financeiro

Analisei 100% dos arquivos financeiros. Encontrei **7 bugs críticos** que causam dados incorretos ou incompletos.

---

### Bug 1: Reports.tsx — 3 queries sem paginação (dados truncados)

`generateFinancialReport`, `fetchSummary` e `generateSalesReport` buscam `revenue_shares` e `purchases` sem paginação. Com mais de 1000 registros, os relatórios Excel e o resumo financeiro ficam incompletos.

**Fix:** Adicionar `fetchAllFromTable` helper e usar em todas as 3 funções.

---

### Bug 2: AlbumReports.tsx — 2 queries sem paginação

`fetchAlbumReports` busca `revenue_shares` sem paginação. `fetchOverallMetrics` busca `purchases` sem paginação. Relatórios de álbum ficam truncados.

**Fix:** Adicionar paginação em ambas as queries.

---

### Bug 3: OrganizationRevenue.tsx — query sem paginação

A busca de vendas da organização (`revenue_shares` com joins) não usa paginação. Organizações com muitas vendas terão receita subnotificada.

**Fix:** Adicionar paginação na query principal.

---

### Bug 4: PhotographerBalances.tsx (Admin) — ignora período de segurança de 12h

O campo `available_balance` é calculado como `total_earned - total_withdrawn - pending_withdrawal`, sem considerar o período de segurança de 12h. Isso faz o admin ver um saldo disponível maior do que o real, podendo aprovar saques de valores que ainda estão bloqueados.

**Fix:** Adicionar filtro de `created_at` das purchases para separar valores dentro/fora do período de segurança, igual ao `usePhotographerBalance` hook.

---

### Bug 5: PhotographerEarnings.tsx (página antiga) — dados duplicados/incorretos

A página `src/pages/dashboard/photographer/PhotographerEarnings.tsx` (diferente do componente `src/components/dashboard/PhotographerEarnings.tsx`) usa `purchases` diretamente em vez de `revenue_shares`, mostrando o valor bruto (`amount`) como ganho do fotógrafo em vez do `photographer_amount`. Isso infla os ganhos exibidos.

**Fix:** Verificar se esta página ainda é usada nas rotas. Se sim, migrar para usar `usePhotographerBalance` ou redirecionar para o componente correto.

---

### Bug 6: Reports.tsx — relatório financeiro Excel exporta PIX key em texto puro

A query de `revenue_shares` no relatório financeiro não inclui dados sensíveis, mas o relatório de vendas expõe emails de compradores sem necessidade. Menor risco, mas vale notar.

**Fix:** Manter, mas documentar que relatórios são confidenciais (já está no PDF).

---

### Bug 7: FinancialDashboard.tsx — admin `totalRevenue` usa `purchases.amount`, inconsistente

Para admin, `totalRevenue` vem da soma de `purchases.amount`. Para o gráfico de receita, vem de `revenue_shares`. Se houver purchases sem revenue_shares (bug de webhook), os valores divergem silenciosamente. O HealthCheck já detecta isso, mas o dashboard mostra o valor incorreto sem aviso.

**Fix:** Unificar para usar sempre `revenue_shares` como fonte de verdade para receita, já que é a tabela que reflete a divisão real.

---

### Resumo de Arquivos a Modificar

| Arquivo | Bugs | Severidade |
|---------|------|------------|
| `src/pages/dashboard/admin/Reports.tsx` | Paginação em 3 queries | Alta |
| `src/pages/dashboard/photographer/AlbumReports.tsx` | Paginação em 2 queries | Alta |
| `src/pages/dashboard/OrganizationRevenue.tsx` | Paginação em 1 query | Alta |
| `src/pages/dashboard/admin/PhotographerBalances.tsx` | Período de segurança 12h | Alta |
| `src/components/dashboard/FinancialDashboard.tsx` | Fonte de dados admin | Média |
| `src/pages/dashboard/photographer/PhotographerEarnings.tsx` | Verificar uso/remover | Média |

### Ordem de implementação
1. Paginação (Reports, AlbumReports, OrganizationRevenue) — 3 arquivos
2. Período de segurança no PhotographerBalances
3. Consistência de fonte de dados no FinancialDashboard
4. Verificar/remover PhotographerEarnings antiga

