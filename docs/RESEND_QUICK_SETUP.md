# ⚡ Configuração Rápida - Resend + Supabase

## 🎯 O que você precisa fazer AGORA:

### 1️⃣ Pegar a API Key do Resend

```bash
# 1. Acesse: https://resend.com/login
# 2. Vá em: Settings → API Keys
# 3. Copie a API key (começa com "re_")
```

### 2️⃣ Adicionar API Key no Supabase

```bash
# 1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJECT]/settings/functions
# 2. Clique em "Add new secret"
# 3. Nome: RESEND_API_KEY
# 4. Valor: [COLE SUA API KEY AQUI]
# 5. Clique em "Create secret"
```

### 3️⃣ Deploy das Functions (Execute no terminal)

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login no Supabase
npx supabase login

# Link com seu projeto (você vai precisar do Project Ref)
# Project Ref está em: Settings → General → Reference ID
npx supabase link --project-ref SEU_PROJECT_REF

# Deploy todas as 6 functions de uma vez
npx supabase functions deploy send-welcome-email && \
npx supabase functions deploy send-password-reset-email && \
npx supabase functions deploy send-sale-notification-email && \
npx supabase functions deploy send-purchase-confirmation-email && \
npx supabase functions deploy send-payout-approved-email && \
npx supabase functions deploy send-new-campaign-email

# ✅ Pronto! Todas as functions foram deployadas!
```

### 4️⃣ Testar (Execute no Supabase Dashboard)

```bash
# 1. Acesse: Functions → send-welcome-email
# 2. Clique em "Invoke function"
# 3. Cole este JSON:
{
  "email": "seu-email@teste.com",
  "fullName": "Seu Nome"
}
# 4. Clique em "Invoke"
# 5. Verifique sua caixa de entrada!
```

---

## 📧 Verificar Domínio (Se ainda não estiver)

```bash
# 1. Acesse: https://resend.com/domains
# 2. Clique em "Add Domain"
# 3. Digite: stafotos.com
# 4. Configure estes registros DNS no seu provedor:

# SPF Record:
Tipo: TXT
Nome: @
Valor: v=spf1 include:_spf.resend.com ~all

# DKIM Records (Resend vai fornecer os valores específicos)
Tipo: TXT
Nome: resend._domainkey
Valor: [COPIAR DO RESEND]

# 5. Aguarde até 48h para verificação
```

---

## 🎯 Checklist Rápido

- [ ] ✅ Peguei a API Key do Resend
- [ ] ✅ Adicionei a API Key no Supabase
- [ ] ✅ Executei `npx supabase login`
- [ ] ✅ Executei `npx supabase link`
- [ ] ✅ Deployei as 6 functions
- [ ] ✅ Testei o email de boas-vindas
- [ ] ✅ Domínio verificado no Resend

---

## 🚨 Comandos de Emergência

### Ver logs em tempo real:
```bash
npx supabase functions logs send-welcome-email --follow
```

### Re-deploy uma function específica:
```bash
npx supabase functions deploy send-welcome-email
```

### Ver status do projeto:
```bash
npx supabase status
```

---

## 💡 Dica Importante

**Depois que configurar a API Key no Supabase, aguarde 1-2 minutos antes de deployar as functions!**

Isso garante que a variável de ambiente esteja disponível.

---

## 📞 Se algo der errado:

1. **Verifique os logs:** `npx supabase functions logs [nome-da-function]`
2. **Confirme a API Key:** Settings → Edge Functions → Manage secrets
3. **Teste no Dashboard:** Functions → Invoke function
4. **Veja a documentação completa:** `RESEND_SETUP_GUIDE.md`

---

✅ **Pronto! Após seguir esses passos, todos os emails estarão funcionando automaticamente!** 🚀
