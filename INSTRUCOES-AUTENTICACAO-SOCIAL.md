# 📧 Templates de Email + Autenticação Social (Google & Apple)

## 📋 Templates de Email Criados

Criei 4 templates HTML profissionais para o Supabase:

1. **welcome-email.html** - Email de boas-vindas
2. **magic-link.html** - Link mágico de acesso
3. **password-reset.html** - Redefinição de senha
4. **email-change.html** - Confirmação de mudança de email

### Como Usar os Templates no Supabase:

1. Acesse seu projeto no Supabase Dashboard
2. Vá em **Authentication** > **Email Templates**
3. Para cada template (Confirm signup, Magic Link, Change Email Address, Reset Password):
   - Cole o conteúdo HTML correspondente
   - Os templates já usam as variáveis corretas do Supabase: `{{ .ConfirmationURL }}` e `{{ .SiteURL }}`

---

## 🔐 Configurar Login com Google

### Passo 1: Configurar no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em **APIs & Services** > **OAuth consent screen**
   - Configure a tela de consentimento
   - Adicione seu domínio Supabase: `gtpqppvyjrnnuhlsbpqd.supabase.co`
   - Configure os escopos:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`

4. Vá em **APIs & Services** > **Credentials**
5. Clique em **Create Credentials** > **OAuth Client ID**
6. Escolha **Web application**
7. Configure:
   - **Authorized JavaScript origins**: 
     - `https://gtpqppvyjrnnuhlsbpqd.supabase.co`
     - Seu domínio de produção (se houver)
   - **Authorized redirect URIs**:
     - `https://gtpqppvyjrnnuhlsbpqd.supabase.co/auth/v1/callback`

8. Copie o **Client ID** e **Client Secret**

### Passo 2: Configurar no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/gtpqppvyjrnnuhlsbpqd/auth/providers)
2. Vá em **Authentication** > **Providers**
3. Encontre **Google** e habilite
4. Cole o **Client ID** e **Client Secret**
5. Salve

### Passo 3: Configurar URLs no Supabase

1. Vá em **Authentication** > **URL Configuration**
2. Configure:
   - **Site URL**: URL do seu app (ex: `https://seu-dominio.com`)
   - **Redirect URLs**: Adicione todas as URLs permitidas para redirect após login

---

## 🍎 Configurar Login com Apple

### Passo 1: Configurar no Apple Developer

1. Acesse [Apple Developer Portal](https://developer.apple.com/account/)
2. Vá em **Certificates, Identifiers & Profiles**
3. Clique em **Identifiers** > **+** para criar um novo App ID
4. Selecione **App IDs** e continue
5. Configure:
   - **Description**: Nome do seu app
   - **Bundle ID**: Escolha um identificador único (ex: `com.photoarena.app`)
   - Habilite **Sign in with Apple**

6. Crie um **Services ID**:
   - Clique em **Identifiers** > **+**
   - Selecione **Services IDs**
   - Configure:
     - **Description**: Photo Arena Web
     - **Identifier**: Use um diferente do App ID (ex: `com.photoarena.web`)
     - Habilite **Sign in with Apple**
     - Clique em **Configure**
     - **Primary App ID**: Selecione o App ID criado anteriormente
     - **Web Domain**: `gtpqppvyjrnnuhlsbpqd.supabase.co`
     - **Return URLs**: `https://gtpqppvyjrnnuhlsbpqd.supabase.co/auth/v1/callback`

7. Crie uma **Key**:
   - Vá em **Keys** > **+**
   - Dê um nome (ex: "Sign in with Apple Key")
   - Habilite **Sign in with Apple**
   - Configure e baixe a key (.p8 file)
   - **IMPORTANTE**: Anote o **Key ID** e **Team ID**

### Passo 2: Configurar no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/gtpqppvyjrnnuhlsbpqd/auth/providers)
2. Vá em **Authentication** > **Providers**
3. Encontre **Apple** e habilite
4. Configure:
   - **Services ID**: O identifier do Services ID criado
   - **Team ID**: Seu Team ID da Apple
   - **Key ID**: O Key ID da key criada
   - **Private Key**: Cole o conteúdo do arquivo .p8
5. Salve

---

## 🔄 Implementação no Frontend

Já existe um componente de autenticação em `src/pages/Auth.tsx`. Para adicionar os botões de login social:

```typescript
// Login com Google
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });
  if (error) console.error('Erro no login com Google:', error);
};

// Login com Apple
const handleAppleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/dashboard`
    }
  });
  if (error) console.error('Erro no login com Apple:', error);
};
```

---

## ⚠️ IMPORTANTE - URLs de Redirect

Para que o login funcione corretamente, você DEVE configurar as URLs corretas no Supabase:

1. Acesse **Authentication** > **URL Configuration**
2. Configure:
   - **Site URL**: URL principal do app
   - **Redirect URLs**: Adicione TODAS as URLs onde o usuário pode fazer login:
     - URL de preview do Lovable
     - URL de produção
     - Localhost (para desenvolvimento)

Sem isso, você verá o erro: `{ "error": "requested path is invalid" }`

---

## 📝 Checklist Final

- [ ] Templates de email configurados no Supabase
- [ ] Google OAuth configurado no Google Cloud Console
- [ ] Google provider habilitado no Supabase
- [ ] Apple Sign In configurado no Apple Developer Portal
- [ ] Apple provider habilitado no Supabase
- [ ] URLs de redirect configuradas corretamente
- [ ] Botões de login social adicionados no frontend
- [ ] Testado login com Google
- [ ] Testado login com Apple

---

## 🆘 Suporte

Se tiver problemas:
- Verifique os logs em **Authentication** > **Logs** no Supabase
- Confirme que as URLs estão corretas
- Teste primeiro em modo de desenvolvimento antes de produção
