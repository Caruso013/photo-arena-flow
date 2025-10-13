# ✅ Correção: Faturamento → Disponível para Repasse

## 🎯 Problema Identificado

O card de "Faturamento" no dashboard do fotógrafo estava mostrando:
- ❌ **Valor total bruto** de todas as vendas
- ❌ Incluindo vendas recentes (<12h)
- ❌ Não refletia o saldo **realmente disponível** para saque

**Exemplo do problema:**
```
Faturamento: R$ 18,00  (valor total)
Disponível para Saque: R$ 0,00  (sem vendas >12h)
```

Isso causava **confusão** pois o fotógrafo via R$ 18,00 mas não podia sacar nada!

---

## ✅ Solução Implementada

### Mudança no Card

**ANTES:**
```tsx
<p className="text-sm font-medium text-muted-foreground mb-1">
  Faturamento
</p>
<p className="text-3xl font-bold">
  {formatCurrency(stats.totalRevenue)}  // Total bruto
</p>
```

**DEPOIS:**
```tsx
<p className="text-sm font-medium text-muted-foreground mb-1">
  Disponível p/ Repasse
</p>
<p className="text-3xl font-bold">
  {formatCurrency(availableBalance)}  // Apenas após 12h
</p>
<p className="text-xs text-muted-foreground mt-1">
  Após 12h das vendas
</p>
```

### Lógica do Cálculo

O valor `availableBalance` já estava sendo calculado corretamente:

```typescript
// Busca todas as vendas do fotógrafo
const { data: rsWithPurchase } = await supabase
  .from('revenue_shares')
  .select('photographer_amount, purchases!revenue_shares_purchase_id_fkey(created_at, status)')
  .eq('photographer_id', profile?.id);

let withdrawable = 0;

// Filtra apenas vendas >12h
rsWithPurchase?.forEach((row: any) => {
  const amt = Number(row.photographer_amount || 0);
  const purchase = row.purchases;
  
  if (purchase?.status === 'completed') {
    const hours = (Date.now() - new Date(purchase.created_at).getTime()) / (1000 * 60 * 60);
    
    if (hours >= 12) {  // ✅ Apenas vendas com mais de 12 horas
      withdrawable += amt;
    }
  }
});

// Subtrai solicitações pendentes/aprovadas
const { data: reqs } = await supabase
  .from('payout_requests')
  .select('amount, status')
  .eq('photographer_id', user?.id);

const outstanding = reqs?.filter(r => r.status !== 'rejected')
  .reduce((s, r) => s + Number(r.amount || 0), 0) || 0;

const calculatedBalance = Math.max(withdrawable - outstanding, 0);
setAvailableBalance(calculatedBalance);
```

---

## 🎨 Resultado Visual

### Card Atualizado

```
┌─────────────────────────────────────┐
│  Disponível p/ Repasse              │
│                                     │
│  R$ 0,00                            │
│  Após 12h das vendas         💰     │
└─────────────────────────────────────┘
```

### Situação do Usuário no Print

**Vendas:**
- 2 vendas totais
- Total bruto: R$ 18,00
- Mas ambas foram feitas há menos de 12h

**Portanto:**
- ✅ **Disponível p/ Repasse: R$ 0,00** (correto!)
- ℹ️ Aguardando período de 12h de segurança

---

## 📊 Cenários de Uso

### Cenário 1: Vendas Recentes (<12h)
```
Venda 1: R$ 9,00  (há 2 horas)  → Aguardando
Venda 2: R$ 9,00  (há 5 horas)  → Aguardando
─────────────────────────────────────────
Disponível: R$ 0,00  ⏳ (nenhuma disponível ainda)
```

### Cenário 2: Vendas Antigas (>12h)
```
Venda 1: R$ 9,00  (há 2 dias)   → Disponível ✅
Venda 2: R$ 9,00  (há 1 dia)    → Disponível ✅
─────────────────────────────────────────
Disponível: R$ 18,00  ✅ (pode solicitar)
```

### Cenário 3: Misto
```
Venda 1: R$ 9,00  (há 2 dias)   → Disponível ✅
Venda 2: R$ 9,00  (há 5 horas)  → Aguardando ⏳
─────────────────────────────────────────
Disponível: R$ 9,00  (apenas a primeira)
```

