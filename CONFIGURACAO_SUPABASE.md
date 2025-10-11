# 🔧 Configuração Urgente do Supabase

## ⚠️ PROBLEMA 1: Email de confirmação não chega ou não redireciona corretamente

### Solução:
Você DEVE configurar as URLs no Supabase:

1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/gtpqppvyjrnnuhlsbpqd
2. Vá em **Authentication > URL Configuration**
3. Configure:

   **Site URL:**
   ```
   https://www.stafotos.com
   ```
   
   **Redirect URLs (adicione TODAS essas):**
   ```
   https://www.stafotos.com
   https://www.stafotos.com/
   https://www.stafotos.com/**
   https://4655e098-d521-432b-b04b-ccd6dfe631f7.lovableproject.com
   https://4655e098-d521-432b-b04b-ccd6dfe631f7.lovableproject.com/**
   ```

4. **IMPORTANTE**: Desabilite temporariamente a confirmação de email para testes:
   - Vá em **Authentication > Providers > Email**
   - Desmarque "Confirm email"
   - Clique em Save

5. **Configurar template de email** (opcional mas recomendado):
   - Vá em **Authentication > Email Templates**
   - Personalize o template de "Confirm signup"
   - Certifique-se que a URL de redirect está correta

## ✅ PROBLEMA 2: Upload de fotos

O sistema de upload em background JÁ está implementado e funcionando! 

### Funcionalidades:
- ✅ Upload em background (não cancela se sair da página)
- ✅ Múltiplos uploads simultâneos (até 3 de uma vez)
- ✅ Progresso visual no canto da tela
- ✅ Retry automático em caso de falha
- ✅ Continua mesmo se fechar o modal

### Como usar:
1. Fotógrafo clica em "Adicionar Fotos"
2. Seleciona múltiplas fotos
3. Clica em "Enviar em Background"
4. Pode fechar o modal e continuar navegando
5. O progresso aparece no canto inferior direito

## ✅ PROBLEMA 3: Solicitação para ser fotógrafo

Sistema implementado e funcionando:

### Para usuários:
1. Dashboard > Aba "Seja Fotógrafo"
2. Preenche formulário com:
   - Motivação (mínimo 50 caracteres)
   - Anos de experiência
   - Link de portfólio (opcional)
   - Equipamento (opcional)
3. Envia solicitação
4. Recebe notificação quando processada

### Para admins:
1. Dashboard Admin > Aba "Fotógrafos"
2. Vê todas as solicitações pendentes
3. Pode aprovar ou rejeitar com feedback
4. Ao aprovar, usuário vira fotógrafo automaticamente

## 🔍 Verificações de Segurança

Execute no Supabase SQL Editor:

```sql
-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar políticas da tabela photographer_applications
SELECT * FROM pg_policies WHERE tablename = 'photographer_applications';
```

## 📧 Teste de Email

Para testar se os emails estão funcionando:

```sql
-- No SQL Editor do Supabase
SELECT * FROM auth.users WHERE email = 'seu-email@teste.com';
```

Se o usuário aparecer com `email_confirmed_at` NULL, significa que o email não foi confirmado ainda.

## 🚀 Próximos Passos

1. Configure as URLs no Supabase (URGENTE!)
2. Teste criar uma nova conta
3. Verifique se recebe o email
4. Teste o upload de fotos
5. Teste a solicitação de fotógrafo

## 💡 Dicas

- Para desenvolvimento, desabilite "Confirm email" temporariamente
- Para produção, habilite novamente após configurar tudo
- Monitore os logs do Supabase em caso de problemas
- Use diferentes navegadores/sessões anônimas para testar

## 📞 Suporte

Se após configurar ainda houver problemas:
1. Verifique os logs de autenticação no Supabase
2. Verifique os logs de Edge Functions
3. Entre em contato com suporte técnico
