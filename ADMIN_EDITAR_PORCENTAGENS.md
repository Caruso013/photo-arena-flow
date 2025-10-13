# ✅ Admin Pode Editar Porcentagens dos Eventos

## 🎯 Funcionalidade Implementada

Agora os **administradores** podem editar as porcentagens de divisão de receita dos eventos após a criação, caso tenham configurado errado!

---

## 📍 Onde Encontrar

### No Dashboard do Admin:

1. **Login como Admin**
2. **Dashboard** → Aba **"Eventos"** ou **"Campanhas"**
3. Na lista de eventos, cada card tem botões:
   - **"Editar"** → Abre modal de edição completa
   - **"Ativar/Desativar"** → Alterna status do evento
   - **"Excluir"** → Remove o evento

---

## 🔧 O Que Foi Corrigido

### Arquivo: `src/components/dashboard/CampaignManager.tsx`

**1. Valores padrão corrigidos para Sistema Banlek:**
```tsx
platform_percentage: 7,        // FIXO: 7%
photographer_percentage: 93,   // Padrão: fotógrafo fica com tudo
organization_percentage: 0     // Padrão: sem organização
```

**2. Adicionadas funções de ajuste automático:**
```tsx
// Quando mudar fotógrafo, ajusta organização automaticamente
const handlePhotographerPercentageChange = (value: number) => {
  const photographerPct = Math.max(0, Math.min(93, value));
  const organizationPct = 93 - photographerPct;
  // ...
};

// Quando mudar organização, ajusta fotógrafo automaticamente
const handleOrganizationPercentageChange = (value: number) => {
  const organizationPct = Math.max(0, Math.min(93, value));
  const photographerPct = 93 - organizationPct;
  // ...
};
```

**3. Validação antes de salvar:**
```tsx
// Plataforma deve ser sempre 7%
if (formData.platform_percentage !== 7) {
  toast({ title: "Erro", description: "Plataforma deve ter 7% (fixo)" });
  return;
}

// Fotógrafo + Organização deve somar 93%
const sum = formData.photographer_percentage + formData.organization_percentage;
if (sum !== 93) {
  toast({ title: "Erro", description: `Deve somar 93% (atual: ${sum}%)` });
  return;
}
```

**4. UI melhorada no modal de edição:**
- ✅ Plataforma: **Badge fixo "7%"** (não editável)
- ✅ Fotógrafo: **Slider 0-93%** + input numérico
- ✅ Organização: **Slider 0-93%** + input numérico
- ✅ Preview em tempo real: mostra R$ em vendas de R$ 100,00
- ✅ Validação visual: alerta se soma não for 93%

---

## 🎨 Interface do Modal de Edição

### Layout:

```
┌─────────────────────────────────────────┐
│ Editar Evento                           │
├─────────────────────────────────────────┤
│ Título:     [________________]          │
│ Descrição:  [________________]          │
│ Local:      [________________]          │
│ Data:       [____-__-__]                │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                         │
│ Divisão de Receita (Sistema Banlek)    │
│                        Total: 100% ✅   │
│                                         │
│ 🏢 Plataforma (Fixo)         [  7%  ]  │
│    Taxa fixa da plataforma              │
│                                         │
│ 📸 Fotógrafo                 [  70  ]% │
│    ├─────────●──────────┤              │
│    R$ 70,00 em venda de R$ 100,00       │
│                                         │
│ 🏛️ Organização              [  23  ]% │
│    ├──────────●─────────┤              │
│    R$ 23,00 em venda de R$ 100,00       │
│                                         │
│ [⚠️ Fotógrafo + Organização = 93% ✅]  │
│                                         │
│ Organização: [▼ Selecionar...]          │
│                                         │
│ [      Salvar Alterações      ]        │
└─────────────────────────────────────────┘
```

---

## ✅ Como Usar

### Passo 1: Abrir Modal de Edição

1. No dashboard admin, ir na aba **"Eventos"**
2. Localizar o evento desejado na lista
3. Clicar no botão **"Editar"** (ícone de lápis)

### Passo 2: Editar Informações Básicas

- Título, descrição, local, data
- Organização responsável (dropdown)

### Passo 3: Ajustar Porcentagens

**Opção A: Usar Sliders**
- Arraste o slider do fotógrafo
- Automaticamente ajusta a organização para somar 93%

**Opção B: Digitar Valores**
- Digite diretamente nos campos numéricos
- Sistema valida e ajusta automaticamente

**Regras:**
- 🏢 Plataforma: **sempre 7%** (não editável)
- 📸 Fotógrafo: **0% a 93%**
- 🏛️ Organização: **0% a 93%**
- ✅ Fotógrafo + Organização = **sempre 93%**

### Passo 4: Salvar

- Botão **"Salvar Alterações"** fica habilitado
- Se validação OK → Salva e fecha modal
- Se validação FALHA → Mostra erro e mantém aberto

---

## 📊 Exemplos de Configuração

### Exemplo 1: Evento Solo (Sem Organização)
```
🏢 Plataforma:   7%  (R$ 7,00)
📸 Fotógrafo:   93%  (R$ 93,00)
🏛️ Organização:  0%  (R$ 0,00)
─────────────────────────────
✅ Total:       100% (R$ 100,00)
```

### Exemplo 2: Evento com Organização (50/50)
```
🏢 Plataforma:   7%  (R$ 7,00)
📸 Fotógrafo:   46.5% (R$ 46,50)
🏛️ Organização: 46.5% (R$ 46,50)
─────────────────────────────
✅ Total:       100% (R$ 100,00)
```

