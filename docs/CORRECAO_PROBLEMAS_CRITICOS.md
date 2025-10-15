# 🚨 Correção de Problemas Críticos - STA Fotos

## ✅ Status das Correções

### 1️⃣ Reset de Senha e Emails (CRÍTICO) - ⚠️ AÇÃO MANUAL NECESSÁRIA

**Problema:** Reset de senha não funciona + emails usando domínio errado

**Solução:** Configurar URLs no Supabase Dashboard

#### Passos para Corrigir:

1. **Acesse o Supabase Dashboard:**
   - Vá em: https://supabase.com/dashboard/project/gtpqppvyjrnnuhlsbpqd
   
2. **Navegue até Authentication > URL Configuration:**
   - Clique em **Authentication** no menu lateral
   - Clique em **URL Configuration**

3. **Configure o Site URL:**
   ```
   Site URL: https://www.stafotos.com
   ```

4. **Configure os Redirect URLs (adicione TODAS essas URLs):**
   ```
   https://www.stafotos.com/**
   https://www.stafotos.com/auth
   https://www.stafotos.com/auth/callback
   https://www.stafotos.com/reset-password
   http://localhost:8080/**
   http://localhost:5173/**
   ```

5. **Salve as configurações**

6. **Teste o reset de senha:**
   - Acesse https://www.stafotos.com/auth
   - Clique em "Esqueci minha senha"
   - Digite um email cadastrado
   - Verifique se o email chega corretamente

---

### 2️⃣ Fotógrafos Podem Criar Eventos - ✅ CORRIGIDO

**Problema:** Fotógrafos não conseguiam criar eventos

**Solução:** Migration SQL aplicada com sucesso

**O que foi corrigido:**
- ✅ Política RLS para fotógrafos criarem campanhas
- ✅ Trigger automático para auto-atribuição em campanhas
- ✅ Políticas para criar álbuns (sub_events)
- ✅ Políticas para fazer upload de fotos

**Teste:**
1. Faça login como fotógrafo
2. Acesse o dashboard
3. Clique em "Criar Evento"
4. Preencha os dados e crie o evento
5. ✅ Deve funcionar sem erros

---

### 3️⃣ Emails com Dark Theme - ✅ CORRIGIDO

**Problema:** Emails estavam sem dark theme

**Solução:** Todos os templates atualizados

**Emails corrigidos:**
- ✅ `send-password-reset-email` - Dark theme aplicado
- ✅ `send-purchase-confirmation-email` - Dark theme aplicado
- ✅ `send-sale-notification-email` - Dark theme aplicado
- ✅ `send-welcome-email` - Já tinha dark theme

**Ainda precisam ser atualizados:**
- ⏳ `send-payout-approved-email`
- ⏳ `send-new-campaign-email`
- ⏳ `send-application-notification`
- ⏳ `send-photographer-notification`

---

### 4️⃣ Receita de Fotógrafos - ✅ CORRIGIDO

**Problema:** Fotógrafos recebendo 100% das vendas sem descontos

**Solução:** Sistema de revenue shares corrigido

**O que foi implementado:**
- ✅ Cálculo automático de porcentagens (plataforma 7%, fotógrafo 93% ou menos se houver organização)
- ✅ Trigger que cria revenue_shares automaticamente em cada venda
- ✅ Dashboard mostrando valor correto descontado
- ✅ Saldo disponível calculado corretamente (vendas > 12h - repasses pendentes)

**Como funciona agora:**
```
Venda de R$ 10,00:
- Plataforma: R$ 0,70 (7%)
- Fotógrafo: R$ 9,30 (93%)

Se houver organização (ex: 20%):
- Plataforma: R$ 0,70 (7%)
- Organização: R$ 2,00 (20%)
- Fotógrafo: R$ 7,30 (73%)
```

---

## 📋 Checklist Final

### Agora (próximos 5 minutos):
- [ ] ✅ Configurar Redirect URLs no Supabase Dashboard → [Problema #1]
- [ ] ✅ Testar reset de senha
- [ ] ✅ Testar fotógrafo criar evento

### Hoje (próximas 2 horas):
- [ ] ✅ Atualizar emails restantes com dark theme
- [ ] ✅ Testar fluxo completo de compra e verificar valores
- [ ] ✅ Verificar dashboard de fotógrafo com vendas reais

### Esta Semana:
- [ ] ✅ Adicionar validações de formulário
- [ ] ✅ Adicionar loading states
- [ ] ✅ Testar sistema de colaboradores

---

## 🎯 Validação

Após configurar o Supabase Dashboard:

### Reset de Senha:
```bash
1. Ir em /auth
2. Clicar "Esqueci minha senha"
3. Digitar email cadastrado
4. ✅ Email deve chegar com link correto do domínio stafotos.com
5. ✅ Clicar no link deve redirecionar para /reset-password
6. ✅ Nova senha deve funcionar no login
```

### Fotógrafo Criar Evento:
```bash
1. Login como fotógrafo
2. Dashboard → Criar Evento
3. ✅ Formulário deve abrir
4. ✅ Evento deve ser criado sem erros
5. ✅ Deve aparecer na lista de eventos
```

### Receita Fotógrafo:
```bash
1. Simular venda de R$ 10,00
2. ✅ Revenue share deve criar 3 registros:
   - Plataforma: R$ 0,70
   - Fotógrafo: R$ 9,30
   - Organização: R$ 0,00 (se não houver)
3. ✅ Dashboard deve mostrar R$ 9,30 disponível (após 12h)
4. ✅ Solicitar repasse deve validar contra R$ 9,30
```

---

## 📞 Suporte

Se alguma correção não funcionou:

1. **Reset de senha não funciona:**
   - Verifique se as URLs estão corretas no Supabase
   - Verifique spam/lixo eletrônico
   - Confira os logs da edge function: `send-password-reset-email`

2. **Fotógrafo não cria evento:**
   - Verifique se o usuário tem role 'photographer'
   - Confira os logs do console do navegador
   - Veja os logs do PostgreSQL

3. **Receita errada:**
   - Verifique a tabela `revenue_shares`
   - Confira as porcentagens na tabela `campaigns`
   - Veja se o trigger `trg_calculate_revenue_shares` está ativo

---

## 🎉 Conclusão

**Problemas Críticos Resolvidos:**
- ✅ Sistema de receita corrigido (plataforma + organização + fotógrafo)
- ✅ Fotógrafos podem criar eventos
- ✅ Emails com dark theme (4 de 8 templates atualizados)
- ⚠️ Reset de senha: **REQUER CONFIGURAÇÃO MANUAL** (5 minutos)

**Próximos Passos:**
1. Configurar URLs no Supabase Dashboard
2. Testar reset de senha
3. Atualizar os 4 emails restantes com dark theme
4. Validar fluxo completo de vendas

✨ **Após configurar as URLs do Supabase, todos os problemas críticos estarão resolvidos!**
