# 🔧 Guia de Solução de Problemas - Sistema de Candidaturas

## Problemas Identificados e Soluções

### ❌ Erro: "Failed to load resource: the server responded with a status of 400"

**Causa:** A tabela `photographer_applications` não existe no banco de dados.

**Solução:**
1. Acesse o Supabase Dashboard
2. Vá para SQL Editor
3. Execute o conteúdo do arquivo `apply_photographer_applications_migration.sql`
4. Verifique se a execução foi bem-sucedida

### ❌ Erro: "AuthApiError: Invalid Refresh Token: Refresh Token Not Found"

**Causa:** Token de autenticação expirado ou corrompido.

**Soluções:**
1. **Limpar localStorage:**
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```

2. **Fazer logout e login novamente:**
   - Clique em sair da aplicação
   - Faça login novamente

3. **Verificar configuração do Supabase:**
   - Confirme se as URLs do Supabase estão corretas
   - Verifique se as chaves API estão válidas

### ❌ Erro: "Invalid login credentials"

**Causa:** Email ou senha incorretos, ou conta não confirmada.

**Soluções:**
1. **Verificar credenciais:**
   - Confirme se email e senha estão corretos
   - Tente resetar a senha se necessário

2. **Confirmar email:**
   - Verifique sua caixa de entrada
   - Clique no link de confirmação do Supabase

3. **Criar nova conta:**
   - Se persistir, tente criar uma nova conta

## 🚀 Passos para Aplicar as Correções

### 1. Aplicar Migração do Banco de Dados

```sql
-- Execute no Supabase SQL Editor
-- Conteúdo do arquivo apply_photographer_applications_migration.sql

-- Criar tabela photographer_applications
CREATE TABLE IF NOT EXISTS photographer_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    portfolio_url TEXT,
    experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50),
    equipment TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT
);

-- Criar índices e políticas RLS
-- (resto do conteúdo do arquivo)
```

### 2. Verificar Estado do Sistema

Após aplicar a migração:

1. **Recarregue a aplicação**
2. **Faça login novamente**
3. **Acesse a aba "Fotógrafo" no dashboard**
4. **Verifique o status no componente DatabaseChecker**

### 3. Testar Funcionalidades

1. **Envio de candidatura:**
   - Preencha o formulário de candidatura
   - Clique em "Enviar candidatura"
   - Verifique se não há erros no console

2. **Visualização de status:**
   - Confira se o status aparece corretamente
   - Teste a navegação entre formulário e status

3. **Painel administrativo:**
   - Login como admin
   - Acesse a seção de candidaturas
   - Teste aprovação/rejeição

## 🔍 Verificações Adicionais

### Edge Functions

Para verificar se as Edge Functions estão funcionando:

```bash
# No terminal do projeto
npx supabase functions list
npx supabase functions serve send-photographer-notification
```

### RLS Policies

Execute no SQL Editor para verificar políticas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'photographer_applications';
```

### Permissões de Usuário

Verifique se o usuário tem o role correto:

```sql
SELECT id, email, role FROM profiles WHERE email = 'seu-email@exemplo.com';
```

## 🆘 Se os Problemas Persistirem

1. **Verifique os logs do navegador:**
   - Abra DevTools (F12)
   - Vá para a aba Console
   - Procure por erros em vermelho

2. **Verifique logs do Supabase:**
   - Acesse o Supabase Dashboard
   - Vá para Logs
   - Procure por erros relacionados às tabelas

3. **Reaplique a migração:**
   - Execute novamente o arquivo de migração
   - Use `DROP TABLE IF EXISTS photographer_applications;` antes se necessário

4. **Limpe cache e dados:**
   ```javascript
   // No console do navegador
   localStorage.clear();
   sessionStorage.clear();
   window.location.reload();
   ```

## ✅ Checklist de Verificação

- [ ] Migração aplicada no banco de dados
- [ ] Tabela `photographer_applications` criada
- [ ] Políticas RLS configuradas
- [ ] Edge Function `send-photographer-notification` implantada
- [ ] Variável `RESEND_API_KEY` configurada
- [ ] Usuário consegue fazer login sem erros
- [ ] Dashboard carrega sem erros 400
- [ ] Formulário de candidatura funciona
- [ ] Emails são enviados corretamente

## 📞 Suporte

Se ainda houver problemas, verifique:
- Logs detalhados no console do navegador
- Status das APIs no Supabase Dashboard
- Configurações de autenticação e RLS