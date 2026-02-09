

# Plano: Dar acesso aos nomes de clientes para organizadores

## Problema Atual

O dashboard de organizações (`OrganizationRevenue.tsx`) busca nomes de fotógrafos e compradores diretamente na tabela `profiles`. Quando aplicarmos as restrições de segurança (Etapa 1 do plano anterior), organizações perderão esse acesso, pois não são admin nem donos desses perfis.

## Solução

Integrar essa necessidade ao plano de segurança existente. A view `profiles_public` (que será criada na Etapa 1) contém `id` e `full_name` - exatamente o que as organizações precisam. Basta trocar a consulta no dashboard.

## Mudanças Necessárias

### 1. Na migration SQL (Etapa 1 do plano de segurança)

A view `profiles_public` já planejada resolve o problema:

```sql
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, role, created_at
FROM public.profiles;
```

Precisa apenas garantir que a RLS permita organizações acessarem essa view. Como `security_invoker = on` herda a RLS do usuário, e organizações não terão SELECT em `profiles`, precisamos de uma política adicional:

```sql
-- Organizações podem ver nomes (full_name) via profiles
CREATE POLICY "Organizations can view profile names"
  ON public.profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'organization'::user_role)
  );
```

Isso permite que organizações vejam profiles completos. Alternativa mais restritiva: criar uma view dedicada para organizações que só mostra compradores de seus eventos.

**Abordagem recomendada (mais segura):** Criar uma policy que permite organizações verem apenas profiles que são relevantes (compradores dos seus eventos ou fotógrafos dos seus eventos):

```sql
CREATE POLICY "Organizations can view related profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM revenue_shares rs
      JOIN organization_users ou ON ou.organization_id = rs.organization_id
      JOIN purchases pu ON pu.id = rs.purchase_id
      WHERE ou.user_id = auth.uid()
        AND (profiles.id = pu.buyer_id OR profiles.id = rs.photographer_id)
    )
  );
```

Isso garante que organizações vejam APENAS nomes de pessoas envolvidas nas suas vendas - nem mais, nem menos.

### 2. No frontend (1 arquivo)

**`src/pages/dashboard/OrganizationRevenue.tsx`** (linhas 236-243):

Trocar as consultas de `profiles` para `profiles_public`:

```typescript
// ANTES
supabase.from('profiles').select('id, full_name').in('id', photographerIds)
supabase.from('profiles').select('id, full_name').in('id', buyerIds)

// DEPOIS
supabase.from('profiles_public').select('id, full_name').in('id', photographerIds)
supabase.from('profiles_public').select('id, full_name').in('id', buyerIds)
```

## O que as organizações vao ver

| Dado | Visivel? |
|------|----------|
| Nome do comprador | Sim |
| Nome do fotografo | Sim |
| Email do comprador | Nao |
| PIX do fotografo | Nao |
| Dados sensíveis | Nao |

## Ordem de execucao

Essa mudanca faz parte da Etapa 1 do plano de seguranca. Sera aplicada junto com as demais restricoes de RLS, sem necessidade de etapa separada.

## Secao tecnica

- A view `profiles_public` usa `security_invoker = on`, ou seja, herda as permissoes RLS do usuario que consulta
- A policy "Organizations can view related profiles" usa uma subquery em `revenue_shares` + `organization_users` para limitar acesso apenas a perfis envolvidos nas vendas da organizacao
- Como `has_role` e `SECURITY DEFINER`, nao ha risco de recursao
- Edge functions usam `service_role` e nao sao afetadas
- O dashboard de organizacao continuara funcionando normalmente apos a mudanca
