# 📧 Guia de Configuração do Resend - StaFotos

## 🎯 Visão Geral

Sistema completo de emails transacionais usando Resend.com integrado ao Supabase Edge Functions.

**Domínio:** `stafotos.com`  
**Email de envio:** `noreply@stafotos.com`

---

## 📋 Pré-requisitos

✅ Conta no Resend.com  
✅ Domínio `stafotos.com` verificado no Resend  
✅ API Key do Resend  
✅ Acesso ao Supabase Dashboard

---

## 🚀 Passo a Passo de Configuração

### 1️⃣ Configurar API Key no Resend

1. **Acesse:** https://resend.com/login
2. **Login** com sua conta
3. **Navegue:** Settings → API Keys
4. **Copie** sua API key (começa com `re_`)

### 2️⃣ Verificar Domínio no Resend

1. **Acesse:** Domains no Resend
2. **Verifique** se `stafotos.com` está verificado (✅)
3. **Se não estiver verificado:**
   - Add Domain → `stafotos.com`
   - Configure os registros DNS (SPF, DKIM, DMARC)
   - Aguarde verificação (pode levar até 48h)

### 3️⃣ Configurar Variável de Ambiente no Supabase

1. **Acesse:** https://supabase.com/dashboard
2. **Selecione** seu projeto StaFotos
3. **Navegue:** Settings → Edge Functions → Manage secrets
4. **Adicione** a variável:
   ```
   Nome: RESEND_API_KEY
   Valor: re_SuaAPIKeyAqui
   ```
5. **Salve** as alterações

### 4️⃣ Deploy das Edge Functions

Execute no terminal (na pasta raiz do projeto):

```bash
# Login no Supabase (se ainda não estiver logado)
npx supabase login

# Link com seu projeto
npx supabase link --project-ref SEU_PROJECT_REF

# Deploy de todas as Edge Functions
npx supabase functions deploy send-welcome-email
npx supabase functions deploy send-password-reset-email
npx supabase functions deploy send-sale-notification-email
npx supabase functions deploy send-purchase-confirmation-email
npx supabase functions deploy send-payout-approved-email
npx supabase functions deploy send-new-campaign-email
```

---

## 📧 Templates de Email Implementados

### 1. 🎉 **Boas-vindas** (`send-welcome-email`)
- **Quando:** Novo usuário se registra
- **Para:** Usuário
- **Conteúdo:** Apresentação da plataforma, links úteis

### 2. 🔐 **Recuperação de Senha** (`send-password-reset-email`)
- **Quando:** Usuário solicita reset de senha
- **Para:** Usuário
- **Conteúdo:** Link de redefinição (expira em 1h)

### 3. 💰 **Venda Confirmada** (`send-sale-notification-email`)
- **Quando:** Foto do fotógrafo é vendida
- **Para:** Fotógrafo
- **Conteúdo:** Detalhes da venda, valor do repasse

### 4. ✅ **Compra Confirmada** (`send-purchase-confirmation-email`)
- **Quando:** Cliente compra uma foto
- **Para:** Comprador
- **Conteúdo:** Link de download, detalhes da compra

### 5. 💸 **Repasse Aprovado** (`send-payout-approved-email`)
- **Quando:** Admin aprova solicitação de repasse
- **Para:** Fotógrafo
- **Conteúdo:** Valor, previsão de recebimento

### 6. 🎨 **Novo Evento Criado** (`send-new-campaign-email`)
- **Quando:** Fotógrafo cria novo evento
- **Para:** Admin
- **Conteúdo:** Detalhes do evento para aprovação

---

## 🔧 Testando os Emails

### Teste Manual via Supabase Dashboard

1. **Acesse:** Functions no Supabase
2. **Selecione** uma function (ex: `send-welcome-email`)
3. **Clique** em "Invoke Function"
4. **Cole** o JSON de teste:

```json
{
  "userEmail": "seu-email@teste.com",
  "userName": "Teste User"
}
```

5. **Execute** e verifique sua caixa de entrada