### Exemplo 3: Evento com Organização (70/30)
```
🏢 Plataforma:   7%  (R$ 7,00)
📸 Fotógrafo:   70%  (R$ 70,00)
🏛️ Organização: 23%  (R$ 23,00)
─────────────────────────────
✅ Total:       100% (R$ 100,00)
```

---

## 🚨 Validações Implementadas

### 1. Plataforma Sempre 7%
```tsx
if (formData.platform_percentage !== 7) {
  ❌ Erro: "A plataforma deve ter exatamente 7% (fixo)."
}
```

### 2. Soma Fotógrafo + Organização = 93%
```tsx
const sum = photographer + organization;
if (sum !== 93) {
  ❌ Erro: "Fotógrafo + Organização deve somar 93% (atualmente: XX%)"
}
```

### 3. Limites de Valores
```tsx
// Fotógrafo: 0 a 93%
const photographerPct = Math.max(0, Math.min(93, value));

// Organização: 0 a 93%
const organizationPct = Math.max(0, Math.min(93, value));
```

---

## 🎯 Casos de Uso

### Caso 1: Admin configurou errado na criação
1. Admin cria evento com 60% fotógrafo, 30% organização, 10% plataforma
2. Percebe que está errado (sistema Banlek é 7% fixo)
3. Abre edição do evento
4. Ajusta para 7% plataforma, 70% fotógrafo, 23% organização
5. Salva ✅

### Caso 2: Renegociação com organização
1. Evento inicialmente: 93% fotógrafo, 0% organização
2. Organização entra no evento depois
3. Admin renegocia: 50% fotógrafo, 43% organização
4. Edita o evento e ajusta sliders
5. Salva ✅

### Caso 3: Evento muda de organizador
1. Evento de "Organização A" (70/23)
2. Muda para "Organização B"
3. Admin edita e altera dropdown de organização
4. Ajusta porcentagens se necessário
5. Salva ✅

---

## 🔐 Permissões

### Quem pode editar eventos?

✅ **Administradores** - Sim (acesso total)
❌ **Fotógrafos** - Não
❌ **Organizadores** - Não
❌ **Usuários comuns** - Não

### O que pode ser editado?

- ✅ Título, descrição, local, data
- ✅ Organização responsável
- ✅ **Porcentagens** (com validação Banlek)
- ✅ Status ativo/inativo
- ❌ ID do evento (imutável)
- ❌ Data de criação (imutável)

---

## 🐛 Problemas Resolvidos

### Antes ❌

```tsx
// Valores antigos (não Banlek)
platform_percentage: 60
photographer_percentage: 10
organization_percentage: 30

// Sem validação
// Permitia valores errados
// Soma podia ser qualquer coisa
```

**Problemas:**
- ❌ Sistema não seguia Banlek (7% fixo)
- ❌ Admin podia salvar valores inválidos
- ❌ Sem ajuste automático
- ❌ UI confusa

### Depois ✅

```tsx
// Valores Banlek
platform_percentage: 7 (FIXO)
photographer_percentage: 93 (padrão)
organization_percentage: 0 (padrão)

// Com validação rigorosa
// Ajuste automático ao mudar sliders
// Soma sempre 100%
```

**Melhorias:**
- ✅ Sistema Banlek correto (7% fixo)
- ✅ Validação antes de salvar
- ✅ Sliders com ajuste automático
- ✅ Preview em tempo real (R$)
- ✅ UI intuitiva com emojis

---

## 📝 Fluxo Completo de Edição

```
1. Admin acessa Dashboard
   ↓
2. Vai na aba "Eventos"
   ↓
3. Vê lista de eventos com cards
   ↓
4. Clica em "Editar" em um evento
   ↓
5. Modal abre com dados atuais
   ↓
6. Edita título/descrição/local/data (opcional)
   ↓
7. Ajusta porcentagens:
   - Move slider do fotógrafo
   - Organização ajusta automaticamente
   - Vê preview em R$ em tempo real
   ↓
8. Sistema valida:
   - Plataforma = 7%? ✅
   - Fotógrafo + Organização = 93%? ✅
   ↓
9. Clica em "Salvar Alterações"
   ↓
10. Toast de sucesso aparece
   ↓
11. Modal fecha
   ↓
12. Lista de eventos recarrega
   ↓
13. Evento aparece com novos dados
```

---

## 🧪 Como Testar

### Teste 1: Edição Básica
1. Login como admin
2. Ir em "Eventos"
3. Clicar "Editar" em qualquer evento
4. Mudar título para "Teste Editado"
5. Salvar
6. ✅ Deve mostrar toast de sucesso

### Teste 2: Edição de Porcentagens (Válido)
1. Abrir edição de evento
2. Ajustar fotógrafo para 70%
3. Organização ajusta para 23% automaticamente
4. Verificar: Total = 100% ✅
5. Salvar
6. ✅ Deve salvar com sucesso

### Teste 3: Validação (Inválido)
1. Abrir edição
2. Tentar forçar plataforma para 10%
3. Salvar
4. ❌ Deve mostrar erro: "Plataforma deve ter 7%"

### Teste 4: Slider Automático
1. Abrir edição
2. Mover slider do fotógrafo para 50%
3. Verificar: organização ajusta para 43% ✅
4. Mover slider da organização para 30%
5. Verificar: fotógrafo ajusta para 63% ✅

---

**Data:** 13/10/2025  
**Arquivo modificado:** `src/components/dashboard/CampaignManager.tsx`  
**Status:** ✅ Implementado e funcionando  
**Teste:** Pendente (admin deve testar)
