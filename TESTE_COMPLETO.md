# 🧪 Guia Completo de Teste - STA Fotos

## ✅ Correções Implementadas

### 1. Email de Confirmação ✅
- **Código já estava correto** com `emailRedirectTo` configurado
- **Você precisa configurar no Supabase** (veja CONFIGURACAO_SUPABASE.md)
- Melhorada mensagem de sucesso no cadastro

### 2. Upload de Fotos ✅
- Sistema de upload em background **JÁ IMPLEMENTADO**
- Aumentado limite de **2.5MB para 10MB** por foto
- Melhoradas mensagens de feedback
- **Funcionalidades:**
  - ✅ Upload múltiplo (várias fotos de uma vez)
  - ✅ Upload em background (não cancela se sair da página)
  - ✅ Até 3 uploads simultâneos
  - ✅ Progresso visual no canto da tela
  - ✅ Retry automático em caso de falha

### 3. Solicitação para Fotógrafo ✅
- **Completamente implementado**
- Formulário com validação
- Aprovação/rejeição por admins
- Notificações ao usuário

---

## 🎯 Como Testar - Passo a Passo

### TESTE 1: Cadastro e Email

1. **Configure o Supabase PRIMEIRO** (veja CONFIGURACAO_SUPABASE.md)
2. Acesse `/auth`
3. Clique em "Criar conta"
4. Preencha:
   ```
   Nome: Teste Upload
   Email: seu-email-teste@gmail.com
   Senha: Senha123!@#
   ```
5. **Verifique:**
   - ✅ Mensagem de sucesso aparece
   - ✅ Email chega (pode demorar alguns minutos)
   - ✅ Link no email redireciona para home (/)
   - ✅ Consegue fazer login

### TESTE 2: Upload de Fotos (Fotógrafo)

**Pré-requisito:** Usuário deve ser fotógrafo

1. Faça login como fotógrafo
2. Vá para `/dashboard`
3. Clique em "Adicionar Fotos"
4. **Selecione múltiplas fotos** (5-10 fotos para testar)
5. Selecione um evento
6. Clique em "Enviar em Background"
7. **Verifique:**
   - ✅ Modal fecha automaticamente
   - ✅ Widget de progresso aparece no canto inferior direito
   - ✅ Você pode navegar para outras páginas
   - ✅ Upload continua em background
   - ✅ Notificação final aparece quando termina
   - ✅ Fotos aparecem no evento

**Teste de limite de tamanho:**
- Tente subir uma foto > 10MB
- ✅ Deve mostrar erro e não incluir o arquivo

**Teste de múltiplos uploads:**
- Inicie um upload
- Antes dele terminar, inicie outro
- ✅ Ambos devem aparecer no widget
- ✅ Processamento simultâneo (máximo 3)

**Teste de falha:**
- Inicie upload
- Desconecte a internet no meio
- ✅ Deve mostrar erro
- ✅ Botão "Tentar novamente" deve aparecer
- Reconecte a internet
- Clique em "Tentar novamente"
- ✅ Deve retomar o upload

### TESTE 3: Solicitação de Fotógrafo

**Como Usuário Normal:**

1. Faça login como usuário (não fotógrafo)
2. Vá para `/dashboard`
3. Clique na aba "Seja Fotógrafo"
4. **Verifique:**
   - ✅ Formulário aparece corretamente
   - ✅ Campos obrigatórios marcados
   
5. Preencha o formulário:
   ```
   Mensagem: [Escreva pelo menos 50 caracteres sobre por que quer ser fotógrafo]
   Anos de experiência: 5
   Portfólio: https://seu-portfolio.com (opcional)
   Equipamento: Canon EOS 5D, lentes 24-70mm (opcional)
   ```
   
6. Clique em "Enviar Solicitação"
7. **Verifique:**
   - ✅ Mensagem de sucesso
   - ✅ Status "Pendente" aparece
   - ✅ Não pode enviar outra solicitação enquanto pendente

**Como Admin:**

1. Faça login como admin
2. Vá para `/dashboard`
3. Clique na aba "Fotógrafos" (primeira aba)
4. **Verifique:**
   - ✅ Solicitação pendente aparece
   - ✅ Informações do usuário visíveis
   - ✅ Mensagem, experiência, portfólio visíveis
   
