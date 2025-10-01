# Revisão de Código - Photo Arena Flow

## ✅ Pontos Fortes do Código Atual

### 1. Arquitetura
- ✅ Separação clara de responsabilidades (components, pages, hooks, contexts)
- ✅ Uso de TypeScript para type safety
- ✅ Integração completa com Supabase (Auth, Database, Storage, Edge Functions)
- ✅ Row Level Security (RLS) implementado corretamente

### 2. Segurança
- ✅ Validação de inputs com Zod (`src/lib/validation.ts`)
- ✅ RLS policies protegendo dados sensíveis
- ✅ Remoção de console.logs com dados sensíveis
- ✅ Autenticação via Supabase Auth
- ✅ Proteção anti-screenshot (`AntiScreenshotProtection.tsx`)

### 3. UI/UX
- ✅ Design system consistente com Tailwind
- ✅ Componentes reutilizáveis (shadcn/ui)
- ✅ Responsivo para mobile e desktop
- ✅ Feedback visual (toasts, loading states)
- ✅ Marca d'água nas fotos

### 4. Funcionalidades
- ✅ Sistema completo de campanhas e fotos
- ✅ Upload de fotos com watermark automático
- ✅ Dashboards diferentes por role (admin, fotógrafo, usuário)
- ✅ Sistema de pagamentos com Mercado Pago
- ✅ Download de fotos originais após compra

## ⚠️ Áreas que Precisam de Atenção

### 1. Performance

#### Problema: Consultas não otimizadas
**Localização**: `src/components/dashboard/UserDashboard.tsx`, linha 68-86
```typescript
// ❌ Busca TODAS as purchases do usuário sem limit
const { data, error } = await supabase
  .from('purchases')
  .select('...')
  .eq('buyer_id', user.id)
```

**Solução**: Adicionar paginação
```typescript
// ✅ Com paginação
const { data, error } = await supabase
  .from('purchases')
  .select('...', { count: 'exact' })
  .eq('buyer_id', user.id)
  .range(page * pageSize, (page + 1) * pageSize - 1)
  .order('created_at', { ascending: false });
```

#### Problema: Imagens grandes sem otimização
**Localização**: Upload de fotos

**Solução**: 
- Implementar compressão de imagens antes do upload
- Usar diferentes tamanhos (thumbnail, medium, original)
- Lazy loading nas galerias

### 2. Error Handling

#### Problema: Erros genéricos ao usuário
**Localização**: Vários arquivos

**Exemplo Ruim**:
```typescript
catch (error) {
  toast({
    title: "Erro",
    description: "Algo deu errado",
    variant: "destructive",
  });
}
```

**Solução**: Mensagens específicas
```typescript
catch (error) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Erro desconhecido';
  
  toast({
    title: "Erro ao carregar fotos",
    description: errorMessage,
    variant: "destructive",
  });
  
  // Log para debugging (apenas em dev)
  if (process.env.NODE_ENV === 'development') {
    console.error('Fetch photos error:', error);
  }
}
```

### 3. Edge Functions

#### Problema: listUsers() pode ser lento
**Localização**: `supabase/functions/create-payment-preference/index.ts`, linha 58
```typescript
// ❌ Busca TODOS os usuários
const { data: userData } = await supabase.auth.admin.listUsers();
const buyer = userData.users.find(u => u.email === buyerInfo.email);
```

**Solução**: Usar getUserByEmail ou criar perfil se não existir
```typescript
// ✅ Busca direta ou cria
let buyer;
try {
  const { data } = await supabase.auth.admin.getUserByEmail(buyerInfo.email);
  buyer = data.user;
} catch {
  // Se não existe, cria novo usuário
  const { data } = await supabase.auth.admin.createUser({
    email: buyerInfo.email,
    email_confirm: true,
    user_metadata: {
      full_name: `${buyerInfo.name} ${buyerInfo.surname}`,
    },
  });
  buyer = data.user;
}
```

### 4. Webhook Security

#### Problema: Webhook não valida origem
**Localização**: `supabase/functions/mercadopago-webhook/index.ts`

**Solução**: Validar assinatura do Mercado Pago
```typescript
// Adicionar validação de assinatura
const signature = req.headers.get('x-signature');
const requestId = req.headers.get('x-request-id');

if (!signature || !requestId) {
  return new Response('Unauthorized', { status: 401 });
}

// Validar usando secret do Mercado Pago
const isValid = await validateMPSignature(signature, requestId, payload);
if (!isValid) {
  return new Response('Invalid signature', { status: 401 });
}
```

### 5. Código Duplicado

#### Problema: Lógica repetida em vários componentes
**Localização**: Fetch de campanhas em múltiplos lugares

**Solução**: Criar custom hooks
```typescript
// hooks/useCampaigns.ts
export const useCampaigns = (filters?: CampaignFilters) => {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => fetchCampaigns(filters),
  });
};
```

### 6. Tipos

#### Problema: Tipos duplicados/incompletos
**Localização**: Vários arquivos definem interfaces similares

**Solução**: Centralizar tipos
```typescript
// types/database.ts
export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type Photo = Database['public']['Tables']['photos']['Row'];
export type Purchase = Database['public']['Tables']['purchases']['Row'];

// types/api.ts
export interface CampaignWithPhotographer extends Campaign {
  photographer: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}
```

## 🔧 Refatorações Recomendadas

### 1. Criar Services Layer
```
src/
  services/
    campaignService.ts
    photoService.ts
    purchaseService.ts
    paymentService.ts
```

### 2. Implementar React Query
- Cache automático
- Refetch inteligente
- Loading/error states
- Invalidação de cache

### 3. Melhorar Estrutura de Pastas
```
src/
  features/
    campaigns/
      components/
      hooks/
      services/
    photos/
      components/
      hooks/
      services/
    purchases/
      components/
      hooks/
      services/
```

### 4. Adicionar Testes
- Unit tests para utils e services
- Integration tests para edge functions
- E2E tests para fluxos críticos

## 📊 Métricas de Código

### Linhas de Código
- Total: ~5,000 linhas
- Components: ~3,000 linhas
- Edge Functions: ~500 linhas
- Utils/Helpers: ~500 linhas

### Complexidade
- Baixa complexidade na maioria dos componentes ✅
- Alta complexidade em UserDashboard (544 linhas) ⚠️

### Cobertura de Tipos
- ~80% do código com tipos TypeScript ✅
- Alguns `any` que podem ser tipados ⚠️

## 🎯 Prioridades de Melhoria

### Alta Prioridade (Fazer Logo)
1. ✅ Otimizar consultas com paginação
2. ✅ Validar webhook do Mercado Pago
3. ✅ Criar usuário se não existir no pagamento
4. ✅ Melhorar error handling

### Média Prioridade (Próximas Sprints)
1. Implementar cache
2. Adicionar testes automatizados
3. Refatorar UserDashboard (dividir em componentes menores)
4. Centralizar tipos

### Baixa Prioridade (Backlog)
1. Reestruturar pastas (features)
2. Adicionar Storybook
3. Implementar analytics
4. Adicionar monitoring (Sentry)

## 💡 Conclusão

O código está em um **bom estado geral** com boa arquitetura e segurança. As principais melhorias devem focar em:
1. **Performance** - Otimização de consultas
2. **Segurança** - Validação de webhooks
3. **Manutenibilidade** - Refatoração de componentes grandes
4. **Confiabilidade** - Melhor error handling

Nenhuma mudança é **urgente**, mas as melhorias incrementais vão tornar o código mais robusto e fácil de manter.
