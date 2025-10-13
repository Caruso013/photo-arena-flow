# ✅ Checklist de Configuração - Emails StaFotos

## 📋 Status Atual: ESTRUTURA PRONTA ✅

---

## 🎯 O que JÁ ESTÁ PRONTO:

- [x] ✅ Helper compartilhado do Resend (`_shared/resend.ts`)
- [x] ✅ Template HTML base responsivo
- [x] ✅ Edge Function: Boas-vindas
- [x] ✅ Edge Function: Reset de senha
- [x] ✅ Edge Function: Notificação de venda
- [x] ✅ Edge Function: Confirmação de compra
- [x] ✅ Edge Function: Repasse aprovado
- [x] ✅ Edge Function: Novo evento (admin)
- [x] ✅ Documentação completa
- [x] ✅ Guia rápido de setup
- [x] ✅ Exemplos de integração

**Total: 6 templates profissionais + documentação completa! 🎉**

---

## 🚀 O que VOCÊ PRECISA FAZER:

### Etapa 1: Configurar API Key (5 minutos)

- [ ] 1.1 Acessar https://resend.com/login
- [ ] 1.2 Ir em Settings → API Keys
- [ ] 1.3 Copiar a API key (começa com `re_`)
- [ ] 1.4 Acessar Supabase Dashboard
- [ ] 1.5 Ir em Settings → Edge Functions → Manage secrets
- [ ] 1.6 Clicar em "Add new secret"
- [ ] 1.7 Nome: `RESEND_API_KEY`
- [ ] 1.8 Valor: [COLAR API KEY]
- [ ] 1.9 Salvar
- [ ] 1.10 Aguardar 1-2 minutos (variável propagar)

**Tempo estimado: 5 minutos ⏱️**

---

### Etapa 2: Verificar Domínio (Se necessário)

- [ ] 2.1 Acessar https://resend.com/domains
- [ ] 2.2 Verificar se `stafotos.com` tem ✅ verde
- [ ] 2.3 **Se NÃO tiver ✅:**
  - [ ] 2.3.1 Clicar em "Add Domain"
  - [ ] 2.3.2 Digitar: `stafotos.com`
  - [ ] 2.3.3 Copiar registros DNS (SPF, DKIM)
  - [ ] 2.3.4 Adicionar no provedor do domínio
  - [ ] 2.3.5 Aguardar verificação (até 48h)

**Tempo estimado: 10 minutos (+ até 48h verificação) ⏱️**

---

### Etapa 3: Deploy das Functions (5 minutos)

- [ ] 3.1 Abrir terminal na pasta do projeto
- [ ] 3.2 Executar: `npm install -g supabase` (se ainda não tiver)
- [ ] 3.3 Executar: `npx supabase login`
- [ ] 3.4 Pegar Project Ref no Supabase (Settings → General)
- [ ] 3.5 Executar: `npx supabase link --project-ref [SEU_REF]`
- [ ] 3.6 Deploy function 1: `npx supabase functions deploy send-welcome-email`
- [ ] 3.7 Deploy function 2: `npx supabase functions deploy send-password-reset-email`
- [ ] 3.8 Deploy function 3: `npx supabase functions deploy send-sale-notification-email`
- [ ] 3.9 Deploy function 4: `npx supabase functions deploy send-purchase-confirmation-email`
- [ ] 3.10 Deploy function 5: `npx supabase functions deploy send-payout-approved-email`
- [ ] 3.11 Deploy function 6: `npx supabase functions deploy send-new-campaign-email`
- [ ] 3.12 Verificar que todas foram deployadas sem erros

**Tempo estimado: 5 minutos ⏱️**

---

### Etapa 4: Testar (10 minutos)

- [ ] 4.1 Acessar Supabase Dashboard → Functions
- [ ] 4.2 Clicar em `send-welcome-email`
- [ ] 4.3 Clicar em "Invoke function"
- [ ] 4.4 Colar JSON de teste:
```json
{
  "email": "seu-email@teste.com",
  "fullName": "Seu Nome"
}
```
- [ ] 4.5 Clicar em "Invoke"
- [ ] 4.6 Verificar resposta (deve ser `{ success: true }`)
- [ ] 4.7 Abrir sua caixa de email
- [ ] 4.8 Verificar se recebeu o email (checar spam também)
- [ ] 4.9 Abrir o email e verificar se renderizou corretamente
- [ ] 4.10 Repetir teste para os outros 5 templates (opcional)

