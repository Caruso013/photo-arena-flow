

## Diagnóstico

Encontrei **2 problemas críticos** afetando o site:

### 1. Chave API inválida (afeta TODO o site)
O console mostra `Invalid API key` na Home. O arquivo `src/integrations/supabase/client.ts` tem uma chave anon hardcoded como fallback que está **desatualizada** — não corresponde à chave atual do projeto Supabase. Isso faz com que, quando a variável de ambiente `VITE_SUPABASE_PUBLISHABLE_KEY` não está disponível (por ex. no build publicado), o site inteiro quebre.

**Correção**: Atualizar a chave fallback para a chave anon correta: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0cHFwcHZ5anJubnVobHNicHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTgxODksImV4cCI6MjA3MjY3NDE4OX0.1pstB5tT2nz0VSwukbr7nTzkMNcenURm-maPu3sqKLY`

### 2. Esgotamento de conexões do banco (erro 53300 persiste)
O banco ainda está retornando `remaining connection slots are reserved for roles with the SUPERUSER attribute`. Mesmo após o restart, a Home dispara **6 queries simultâneas** (3 counts + 1 campaigns + 2 batch queries), e toda navegação multiplica isso. A camada de resiliência (`supabaseResilience.ts`) existe mas **não está sendo usada** em nenhuma página — é apenas código morto.

**Correções**:
- Reduzir queries na Home: consolidar as 3 contagens em uma única chamada e limitar as fotos retornadas
- Aplicar a camada de resiliência (`resilientQuery`) nas queries críticas da Home
- Adicionar retry automático no `fetchData` da Home em caso de erro de conexão

### 3. Pagamento PIX — Estado atual
Os logs mostram que o PIX **está funcionando** (criou PIX, webhook processou, email enviado). O erro anterior ocorreu durante o período de esgotamento de conexões. Após corrigir os itens 1 e 2, o PIX deve funcionar normalmente. Porém, vou adicionar:
- Tratamento de erro mais robusto no `handleGeneratePix` com mensagens claras para o usuário
- Retry automático caso a Edge Function falhe na criação de purchases (etapa que usa DB)

## Arquivos a modificar

1. **`src/integrations/supabase/client.ts`** — Corrigir chave anon fallback
2. **`src/pages/Home.tsx`** — Reduzir queries simultâneas, usar resilientQuery, adicionar retry
3. **`src/components/checkout/TransparentCheckout.tsx`** — Adicionar retry no handleGeneratePix em caso de erro transitório

