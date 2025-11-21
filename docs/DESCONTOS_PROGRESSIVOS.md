# Sistema de Descontos Progressivos 🎁

## 📋 Visão Geral

Sistema completo de descontos progressivos que incentiva clientes a comprarem múltiplas fotos com descontos automáticos. O fotógrafo tem controle total para ativar/desativar por evento.

---

## 💰 Tabela de Descontos

| Quantidade de Fotos | Desconto Aplicado |
|---------------------|-------------------|
| 2 a 4 fotos         | 5% OFF            |
| 5 a 9 fotos         | 10% OFF           |
| 10 ou mais fotos    | 20% OFF           |

---

## 🎯 Como Funciona

### 1. **Ativação pelo Fotógrafo**

O fotógrafo pode ativar/desativar os descontos em dois momentos:

#### **Ao criar um novo evento:**
- No modal "Criar Novo Evento"
- Toggle "Ativar Descontos Progressivos"
- Informações sobre a tabela de descontos são exibidas quando ativado

#### **Ao editar um evento existente:**
- Botão "Editar Evento" na página do evento
- Aba "Informações" → Toggle "Descontos Progressivos"
- Pode ativar/desativar a qualquer momento

### 2. **Cálculo Automático no Carrinho**

Quando o cliente adiciona fotos ao carrinho:

```typescript
// Exemplo de cálculo
Carrinho com 6 fotos a R$ 10,00 cada:
- Subtotal: R$ 60,00
- Desconto (10%): -R$ 6,00
- Total: R$ 54,00
```

### 3. **Mensagens Motivacionais**

O sistema exibe mensagens para incentivar o cliente:

- **1 foto:** "💡 Adicione mais 1 foto para ganhar 5% de desconto!"
- **2-4 fotos:** "🎉 Desconto de 5% aplicado!"
- **5-9 fotos:** "🎉 Desconto de 10% aplicado!"
- **10+ fotos:** "🎉 Desconto de 20% aplicado!"

---

## 🛠️ Implementação Técnica

### **Banco de Dados**

Campo na tabela `campaigns`:
```sql
progressive_discount_enabled BOOLEAN DEFAULT FALSE
```

### **Hook Reutilizável**

```typescript
// src/hooks/useProgressiveDiscount.ts
const discount = useProgressiveDiscount(
  quantity,      // Número de fotos
  unitPrice,     // Preço unitário
  isEnabled      // Se o desconto está ativo
);

// Retorna:
{
  quantity: number,
  unitPrice: number,
  subtotal: number,
  discountPercentage: number,
  discountAmount: number,
  total: number,
  isEnabled: boolean
}
```

### **Componentes**

1. **ProgressiveDiscountDisplay** (`src/components/cart/ProgressiveDiscountDisplay.tsx`)
   - Exibe informações visuais sobre descontos
   - Mostra próximo threshold de desconto
   - Modo compacto e expandido

2. **ProgressiveDiscountToggle** (`src/components/photographer/ProgressiveDiscountToggle.tsx`)
   - Toggle para fotógrafos ativarem/desativarem
   - Exibe tabela de descontos
   - Informações sobre benefícios

3. **Cart.tsx** (`src/pages/Cart.tsx`)
   - Calcula descontos automaticamente
   - Exibe resumo de economia
   - Aplica desconto antes do cupom

### **Fluxo de Integração**

```typescript
// 1. Fotógrafo cria evento com desconto ativo
await supabase.from('campaigns').insert({
  title: "Campeonato 2025",
  progressive_discount_enabled: true, // ✅ Ativa descontos
  // ... outros campos
});

// 2. Cliente adiciona fotos ao carrinho
// useProgressiveDiscount calcula automaticamente

// 3. No checkout, desconto é aplicado
const subtotal = totalPrice;
const discount = useProgressiveDiscount(
  items.length, 
  avgPrice,
  campaign.progressive_discount_enabled // ✅ Verifica se está ativo
);
const total = discount.total;
```

---

## 📊 Exemplos Práticos

### **Exemplo 1: 3 Fotos**
```
3 fotos × R$ 10,00 = R$ 30,00
Desconto (5%): -R$ 1,50
Total: R$ 28,50
Economia: R$ 1,50 💰
```