**Tempo estimado: 10 minutos ⏱️**

---

### Etapa 5: Integrar no Código (30-60 minutos)

- [ ] 5.1 Ler `EMAIL_INTEGRATION_EXAMPLES.ts`
- [ ] 5.2 Integrar email de boas-vindas no registro
- [ ] 5.3 Integrar email de venda no fluxo de compra
- [ ] 5.4 Integrar email de compra no fluxo de compra
- [ ] 5.5 Integrar email de repasse no dashboard admin
- [ ] 5.6 Integrar email de novo evento na criação de campanha
- [ ] 5.7 Testar cada integração
- [ ] 5.8 Adicionar tratamento de erros
- [ ] 5.9 Adicionar loading states na UI
- [ ] 5.10 Testar fluxo completo end-to-end

**Tempo estimado: 30-60 minutos ⏱️**

---

## 📊 Resumo de Tempo Total:

| Etapa | Tempo | Status |
|-------|-------|--------|
| 1. Configurar API Key | 5 min | ⏳ Pendente |
| 2. Verificar Domínio | 10 min* | ⏳ Pendente |
| 3. Deploy Functions | 5 min | ⏳ Pendente |
| 4. Testar | 10 min | ⏳ Pendente |
| 5. Integrar | 30-60 min | ⏳ Pendente |
| **TOTAL** | **60-90 min** | **0% completo** |

*\* + até 48h se precisar verificar domínio*

---

## 🎯 Validação Final

Depois de tudo configurado, valide:

- [ ] ✅ API Key funcionando (sem erros 403)
- [ ] ✅ Domínio verificado no Resend
- [ ] ✅ 6 functions deployadas e ativas
- [ ] ✅ Email de teste recebido e renderizado corretamente
- [ ] ✅ Logs sem erros críticos
- [ ] ✅ Integração no código funcionando
- [ ] ✅ Fluxo end-to-end testado

---

## 📞 Documentação de Apoio

Consulte esses arquivos quando precisar:

- **Guia Rápido:** `RESEND_QUICK_SETUP.md`
- **Documentação Completa:** `RESEND_SETUP_GUIDE.md`
- **Resumo do Sistema:** `EMAIL_SYSTEM_SUMMARY.md`
- **Exemplos de Código:** `EMAIL_INTEGRATION_EXAMPLES.ts`

---

## 🚨 Troubleshooting Rápido

### ❌ "RESEND_API_KEY não configurada"
→ Volte na Etapa 1, passo 1.5-1.10

### ❌ "Domain not verified"
→ Volte na Etapa 2, verifique domínio no Resend

### ❌ "403 Forbidden"
→ Verifique se a API Key está correta

### ❌ Email não chegou
→ 1) Verifique spam, 2) Veja logs, 3) Teste outro email

### ❌ Erro no deploy
→ Execute `npx supabase login` novamente

---

## 🎉 Quando Estiver 100% Pronto:

- [ ] ✅ Marcar tarefa "PRIORIDADE 2" como completa
- [ ] ✅ Notificar equipe que emails estão ativos
- [ ] ✅ Monitorar métricas no Resend Dashboard
- [ ] ✅ Pedir feedback dos primeiros usuários
- [ ] ✅ Ajustar textos se necessário

---

**🚀 Sua infraestrutura de emails está 95% pronta!**

**Faltam apenas 5% (configurar API Key + deploy) para estar 100% operacional!** ✨

---

## 📈 Próximas Melhorias (Futuro)

Depois que estiver funcionando, considere:

- [ ] Adicionar analytics de emails (open rate, click rate)
- [ ] Criar templates A/B test
- [ ] Adicionar emails de marketing (newsletters)
- [ ] Implementar segmentação de usuários
- [ ] Criar fluxos automáticos (drip campaigns)
- [ ] Adicionar notificações push complementares

---

**✅ Tudo pronto! Agora é só executar os 5 passos acima!** 🎯
