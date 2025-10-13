# 🚀 Instruções de Deploy - Emails StaFotos

## ✅ Status Atual

- [x] API Key configurada no Supabase ✅
- [x] `send-welcome-email` já existe e funciona ✅
- [ ] Criar/atualizar as outras 5 functions ⏳

---

## 🎯 Opção 1: Deploy pelo Dashboard (RECOMENDADO - Mais Simples)

### Passo a passo:

1. **Acesse:** https://supabase.com/dashboard/project/[SEU_PROJECT]/functions

2. **Para cada função abaixo, clique em "Deploy a new function":**

### 📋 Funções para criar:

#### 1️⃣ send-password-reset-email
```typescript
// Copie o conteúdo de: supabase/functions/send-password-reset-email/index.ts
// Cole no editor do Supabase
// Clique em "Deploy"
```

#### 2️⃣ send-sale-notification-email
```typescript
// Copie o conteúdo de: supabase/functions/send-sale-notification-email/index.ts
// Cole no editor do Supabase
// Clique em "Deploy"
```

#### 3️⃣ send-purchase-confirmation-email
```typescript
// Copie o conteúdo de: supabase/functions/send-purchase-confirmation-email/index.ts
// Cole no editor do Supabase
// Clique em "Deploy"
```

#### 4️⃣ send-payout-approved-email
```typescript
// Copie o conteúdo de: supabase/functions/send-payout-approved-email/index.ts
// Cole no editor do Supabase
// Clique em "Deploy"
```

#### 5️⃣ send-new-campaign-email
```typescript
// Copie o conteúdo de: supabase/functions/send-new-campaign-email/index.ts
// Cole no editor do Supabase
// Clique em "Deploy"
```

---

## 🎯 Opção 2: Deploy via CLI (Se conseguir autenticar)

### Passo 1: Obter Access Token

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Copie o token

### Passo 2: Configurar token

```bash
# Windows (PowerShell)
$env:SUPABASE_ACCESS_TOKEN="seu_token_aqui"

# Windows (CMD)
set SUPABASE_ACCESS_TOKEN=seu_token_aqui

# Mac/Linux
export SUPABASE_ACCESS_TOKEN=seu_token_aqui
```

### Passo 3: Link com projeto

```bash
npx supabase link --project-ref [SEU_PROJECT_REF]
```

### Passo 4: Deploy todas as functions

```bash
npx supabase functions deploy send-welcome-email
npx supabase functions deploy send-password-reset-email
npx supabase functions deploy send-sale-notification-email
npx supabase functions deploy send-purchase-confirmation-email
npx supabase functions deploy send-payout-approved-email
npx supabase functions deploy send-new-campaign-email
```

---

## 🎯 Opção 3: Deploy Automatizado (Script Python)

Criei um script que faz upload automático via API do Supabase.

```bash
python deploy_functions.py
```

(Script disponível em: `deploy_functions.py`)

---

## ✅ Testar Após Deploy

Para cada função deployada, teste no Dashboard:

1. **Acesse:** Functions → [nome-da-function]
2. **Clique:** "Invoke function"
3. **Cole o JSON de teste:**

### send-welcome-email
```json
{
  "email": "seu@email.com",
  "fullName": "Seu Nome"
}
```

### send-password-reset-email
```json
{
  "userEmail": "seu@email.com",
  "userName": "Seu Nome",
  "resetLink": "https://stafotos.com/reset?token=123"
}
```

### send-sale-notification-email
```json
{
  "photographerEmail": "fotografo@email.com",
  "photographerName": "Fotógrafo Teste",
  "photoTitle": "Foto Teste",
  "campaignTitle": "Evento Teste",
  "saleAmount": 50,
  "photographerAmount": 46.50,
  "buyerName": "Cliente Teste"
}
```

### send-purchase-confirmation-email
```json
{
  "buyerEmail": "comprador@email.com",
  "buyerName": "Comprador Teste",
  "photoTitle": "Foto Teste",
  "campaignTitle": "Evento Teste",
  "amount": 50,
  "photographerName": "Fotógrafo Teste"
}
```

### send-payout-approved-email
```json
{
  "photographerEmail": "fotografo@email.com",
  "photographerName": "Fotógrafo Teste",
  "amount": 100,
  "requestedAt": "2025-01-10T10:00:00Z",
  "approvedAt": "2025-01-11T10:00:00Z"
}
```

### send-new-campaign-email
```json
{
  "adminEmail": "admin@stafotos.com",
  "campaignTitle": "Novo Campeonato",
  "campaignDescription": "Descrição do evento",
  "photographerName": "Fotógrafo Teste",
  "photographerEmail": "fotografo@email.com",
  "eventDate": "2025-02-01T10:00:00Z",
  "location": "São Paulo - SP",
  "campaignId": "123"
}
```

---

## 📊 Checklist Final

- [ ] 6 Edge Functions deployadas
- [ ] Testado cada função (JSON acima)
- [ ] Email recebido sem erros
- [ ] Verificado logs (sem erros)
- [ ] Templates renderizando corretamente

---

## 🚨 Troubleshooting

### ❌ Erro: "RESEND_API_KEY não configurada"
**Solução:** Verifique em Settings → Edge Functions → Manage secrets

### ❌ Erro: "Module not found"
**Solução:** Certifique-se de que está usando o código correto dos arquivos

### ❌ Email não chega
**Soluções:**
1. Verifique spam
2. Veja logs no Resend Dashboard
3. Confirme que domínio está verificado

---

## ✅ Próximo Passo

Depois de deployar todas as 6 functions:
1. ✅ Teste cada uma
2. ✅ Marque a tarefa "PRIORIDADE 2" como completa
3. ✅ Parta para integração no código (EMAIL_INTEGRATION_EXAMPLES.ts)

---

**🚀 Boa sorte com o deploy! Em 15 minutos tudo estará funcionando!**