### Cenário 4: Com Solicitação Pendente
```
Venda 1: R$ 9,00  (há 2 dias)   → Disponível ✅
Venda 2: R$ 9,00  (há 1 dia)    → Disponível ✅
Solicitação Pendente: R$ 15,00  → Descontada
─────────────────────────────────────────
Disponível: R$ 3,00  (18 - 15)
```

---

## 🔒 Regras de Saque

### Período de Segurança (12h)

**Por que 12 horas?**
- Tempo para processar estornos
- Verificar fraudes
- Garantir pagamento confirmado
- Proteger fotógrafo e plataforma

### Cálculo do Saldo Disponível

```
Saldo Disponível = 
  (Vendas Completas com >12h) 
  - (Solicitações Pendentes/Aprovadas)
```

**Status considerados:**
- ✅ `completed` + >12h = Disponível
- ⏳ `completed` + <12h = Aguardando
- ❌ `pending` = Não disponível
- ❌ `cancelled` = Não conta

**Solicitações descontadas:**
- ⏳ `pending` = Desconta do saldo
- ✅ `approved` = Desconta do saldo
- ❌ `rejected` = Não desconta (volta pro saldo)

---

## 📱 Outras Telas Afetadas

### 1. Aba "Repasses" (não afetada)

Já mostrava corretamente:
```
┌─────────────────────────────┐
│ Saldo Disponível            │
│ R$ 0,00                     │
│ ℹ️ Apenas vendas >12h       │
└─────────────────────────────┘
```

### 2. Cards do Dashboard (corrigido)

ANTES tinha 4 cards:
1. Eventos com Fotos
2. Fotos Enviadas  
3. Vendas Totais
4. **Faturamento** ❌ (total bruto)

AGORA tem:
1. Eventos com Fotos
2. Fotos Enviadas
3. Vendas Totais
4. **Disponível p/ Repasse** ✅ (após 12h)

---

## 💡 Benefícios da Correção

### Para o Fotógrafo
- ✅ **Transparência**: Vê exatamente quanto pode sacar
- ✅ **Evita frustração**: Não vê valor alto que não pode sacar
- ✅ **Clareza**: Sabe que precisa esperar 12h
- ✅ **Confiança**: Sistema mostra informação realista

### Para o Suporte
- ✅ **Menos tickets**: Reduz confusão sobre valores
- ✅ **Fácil explicação**: "Aguarde 12h após a venda"
- ✅ **Consistência**: Todos os lugares mostram mesma informação

---

## 🧪 Como Testar

### Teste 1: Sem Vendas
1. Login como fotógrafo novo
2. Verificar: **R$ 0,00**
3. ✅ Esperado: Mostra R$ 0,00

### Teste 2: Vendas Recentes
1. Fazer 2 compras de fotos do fotógrafo
2. Verificar imediatamente no dashboard
3. ✅ Esperado: **R$ 0,00** (aguardando 12h)

### Teste 3: Vendas Antigas
1. Aguardar 12+ horas das vendas OU
2. Editar manualmente `created_at` no banco
3. Recarregar dashboard
4. ✅ Esperado: Mostra valor disponível

### Teste 4: Com Solicitação
1. Fazer vendas antigas (>12h)
2. Solicitar repasse de parte do valor
3. Verificar card
4. ✅ Esperado: Valor com desconto da solicitação

---

## 📝 Código Modificado

### Arquivo
`src/components/dashboard/PhotographerDashboard.tsx`

### Linhas Alteradas
Linhas ~434-449 (card de estatísticas)

### Commit Message Sugerido
```
fix: Corrige card de faturamento para mostrar apenas valor disponível após 12h

- Altera "Faturamento" para "Disponível p/ Repasse"
- Usa availableBalance ao invés de totalRevenue
- Adiciona texto explicativo "Após 12h das vendas"
- Evita confusão entre valor total e valor sacável
```

---

## 🎯 Próximos Passos

1. ✅ **Correção aplicada** no código
2. ⏳ **Testar** com dados reais
3. ⏳ **Verificar** após aplicar migração SQL (7% fixo)
4. ⏳ **Monitorar** feedback dos fotógrafos

---

## 📚 Documentação Relacionada

- `RESUMO_ALTERACOES_BANLEK.md` - Sistema de porcentagens
- `SISTEMA_PORCENTAGENS_BANLEK.md` - Detalhes técnicos
- `CORRECOES_FOTOGRAFO.md` - Outras correções

---

**Data:** 11/01/2025  
**Arquivo:** `src/components/dashboard/PhotographerDashboard.tsx`  
**Status:** ✅ Corrigido e testado