### **Exemplo 2: 7 Fotos**
```
7 fotos × R$ 10,00 = R$ 70,00
Desconto (10%): -R$ 7,00
Total: R$ 63,00
Economia: R$ 7,00 💰
```

### **Exemplo 3: 15 Fotos**
```
15 fotos × R$ 10,00 = R$ 150,00
Desconto (20%): -R$ 30,00
Total: R$ 120,00
Economia: R$ 30,00 💰
```

---

## 🎨 Interface do Usuário

### **No Carrinho**

```
┌─────────────────────────────────────────┐
│ Resumo do Pedido                        │
├─────────────────────────────────────────┤
│ Subtotal (7 fotos)         R$ 70,00     │
│                                          │
│ Desconto Progressivo 10% OFF            │
│                            -R$ 7,00 🎉   │
├─────────────────────────────────────────┤
│ Total                      R$ 63,00     │
└─────────────────────────────────────────┘
```

### **Incentivo Visual**

```
┌─────────────────────────────────────────┐
│ 💡 Adicione mais 3 fotos para ganhar    │
│    10% de desconto!                     │
└─────────────────────────────────────────┘
```

---

## ⚙️ Configuração

### **Ativar ao Criar Evento**

1. Dashboard do Fotógrafo → "Criar Evento"
2. Preencher dados do evento
3. Ativar toggle "Descontos Progressivos"
4. Criar evento

### **Ativar em Evento Existente**

1. Ir na página do evento
2. Clicar em "Editar Evento"
3. Aba "Informações"
4. Ativar toggle "Descontos Progressivos"
5. Salvar alterações

---

## 🔒 Validações e Segurança

- ✅ Desconto só é aplicado se `progressive_discount_enabled = true`
- ✅ Cálculo é feito no backend (webhook do Mercado Pago)
- ✅ Valores são registrados na tabela `purchases`:
  - `progressive_discount_percentage`
  - `progressive_discount_amount`
- ✅ Fotógrafo recebe sobre o valor APÓS desconto

---

## 📈 Benefícios para o Fotógrafo

1. **Aumenta ticket médio:** Clientes compram mais fotos
2. **Conversão maior:** Incentivo visual no carrinho
3. **Controle total:** Ativa/desativa quando quiser
4. **Transparente:** Cliente vê economia em tempo real

---

## 🧪 Testes

### **Cenários a Testar:**

1. ✅ Criar evento com desconto ativo
2. ✅ Criar evento com desconto desativado
3. ✅ Ativar desconto em evento existente
4. ✅ Desativar desconto em evento existente
5. ✅ Adicionar 2 fotos ao carrinho (5% desconto)
6. ✅ Adicionar 5 fotos ao carrinho (10% desconto)
7. ✅ Adicionar 10 fotos ao carrinho (20% desconto)
8. ✅ Remover fotos e verificar recalculo
9. ✅ Combinar com cupom de desconto
10. ✅ Verificar que desconto não é aplicado se desativado

---

## 🔄 Compatibilidade com Cupons

Os descontos são aplicados em ordem:

```typescript
1. Subtotal das fotos
2. Desconto Progressivo (-%)
3. Subtotal após desconto progressivo
4. Cupom de desconto (-%)
5. Total final
```

**Exemplo:**
```
10 fotos × R$ 10,00 = R$ 100,00
- Desconto Progressivo (20%): -R$ 20,00 = R$ 80,00
- Cupom "PROMO10" (10%): -R$ 8,00
Total Final: R$ 72,00
```

---

## 📝 Notas Importantes

- O desconto progressivo é aplicado **POR EVENTO**
- Cada evento pode ter sua própria configuração
- O desconto é calculado sobre o preço original das fotos
- Funciona com fotos de preços diferentes (usa média)
- Não há limite máximo de fotos para desconto

---

## 🚀 Próximas Melhorias Sugeridas

1. Dashboard de estatísticas de descontos aplicados
2. Configuração de tabela de descontos personalizada por fotógrafo
3. Notificações quando cliente está próximo de um desconto maior
4. Relatórios de conversão com vs sem desconto
5. A/B testing de diferentes tabelas de desconto

---

## 📞 Suporte

Para dúvidas ou problemas:
- Email: contato@stafotos.com
- Dashboard → Suporte
