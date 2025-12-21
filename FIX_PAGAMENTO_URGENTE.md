# 🚨 FIX URGENTE: Deploy da Função de Pagamento

## ❌ Erro Atual
```
POST https://gtpqppvyjrnnuhlsbpqd.supabase.co/functions/v1/create-payment-preference 404
```

**Causa:** A Edge Function não está deployada no Supabase.

---

## ✅ SOLUÇÃO RÁPIDA (5 minutos)

### Passo 1: Acesse o Dashboard do Supabase
🔗 https://supabase.com/dashboard/project/gtpqppvyjrnnuhlsbpqd/functions

### Passo 2: Deploy via Dashboard

#### Opção A: Upload de Arquivos (Mais Fácil)
1. Clique em **"New Edge Function"**
2. Nome: `create-payment-preference`
3. Clique em **"Upload files"** ou **"Import from file"**
4. Selecione os arquivos:
   - `supabase/functions/create-payment-preference/index.ts`
   - `supabase/functions/create-payment-preference/validation.ts`
5. Clique **Deploy**

#### Opção B: Copiar e Colar
1. Clique em **"New Edge Function"**
2. Nome: `create-payment-preference`
3. Cole o código abaixo:

<details>
<summary>📄 Código Completo (Clique para expandir)</summary>

Abra os arquivos no VS Code e copie:
- `supabase/functions/create-payment-preference/index.ts`
- `supabase/functions/create-payment-preference/validation.ts`

Cole no editor do Supabase Dashboard.
</details>

---

## ⚙️ Passo 3: Configurar Secrets (OBRIGATÓRIO)

Vá em: **Settings → Edge Functions → Secrets**

Adicione:

```env
MERCADO_PAGO_ACCESS_TOKEN=seu_token_real_aqui
RESEND_API_KEY=seu_resend_key_aqui
```

⚠️ **IMPORTANTE:** Use tokens de **PRODUÇÃO**, não de teste!

---

## 🧪 Passo 4: Testar

Após deploy (aguarde 1-2 minutos):

1. Volte para sua aplicação
2. Tente fazer um pagamento novamente
3. Verifique se o erro 404 sumiu

### Verificar Logs (Opcional)
🔗 https://supabase.com/dashboard/project/gtpqppvyjrnnuhlsbpqd/logs/edge-functions

---

## 📋 Outras Funções que Precisam Deploy

Depois de corrigir o pagamento, faça deploy dessas também:

| Função | Prioridade | Descrição |
|--------|-----------|-----------|
| `mercadopago-webhook` | 🔴 ALTA | Processa notificações do MP |
| `send-purchase-confirmation-email` | 🔴 ALTA | Email de confirmação |
| `send-email-resend` | 🟡 MÉDIA | Sistema de email |
| `send-sale-notification-email` | 🟡 MÉDIA | Notifica vendas |
| `create-organization-user` | 🟢 BAIXA | Criar orgs (já funciona local) |

---

## 🆘 Problemas?

### "Não encontrei o botão New Edge Function"
- Verifique se está na aba **Edge Functions**
- URL: https://supabase.com/dashboard/project/gtpqppvyjrnnuhlsbpqd/functions

### "Erro ao fazer deploy"
- Verifique se copiou o código completo
- Verifique se não há erros de sintaxe
- Tente fazer deploy novamente

### "Ainda dá 404 após deploy"
- Aguarde 2-3 minutos para propagação
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique os logs da função

---

## 📞 Teste Rápido via cURL

Após deploy, teste diretamente:

\`\`\`bash
curl -X POST \
  https://gtpqppvyjrnnuhlsbpqd.supabase.co/functions/v1/create-payment-preference \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "photos": [{"id": "test", "price": 10}],
    "buyerInfo": {"name": "Teste", "email": "test@test.com", "document_number": "12345678900"},
    "campaignId": "test"
  }'
\`\`\`

Resposta esperada:
- ✅ 200: Funcionou!
- ❌ 404: Ainda não deployado
- ❌ 400: Falta configurar secrets

---

**Após fazer o deploy, me avise para eu verificar se está tudo OK!** ✅
