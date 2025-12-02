# 🔧 CORREÇÃO: Valores Financeiros Inconsistentes no Dashboard

## ❌ Problema Identificado

No dashboard do fotógrafo, **dois valores diferentes** estão sendo mostrados:

### 1. Card de Estatísticas (Linha 502)
```tsx
<p className="text-2xl sm:text-3xl font-bold">
  {formatCurrency(stats.pendingAmount + stats.availableAmount)}
</p>
```
**Mostra**: `stats.availableAmount`

### 2. Card de Solicitar Repasse (Linha 706)
```tsx
<p className="text-2xl font-bold text-primary">
  {formatCurrency(availableBalance)}
</p>
```
**Mostra**: `availableBalance`

## 🔍 Análise do Código

### Estado Duplicado
```tsx
const [availableBalance, setAvailableBalance] = useState(0); // Linha 114
const [stats, setStats] = useState<Stats>({
  totalSales: 0,
  monthlySales: 0,
  pendingAmount: 0,
  availableAmount: 0  // ⚠️ DUPLICADO!
});
```

### Função `fetchStats()` - Linhas 264-338
```tsx
const fetchStats = async () => {
  // ... cálculos ...
  
  let availableSum = 0;
  let pendingSum = 0;
  
  rsWithPurchase?.forEach((row: any) => {
    const amt = Number(row.photographer_amount || 0);
    const purchase = row.purchases;
    
    if (purchase?.status === 'completed') {
      const createdDate = new Date(purchase.created_at);
      const hoursSinceSale = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSale >= 12) {
        availableSum += amt;
      } else {
        pendingSum += amt;
      }
    }
  });
  
  // Descontar solicitações
  const { data: reqs } = await supabase
    .from('payout_requests')
    .select('amount, status')
    .eq('photographer_id', user?.id)
    .in('status', ['pending', 'approved', 'completed']);
  
  const blockedAmount = reqs?.reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;
  
  const finalAvailable = Math.max(availableSum - blockedAmount, 0);
  
  // ⚠️ DOIS VALORES DIFERENTES SENDO SETADOS
  setAvailableBalance(finalAvailable);  // Linha 334
  
  setStats({
    totalSales,
    monthlySales,
    pendingAmount: pendingSum,
    availableAmount: finalAvailable  // Linha 339
  });
};
```

## ✅ Solução

**O código está CORRETO!** Ambos `availableBalance` e `stats.availableAmount` recebem o mesmo valor (`finalAvailable`).

### Possíveis Causas da Inconsistência

1. **Race Condition**: Se `fetchStats()` for chamado múltiplas vezes simultaneamente
2. **Estado Desatualizado**: React batch updates podem causar renders com valores diferentes temporariamente
3. **Erro de Lógica de Desconto**: Solicitações de repasse podem não estar sendo descontadas corretamente

## 🎯 Correção Recomendada

### Opção 1: Remover Estado Duplicado (RECOMENDADO)

```tsx
// ❌ REMOVER
const [availableBalance, setAvailableBalance] = useState(0);

// ✅ USAR APENAS
const [stats, setStats] = useState<Stats>({
  totalSales: 0,
  monthlySales: 0,
  pendingAmount: 0,
  availableAmount: 0
});

// No fetchStats, REMOVER linha 334:
// setAvailableBalance(finalAvailable); 

// Usar stats.availableAmount em TODOS os lugares
```

### Opção 2: Adicionar Logs de Debug

```tsx
const fetchStats = async () => {
  try {
    // ... cálculos ...
    
    const finalAvailable = Math.max(availableSum - blockedAmount, 0);
    
    // 🔍 LOG DE DEBUG
    console.log('💰 VALORES FINANCEIROS:', {
      availableSum,
      pendingSum,
      blockedAmount,
      finalAvailable,
      timestamp: new Date().toISOString()
    });
    
    setAvailableBalance(finalAvailable);
    setStats({
      totalSales,
      monthlySales,
      pendingAmount: pendingSum,
      availableAmount: finalAvailable
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};
```

### Opção 3: Validar Repasses Bloqueados

Verificar se as solicitações de repasse estão corretamente bloqueando o saldo:

```sql
-- No Supabase SQL Editor
SELECT 
  pr.id,
  pr.photographer_id,
  pr.amount,
  pr.status,
  pr.requested_at,
  pr.processed_at,
  p.full_name
FROM payout_requests pr
JOIN profiles p ON p.id = pr.photographer_id
WHERE pr.status IN ('pending', 'approved', 'completed')
ORDER BY pr.requested_at DESC
LIMIT 10;
```

## 📊 Validação dos Cálculos

### Fórmula Atual (CORRETA)
```
Saldo Disponível = (Soma de Revenue Shares com 12h+) - (Repasses Pendentes/Aprovados/Completed)

Onde:
- Revenue Share = photographer_amount de cada venda
- 12h+ = vendas com mais de 12 horas
- Status bloqueados = pending, approved, completed
- Status liberados = rejected
```

### Verificar no Console do Navegador
```javascript
// Abrir DevTools Console na página do dashboard
// Verificar os logs de fetchStats()
```

## 🚀 Implementação da Correção

### 1. Remover Estado Duplicado
- Deletar `const [availableBalance, setAvailableBalance] = useState(0);`
- Deletar `setAvailableBalance(finalAvailable);`
- Substituir todas ocorrências de `availableBalance` por `stats.availableAmount`

### 2. Locais para Atualizar
- Linha 114: Remover estado
- Linha 334: Remover setAvailableBalance
- Linha 706: Usar `stats.availableAmount`
- Linha 717: Usar `stats.availableAmount`
- Linha 723: Usar `stats.availableAmount`
- Linha 814: Usar `stats.availableAmount`

## ✅ Resultado Esperado

Após a correção, **todos os valores exibidos devem ser consistentes**:
- Card de estatísticas mostra o valor correto
- Card de solicitar repasse mostra o MESMO valor
- Nenhuma duplicação de estado
- Cálculos centralizados na função `fetchStats()`
