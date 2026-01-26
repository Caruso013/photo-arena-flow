
# Plano de Implementação - 4 Mudanças Rápidas

## Resumo das Mudanças Solicitadas

1. **Print 1**: Remover as abas "Organizador" e "Termos" do modal de criação de evento para fotógrafos (manter apenas para admin)
2. **Print 2**: Corrigir layout cortado e erros de download no dashboard do fotógrafo no celular
3. **Print 3**: Remover os cards "Vendas do Mês" e "Fotos Publicadas" para que as Ações Rápidas fiquem mais visíveis
4. **Print 4**: Permitir que o admin libere fotos para clientes (funcionalidade já existe, mas precisa permitir acesso admin)

---

## Mudança 1: Remover abas "Organizador" e "Termos" para fotógrafos

**Arquivo**: `src/components/modals/CreateCampaignModal.tsx`

**Problema**: O modal de criação de evento mostra 5 abas (Info, Organizador, Capa, Termos, Álbuns) para todos os usuários. Fotógrafos não devem ver "Organizador" e "Termos".

**Solução**: 
- Verificar se o usuário é admin (`isAdmin`)
- Renderizar condicionalmente as abas "Organizador" e "Termos" apenas para admins
- Atualizar o grid do TabsList para ajustar o número de colunas (3 para fotógrafos, 5 para admin)

**Alterações**:
```typescript
// Linha ~255: Mudar grid-cols-5 para condicional
<TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'} mb-4`}>
  <TabsTrigger value="info">Info</TabsTrigger>
  {isAdmin && <TabsTrigger value="organizer">Organizador</TabsTrigger>}
  <TabsTrigger value="cover">Capa</TabsTrigger>
  {isAdmin && <TabsTrigger value="terms">Termos</TabsTrigger>}
  <TabsTrigger value="albums">Álbuns</TabsTrigger>
</TabsList>
```

---

## Mudança 2: Corrigir layout mobile do dashboard do fotógrafo

**Arquivo**: `src/components/dashboard/PhotographerDashboard.tsx`

**Problemas identificados**:
- O título "Ações Rápidas" e os cards estão sendo cortados no topo
- Possível problema com padding/margin no container principal

**Solução**:
- Remover os 2 cards "Vendas do Mês" e "Fotos Publicadas" (já solicitado no Print 3)
- Manter apenas 2 MetricCards (Saldo Disponível e A Liberar) em grid 2 colunas
- Isso resolverá o problema de layout cortado automaticamente

---

## Mudança 3: Remover cards "Vendas do Mês" e "Fotos Publicadas"

**Arquivo**: `src/components/dashboard/PhotographerDashboard.tsx`

**Problema**: Os cards de métricas ocupam muito espaço, empurrando as Ações Rápidas para baixo.

**Solução**:
- Remover os MetricCards de "Vendas do Mês" e "Fotos Publicadas"
- Manter apenas 2 cards essenciais: "Saldo Disponível" e "A Liberar"
- Mudar o grid de 4 colunas para 2 colunas (`grid-cols-2`)

**Código a modificar** (linhas 211-241):
```typescript
{/* Metric Cards - Apenas 2 essenciais */}
<div className="grid grid-cols-2 gap-3 sm:gap-4">
  <MetricCard
    title="Saldo Disponível"
    value={formatCurrency(balance.availableAmount)}
    subtitle="Pronto para saque"
    icon={DollarSign}
    variant="success"
  />
  <MetricCard
    title="A Liberar"
    value={formatCurrency(balance.pendingAmount)}
    subtitle="Aguardando 12h"
    icon={CreditCard}
    variant="warning"
  />
</div>
```

---

## Mudança 4: Permitir admin liberar fotos para clientes

**Arquivos a modificar**:
- `src/pages/dashboard/photographer/ManageEvent.tsx`
- `src/pages/Campaign.tsx` (já funciona corretamente)

**Problema**: O `ManageEvent.tsx` verifica se `photographer_id === user.id`, não permitindo que admins acessem a página para liberar fotos.

**Solução em ManageEvent.tsx**:
1. Importar o profile do AuthContext para verificar role
2. Modificar a query `fetchEventData` para permitir admin
3. Adicionar verificação `isAdmin` nas operações

**Alterações no fetchEventData** (linha 136-141):
```typescript
const { profile } = useAuth();
const isAdmin = profile?.role === 'admin';

// Na query:
let query = supabase
  .from('campaigns')
  .select('*')
  .eq('id', id);

// Se não for admin, filtrar por photographer_id
if (!isAdmin) {
  query = query.eq('photographer_id', user.id);
}

const { data: campaignData, error: campaignError } = await query.single();
```

---

## Resumo dos Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/modals/CreateCampaignModal.tsx` | Ocultar abas Organizador/Termos para não-admin |
| `src/components/dashboard/PhotographerDashboard.tsx` | Remover 2 MetricCards e ajustar grid |
| `src/pages/dashboard/photographer/ManageEvent.tsx` | Permitir admin acessar qualquer evento |

---

## Benefícios

- **UX Simplificada**: Fotógrafos têm interface limpa com apenas o necessário
- **Mobile Otimizado**: Ações Rápidas visíveis logo no início da tela
- **Admin Funcional**: Administradores podem liberar fotos em qualquer evento
- **Código Limpo**: Lógica condicional baseada em role

---

## Ordem de Implementação

1. Modificar `PhotographerDashboard.tsx` - Remover cards extras
2. Modificar `CreateCampaignModal.tsx` - Ocultar abas para fotógrafos
3. Modificar `ManageEvent.tsx` - Permitir acesso admin

