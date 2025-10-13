# 📧 Sistema de Emails - StaFotos
## 🚀 Configuração em 5 Passos (15 minutos)

---

## ⚡ Setup Rápido

```bash
# 1. Pegar API Key do Resend
https://resend.com/login → Settings → API Keys

# 2. Adicionar no Supabase
Supabase Dashboard → Settings → Edge Functions → Manage secrets
Nome: RESEND_API_KEY
Valor: re_sua_api_key_aqui

# 3. Deploy (execute no terminal)
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase functions deploy send-welcome-email
npx supabase functions deploy send-password-reset-email
npx supabase functions deploy send-sale-notification-email
npx supabase functions deploy send-purchase-confirmation-email
npx supabase functions deploy send-payout-approved-email
npx supabase functions deploy send-new-campaign-email

# 4. Testar
Supabase Dashboard → Functions → send-welcome-email → Invoke
JSON: { "email": "seu@email.com", "fullName": "Seu Nome" }

# 5. ✅ Pronto! Verifique sua caixa de entrada
```

---

## 📁 Estrutura do Projeto

```
supabase/functions/
├── _shared/
│   └── resend.ts                           🔧 Helper compartilhado
├── send-welcome-email/                     🎉 Boas-vindas
│   └── index.ts
├── send-password-reset-email/              🔐 Reset senha
│   └── index.ts
├── send-sale-notification-email/           💰 Venda (fotógrafo)
│   └── index.ts
├── send-purchase-confirmation-email/       ✅ Compra (cliente)
│   └── index.ts
├── send-payout-approved-email/             💸 Repasse aprovado
│   └── index.ts
└── send-new-campaign-email/                🎨 Novo evento (admin)
    └── index.ts
```

---

## 📚 Documentação

| Arquivo | Descrição | Quando usar |
|---------|-----------|-------------|
| **EMAIL_CHECKLIST.md** | ✅ Checklist passo a passo | Seguir na ordem |
| **RESEND_QUICK_SETUP.md** | ⚡ Setup em 5 minutos | Configuração rápida |
| **RESEND_SETUP_GUIDE.md** | 📖 Documentação completa | Referência detalhada |
| **EMAIL_SYSTEM_SUMMARY.md** | 📊 Visão geral do sistema | Entender arquitetura |
| **EMAIL_INTEGRATION_EXAMPLES.ts** | 💻 Exemplos de código | Integrar no frontend |

---

## 🎯 Templates Disponíveis

| # | Template | Gatilho | Destinatário |
|---|----------|---------|--------------|
| 1 | 🎉 Boas-vindas | Novo registro | Usuário |
| 2 | 🔐 Reset senha | Esqueceu senha | Usuário |
| 3 | 💰 Venda | Foto vendida | Fotógrafo |
| 4 | ✅ Compra | Compra confirmada | Cliente |
| 5 | 💸 Repasse | Repasse aprovado | Fotógrafo |
| 6 | 🎨 Novo evento | Evento criado | Admin |

---

## 💻 Exemplo de Uso

```typescript
import { supabase } from '@/integrations/supabase/client';

// Enviar email de boas-vindas
await supabase.functions.invoke('send-welcome-email', {
  body: {
    email: 'usuario@exemplo.com',
    fullName: 'João Silva'
  }
});

// Enviar email de venda
await supabase.functions.invoke('send-sale-notification-email', {
  body: {
    photographerEmail: 'fotografo@exemplo.com',
    photographerName: 'Maria Fotógrafa',
    photoTitle: 'Gol do campeonato',
    campaignTitle: 'Campeonato 2025',
    saleAmount: 50,
    photographerAmount: 46.50,
    buyerName: 'João'
  }
});
```

Mais exemplos em: **EMAIL_INTEGRATION_EXAMPLES.ts**

---

## 🎨 Design

✅ Responsivo (mobile-first)  
✅ HTML inline CSS  
✅ Cores da marca (Roxo + Violeta)  
✅ Logo StaFotos  
✅ Botões de ação  
✅ Footer profissional  

---

## 📊 Monitoramento

**Logs no Supabase:**
```bash
npx supabase functions logs send-welcome-email --follow
```

**Dashboard Resend:**
- Taxa de entrega
- Taxa de abertura
- Taxa de cliques
- Bounces

---

## ✅ Status Atual

- [x] ✅ Estrutura criada (6 functions + helper)
- [x] ✅ Templates HTML prontos
- [x] ✅ Documentação completa
- [ ] ⏳ API Key configurada (VOCÊ PRECISA FAZER)
- [ ] ⏳ Functions deployadas (VOCÊ PRECISA FAZER)
- [ ] ⏳ Testado (VOCÊ PRECISA FAZER)

---

## 🚀 Próximos Passos

1. **Siga o EMAIL_CHECKLIST.md** (passo a passo visual)
2. **Configure a API Key** (5 min)
3. **Deploy as functions** (5 min)
4. **Teste** (5 min)
5. **Integre no código** (30-60 min)

---

## 🆘 Ajuda

❌ Problemas? Consulte: **RESEND_SETUP_GUIDE.md** → Troubleshooting  
💡 Dúvidas de integração? Veja: **EMAIL_INTEGRATION_EXAMPLES.ts**  
📋 Perdido? Siga: **EMAIL_CHECKLIST.md**  

---

## 📞 Links Úteis

- **Resend Dashboard:** https://resend.com/emails
- **Resend Docs:** https://resend.com/docs
- **Supabase Functions:** https://supabase.com/docs/guides/functions

---

**✨ Sistema completo de emails profissionais em 15 minutos!** 🚀

**Domínio:** `noreply@stafotos.com`  
**Status:** 95% pronto (falta só você configurar a API Key!)
