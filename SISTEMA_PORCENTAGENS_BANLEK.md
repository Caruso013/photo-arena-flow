# 🎯 Sistema de Porcentagens Estilo Banlek

## 📊 Conceito

Implementamos um sistema de divisão de receita similar ao da **Banlek**, onde:

### Taxa da Plataforma: **7% FIXO**
- **Nunca muda**
- Aplicado automaticamente em todas as vendas
- Garantido por constraint no banco de dados
- Trigger automático valida ao criar/editar campanha

### Divisão dos 93% Restantes
Os **93% restantes** de cada venda são divididos entre:
- **Fotógrafo**: 0% a 93%
- **Organização**: 0% a 93%
- **Regra**: Fotógrafo% + Organização% = 93%

## 🎨 Interface do Usuário

### Modal de Criação de Campanha

```
┌─────────────────────────────────────────────────────┐
│  📸 Criar Novo Evento                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Título do Evento]                                 │
│  [Descrição]                                        │
│  [Local]  [Data]                                    │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ 💰 Divisão de Receita                         │ │
│  │                                               │ │
│  │ ℹ️ Plataforma mantém 7% fixo                  │ │
│  │ Os 93% restantes são divididos:              │ │
│  │                                               │ │
│  │  📷 Fotógrafo: [___93___] %                   │ │
│  │  🏢 Organização: [____0___] %                 │ │
│  │                                               │ │
│  │  ┌─────────────────────────────────────┐     │ │
│  │  │ Exemplo: Venda de R$ 100,00         │     │ │
│  │  ├─────────────────────────────────────┤     │ │
│  │  │ 🌐 Plataforma (7%)    R$ 7,00       │     │ │
│  │  │ 📷 Fotógrafo (93%)   R$ 93,00       │     │ │
│  │  │ 🏢 Organização (0%)   R$ 0,00       │     │ │
│  │  └─────────────────────────────────────┘     │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Cancelar]  [Criar Evento]                        │
└─────────────────────────────────────────────────────┘
```

### Cenários de Uso

#### 1️⃣ Fotógrafo Solo (Padrão)
```
Plataforma:   7%  → R$ 7,00
Fotógrafo:   93%  → R$ 93,00
Organização:  0%  → R$ 0,00
────────────────────────────
TOTAL:      100%  → R$ 100,00
```

#### 2️⃣ Evento com Organização (50/50)
```
Plataforma:   7%  → R$ 7,00
Fotógrafo:   46.5% → R$ 46,50
Organização: 46.5% → R$ 46,50
────────────────────────────
TOTAL:      100%  → R$ 100,00
```

#### 3️⃣ Organização com Maior Parte (30/70)
```
Plataforma:   7%  → R$ 7,00
Fotógrafo:   28%  → R$ 28,00
Organização: 65%  → R$ 65,00
────────────────────────────
TOTAL:      100%  → R$ 100,00
```

## 🔧 Implementação Técnica

### 1. Migração SQL (`20250111000002_fixed_platform_fee_7_percent.sql`)

**Recursos:**
- ✅ Atualiza campanhas existentes para 7%
- ✅ Define DEFAULT 7% para platform_percentage
- ✅ Constraint: `platform = 7 AND (photographer + organization) = 93`
- ✅ Trigger automático valida percentuais antes de insert/update
- ✅ Função PL/pgSQL força valores corretos
- ✅ View auxiliar para visualizar distribuição

**Constraint Principal:**
```sql
CHECK (
  platform_percentage = 7 
  AND (photographer_percentage + COALESCE(organization_percentage, 0)) = 93
)
```

**Trigger de Validação:**
```sql
CREATE TRIGGER trigger_validate_campaign_percentages
  BEFORE INSERT OR UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_campaign_percentages();
```

### 2. Component React (`CreateCampaignModal.tsx`)

**Estado:**
```typescript
const [formData, setFormData] = useState({
  photographer_percentage: 93,  // Padrão: tudo pro fotógrafo
  organization_percentage: 0,   // Padrão: sem organização
  // platform_percentage: 7 (FIXO, não precisa no estado)
});
```

**Handlers Inteligentes:**
```typescript
// Ao mudar fotógrafo, ajusta organização automaticamente
const handlePhotographerPercentageChange = (value: number) => {
  const photographerPct = Math.max(0, Math.min(93, value));
  const organizationPct = 93 - photographerPct;
  setFormData({...prev, 
    photographer_percentage: photographerPct,
    organization_percentage: organizationPct
  });
};

// Ao mudar organização, ajusta fotógrafo automaticamente
const handleOrganizationPercentageChange = (value: number) => {
  const organizationPct = Math.max(0, Math.min(93, value));
  const photographerPct = 93 - organizationPct;
  setFormData({...prev,
    photographer_percentage: photographerPct,
    organization_percentage: organizationPct
  });
};
```

**Validação:**
```typescript
const calculatePercentages = () => {
  const platform = 7; // FIXO
  const photographer = formData.photographer_percentage;
  const organization = formData.organization_percentage;
  const sum = platform + photographer + organization;
  const isValid = sum === 100 && photographer + organization === 93;
  
  return { platform, photographer, organization, sum, isValid };
};
```