### Teste via Código TypeScript

```typescript
import { supabase } from '@/integrations/supabase/client';

// Exemplo: Enviar email de boas-vindas
const { data, error } = await supabase.functions.invoke('send-welcome-email', {
  body: {
    userEmail: 'usuario@exemplo.com',
    userName: 'João Silva'
  }
});

if (error) console.error('Erro:', error);
else console.log('Email enviado:', data);
```

---

## 🎨 Personalização dos Templates

Todos os templates usam:
- **Cores:** Roxo (#667eea) e Violeta (#764ba2)
- **Layout:** Responsivo (mobile-first)
- **Logo:** StaFotos no header
- **Footer:** Informações da plataforma

Para personalizar, edite os arquivos em:
```
supabase/functions/[nome-da-function]/index.ts
```

---

## 🔍 Monitoramento e Logs

### Ver logs de envio:

```bash
# Logs em tempo real
npx supabase functions logs send-welcome-email --follow

# Logs das últimas execuções
npx supabase functions logs send-welcome-email
```

### Dashboard do Resend:
- **Acesse:** https://resend.com/emails
- **Veja:** Status de entrega, bounces, opens, clicks

---

## 🐛 Troubleshooting

### ❌ Erro: "RESEND_API_KEY não configurada"
**Solução:** Configure a variável de ambiente no Supabase (Passo 3)

### ❌ Erro: "Domain not verified"
**Solução:** Verifique o domínio no Resend (Passo 2)

### ❌ Erro: "403 Forbidden"
**Solução:** Verifique se a API key está correta

### ❌ Email não chega
**Soluções:**
1. Verifique spam/lixo eletrônico
2. Confirme que o domínio está verificado
3. Veja logs no Dashboard do Resend
4. Teste com outro email

---

## 📊 Próximos Passos

Depois da configuração:

1. ✅ **Testar todos os 6 templates**
2. ✅ **Integrar chamadas nos eventos do banco**
3. ✅ **Configurar triggers automáticos** (próxima seção)
4. ✅ **Monitorar métricas de entrega**

---

## 🔗 Integrando com o Backend

### Exemplo: Enviar email ao criar usuário

```typescript
// No arquivo de registro de usuário
async function handleUserRegistration(email: string, fullName: string) {
  // 1. Criar usuário no Supabase Auth
  const { data: user, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (!error && user) {
    // 2. Enviar email de boas-vindas
    await supabase.functions.invoke('send-welcome-email', {
      body: {
        userEmail: email,
        userName: fullName,
      }
    });
  }
}
```

### Exemplo: Enviar email ao vender foto

```typescript
// No arquivo de processamento de pagamento
async function handlePhotoSale(purchaseData: any) {
  // ... processar pagamento ...

  // Enviar email para comprador
  await supabase.functions.invoke('send-purchase-confirmation-email', {
    body: {
      buyerEmail: purchase.buyer_email,
      buyerName: purchase.buyer_name,
      photoTitle: photo.title,
      amount: purchase.amount,
      downloadLink: photo.original_url,
    }
  });

  // Enviar email para fotógrafo
  await supabase.functions.invoke('send-sale-notification-email', {
    body: {
      photographerEmail: photographer.email,
      photographerName: photographer.name,
      photoTitle: photo.title,
      saleAmount: purchase.amount,
      photographerAmount: photographerShare,
    }
  });
}
```

---

## ✅ Checklist Final

- [ ] API Key do Resend configurada no Supabase
- [ ] Domínio `stafotos.com` verificado no Resend
- [ ] 6 Edge Functions deployed
- [ ] Teste manual de cada template realizado
- [ ] Logs verificados (sem erros)
- [ ] Integração com eventos do sistema
- [ ] Monitoramento configurado

---

## 📞 Suporte

**Documentação Resend:** https://resend.com/docs  
**Documentação Supabase:** https://supabase.com/docs/guides/functions  

---

**✨ Configuração completa! Seus emails estão prontos para serem enviados. 🚀**