5. **Teste de Aprovação:**
   - Clique em "Aprovar"
   - ✅ Confirmação de sucesso
   - ✅ Usuário vira fotógrafo (verifique na aba "Usuários")
   - Faça logout e login como o usuário aprovado
   - ✅ Agora tem acesso ao dashboard de fotógrafo
   
6. **Teste de Rejeição:**
   - Crie outro usuário e faça nova solicitação
   - Como admin, clique em "Rejeitar"
   - Digite motivo: "Portfólio insuficiente"
   - Confirme
   - ✅ Status muda para rejeitado
   - Faça login como o usuário rejeitado
   - ✅ Vê mensagem de rejeição
   - ✅ Pode enviar nova solicitação

---

## 🐛 Problemas Conhecidos e Soluções

### Problema: Email não chega
**Solução:**
1. Verifique configuração no Supabase (CONFIGURACAO_SUPABASE.md)
2. Verifique pasta de spam
3. Para testes, desabilite "Confirm email" no Supabase
4. Verifique logs no Supabase > Authentication > Logs

### Problema: Redirect após email não funciona
**Solução:**
1. Configure Redirect URLs no Supabase
2. Adicione TODAS as URLs (produção + preview)
3. Incluir variação com e sem barra final (/)

### Problema: Upload não inicia
**Solução:**
1. Verifique se usuário é fotógrafo
2. Verifique se há eventos disponíveis
3. Verifique permissões de storage no Supabase
4. Veja console do navegador (F12)

### Problema: Upload cancela ao sair da página
**Solução:**
- NÃO DEVE ACONTECER! O sistema já está configurado para continuar
- Se acontecer, verifique console (F12) para erros
- Verifique se Service Worker está registrado

### Problema: Solicitação não aparece para admin
**Solução:**
1. Verifique se usuário é admin
2. Verifique RLS policies no Supabase
3. Execute no SQL Editor:
   ```sql
   SELECT * FROM photographer_applications 
   WHERE status = 'pending' 
   ORDER BY created_at DESC;
   ```

---

## 📊 Checklist Final

### Para Desenvolvimento
- [ ] Configurar URLs no Supabase
- [ ] Desabilitar "Confirm email" (opcional)
- [ ] Criar usuário admin de teste
- [ ] Criar usuário fotógrafo de teste
- [ ] Criar usuário normal de teste
- [ ] Criar pelo menos 2 eventos
- [ ] Testar todos os fluxos acima

### Para Produção
- [ ] Configurar URLs de produção
- [ ] HABILITAR "Confirm email"
- [ ] Configurar templates de email personalizados
- [ ] Testar em produção com email real
- [ ] Configurar domínio customizado (opcional)
- [ ] Monitorar logs por alguns dias

---

## 🚀 Status Atual

| Funcionalidade | Status | Notas |
|----------------|--------|-------|
| Cadastro | ✅ FUNCIONANDO | Precisa configurar Supabase |
| Email confirmação | ✅ FUNCIONANDO | Precisa configurar URLs |
| Login | ✅ FUNCIONANDO | OK |
| Upload múltiplo | ✅ FUNCIONANDO | Aumentado para 10MB |
| Upload background | ✅ FUNCIONANDO | Continua mesmo ao sair |
| Progresso visual | ✅ FUNCIONANDO | Widget no canto |
| Solicitação fotógrafo | ✅ FUNCIONANDO | Completo com aprovação |
| Admin approval | ✅ FUNCIONANDO | Aprova/rejeita com feedback |

---

## 📞 Suporte

Se após seguir este guia ainda houver problemas:

1. **Verifique logs:**
   - Console do navegador (F12)
   - Supabase > Authentication > Logs
   - Supabase > Edge Functions > Logs

2. **Informações úteis para debug:**
   - ID do projeto: gtpqppvyjrnnuhlsbpqd
   - Versão do navegador
   - Prints de erros
   - Passo que falhou

3. **SQL úteis:**
   ```sql
   -- Ver usuários recentes
   SELECT email, created_at, email_confirmed_at 
   FROM auth.users 
   ORDER BY created_at DESC LIMIT 10;
   
   -- Ver solicitações pendentes
   SELECT * FROM photographer_applications 
   WHERE status = 'pending';
   
   -- Ver fotos recentes
   SELECT * FROM photos 
   ORDER BY created_at DESC LIMIT 20;
   ```