**Submit:**
```typescript
const { error } = await supabase
  .from('campaigns')
  .insert({
    platform_percentage: 7, // SEMPRE 7%
    photographer_percentage: formData.photographer_percentage,
    organization_percentage: formData.organization_percentage,
    // ...outros campos
  });
```

## 🎯 Funcionalidades

### ✅ Implementado

1. **Taxa Fixa 7%**
   - Constraint no banco garante
   - Trigger valida automaticamente
   - UI mostra como "fixo"

2. **Divisão Automática dos 93%**
   - Sliders/inputs ajustam automaticamente
   - Não permite soma != 93%
   - Feedback visual imediato

3. **Preview em Tempo Real**
   - Mostra exemplo com R$ 100,00
   - Calcula valores para cada parte
   - Indicador visual de validade (✓/✗)

4. **Validação Dupla**
   - Frontend: Antes de enviar
   - Backend: Trigger SQL + Constraint

5. **Casos de Uso**
   - Fotógrafo solo: 93/0
   - Colaboração: Qualquer divisão que some 93%
   - Sem organização: organization_percentage = 0

### 🎨 Interface Features

- **Badges coloridos** para cada tipo de receita
- **Cálculo em tempo real** de valores monetários
- **Mensagens de erro** claras e específicas
- **Design visual** inspirado no Banlek
- **Responsivo** para mobile

## 📋 Como Usar

### Para Criar Evento

1. **Preencher informações básicas** (título, local, data)
2. **Selecionar organização** (opcional)
3. **Ajustar divisão dos 93%:**
   - Mover slider do fotógrafo OU
   - Mover slider da organização
   - Sistema ajusta o outro automaticamente
4. **Verificar preview** da divisão
5. **Criar evento** (validação automática)

### Exemplos Práticos

**Evento Solo:**
- Fotógrafo: 93%
- Organização: 0%
- (Sistema mantém plataforma em 7%)

**Evento Corporativo:**
- Fotógrafo: 40%
- Organização: 53%
- (Sistema mantém plataforma em 7%)

**Evento Compartilhado 50/50:**
- Fotógrafo: 46.5%
- Organização: 46.5%
- (Sistema mantém plataforma em 7%)

## 🚀 Próximos Passos

### Para Aplicar no Supabase

1. Abrir **SQL Editor** no Supabase
2. Executar migração: `20250111000002_fixed_platform_fee_7_percent.sql`
3. Verificar constraints criados
4. Testar trigger com INSERT/UPDATE manual

### Para Testar

```sql
-- Teste 1: Criar campanha válida (fotógrafo solo)
INSERT INTO campaigns (title, photographer_percentage, organization_percentage)
VALUES ('Teste Solo', 93, 0);
-- Esperado: ✅ Sucesso, platform_percentage = 7

-- Teste 2: Criar campanha válida (com organização)
INSERT INTO campaigns (title, photographer_percentage, organization_percentage, organization_id)
VALUES ('Teste Corp', 50, 43, 'uuid-org');
-- Esperado: ✅ Sucesso, platform_percentage = 7

-- Teste 3: Tentar criar campanha inválida
INSERT INTO campaigns (title, photographer_percentage, organization_percentage)
VALUES ('Teste Inválido', 50, 50);
-- Esperado: ❌ Erro - soma deve ser 93%

-- Teste 4: Tentar forçar platform != 7
INSERT INTO campaigns (title, platform_percentage, photographer_percentage, organization_percentage)
VALUES ('Teste Platform', 10, 90, 0);
-- Esperado: ✅ Trigger força platform = 7
```

## 📊 Impacto

### Antes (Sistema Antigo)
```
❌ Taxa variável (qualquer %)
❌ Soma poderia ser != 100%
❌ Sem validação automática
❌ Confusão na UI
```

### Depois (Sistema Banlek)
```
✅ Taxa FIXA em 7%
✅ Sempre soma 100%
✅ Validação dupla (SQL + UI)
✅ Interface clara e intuitiva
✅ Cálculos em tempo real
✅ Preview visual
```

## 🔒 Segurança

- **Constraint SQL** impede valores inválidos
- **Trigger** força valores corretos
- **Validação frontend** evita erros do usuário
- **Tipos TypeScript** garantem estrutura
- **Toast notifications** informam problemas

## 📝 Notas Importantes

⚠️ **ATENÇÃO**: Após aplicar a migração:
- Todas campanhas terão platform_percentage = 7%
- Campanhas existentes serão ajustadas automaticamente
- Impossível criar campanha com platform != 7%
- Impossível criar campanha onde foto% + org% != 93%

💡 **DICA**: Use o preview do modal para:
- Simular divisões diferentes
- Calcular valores reais
- Explicar ao cliente/fotógrafo

🎯 **OBJETIVO**: Transparência total na divisão de receita, assim como a Banlek faz!

---

**Documentação criada em:** 11/01/2025  
**Versão do Sistema:** 2.0 (Banlek-style)  
**Migração SQL:** `20250111000002_fixed_platform_fee_7_percent.sql`
