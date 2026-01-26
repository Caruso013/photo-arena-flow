
# Plano de Correção - Erros Financeiros no Dashboard Admin

## Problemas Identificados

Através da análise do banco de dados e código, identifiquei **3 problemas críticos**:

| Métrica | Valor Exibido | Valor Real | Problema |
|---------|--------------|------------|----------|
| Receita Total Bruta | R$ 10.797,17 | R$ 14.254,17 | Limite de 1000 registros do Supabase |
| Receita Plataforma | R$ 957,20 | R$ 1.268,33 | Mesmo problema acima |
| Fotógrafos | 0 | 50 | Query pega apenas 50 usuários recentes |

---

## Causa Raiz

### 1. Limite de Registros no Supabase
```typescript
// Código atual (linha 178-180)
const { data: revenueData } = await supabase
  .from('revenue_shares')
  .select('platform_amount, photographer_amount, organization_amount, created_at');
```
**Problema**: O Supabase tem limite padrão de **1000 registros**. Com 1288 registros, ~288 vendas estão sendo ignoradas!

### 2. Contagem de Fotógrafos Incorreta
```typescript
// Código atual (linha 162-167)
const { data: usersData } = await supabase
  .from('profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);

// Linha 337 - filtra localmente
users.filter(u => u.role === 'photographer').length
```
**Problema**: Busca apenas 50 usuários mais recentes e filtra localmente. Usuários recentes são geralmente `user`, não `photographer`.

---

## Solução

### Correção 1: Paginação para Revenue Shares
Implementar paginação com `while` loop igual ao que foi feito em `PhotographerBalances.tsx`:

```typescript
// Buscar TODOS os revenue_shares com paginação
let allRevenueData: any[] = [];
let page = 0;
const pageSize = 1000;
let hasMore = true;

while (hasMore) {
  const { data: revenueData } = await supabase
    .from('revenue_shares')
    .select('platform_amount, photographer_amount, organization_amount')
    .range(page * pageSize, (page + 1) * pageSize - 1);
  
  if (revenueData && revenueData.length > 0) {
    allRevenueData = [...allRevenueData, ...revenueData];
    page++;
    hasMore = revenueData.length === pageSize;
  } else {
    hasMore = false;
  }
}

const totalRevenue = allRevenueData.reduce((sum, r) => 
  sum + Number(r.platform_amount) + Number(r.photographer_amount) + Number(r.organization_amount), 0);
const platformRevenue = allRevenueData.reduce((sum, r) => sum + Number(r.platform_amount), 0);
```

### Correção 2: Contagem Direta de Fotógrafos
Usar query específica com `count` ao invés de filtrar localmente:

```typescript
// Buscar contagem de fotógrafos diretamente
const { count: photographerCount } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('role', 'photographer');
```

E armazenar no state para exibir:
```typescript
// No MetricCard de Fotógrafos
<MetricCard
  title="Fotógrafos"
  value={stats.photographerCount}  // Usar valor do stats ao invés de filtro
  ...
/>
```

---

## Arquivo a Modificar

`src/components/dashboard/AdminDashboard.tsx`

---

## Alterações Específicas

1. **Linhas 78-79**: Adicionar `photographerCount` ao interface `Stats`
2. **Linhas 135-141**: Inicializar `photographerCount: 0` no state
3. **Linhas 177-184**: Substituir query de revenue_shares por versão com paginação
4. **Após linha 200**: Adicionar query para contar fotógrafos com `count: 'exact'`
5. **Linha 337**: Usar `stats.photographerCount` ao invés de `users.filter(...).length`

---

## Resultado Esperado

Após as correções:
- **Receita Total Bruta**: R$ 14.254,17 ✓
- **Receita Plataforma**: R$ 1.268,33 ✓
- **Fotógrafos**: 50 ✓

---

## Benefícios

- Dados financeiros 100% precisos
- Performance otimizada com queries específicas
- Escalável para qualquer volume de vendas
- Padrão consistente com outras páginas (PhotographerBalances)
