# 🔧 Aplicar Migration V2: Fix Payout Notification (ATUALIZADO)

## ⚠️ IMPORTANTE: Reaplicar Migration

Se você já aplicou a migration anterior, precisa **REAPLICAR** esta versão corrigida.

## Erros Corrigidos

### 1. Erro Original (22023) ✅
- **Código**: `22023`
- **Mensagem**: `unrecognized format() type specifier "."`
- **Causa**: Função `format()` do PostgreSQL interpretando caracteres especiais (`%`, `.`) dentro do campo `notes`
- **Solução**: Concatenação de strings em vez de `format()`

### 2. Erro Subsequente (23514) ✅ **[CORRIGIDO]**
- **Código**: `23514`
- **Mensagem**: `new row for relation "notifications" violates check constraint "notifications_type_check"`
- **Causa Real**: Função `notify_payout_status_change()` estava inserindo tipo `'payout'` que não existe no check constraint
- **Solução**: 
  - Usar tipos corretos: `'payout_approved'`, `'payout_rejected'`, `'payout_completed'`
  - CASE expression para selecionar tipo baseado no status

## Solução Implementada

1. ✅ Substituir `format()` por concatenação de strings (`||`) com `TO_CHAR()`
2. ✅ Escapar `%` no campo notes: `REPLACE(notes, '%', '%%')`
3. ✅ **CORREÇÃO CRÍTICA**: Usar tipos corretos de notificação baseados no status:
   - `'payout_approved'` quando status = 'approved'
   - `'payout_rejected'` quando status = 'rejected'
   - `'payout_completed'` quando status = 'completed'
4. ✅ CASE expression para selecionar tipo dinamicamente

---

## 📋 Passos para Aplicar

### 1. Acessar Supabase SQL Editor
1. Abra o projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor** no menu lateral
3. Clique em **New Query**

### 2. Executar Migration Corrigida
Copie e cole o conteúdo **COMPLETO** do arquivo:
```
supabase/migrations/20251202030000_fix_payout_notification_format.sql
```

**Ou copie diretamente daqui:**

<details>
<summary>Clique para ver o SQL completo (ATUALIZADO - VERSÃO 3)</summary>

```sql
-- Corrigir erro de format() no trigger de notificações de payout
-- O problema: format('texto %.2f %s', valor, texto_com_pontos) interpreta pontos no texto como especificadores
-- Solução: Escapar o texto do notes antes de passar para format()

CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
RETURNS TRIGGER AS $$
DECLARE
  photographer_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
  safe_notes TEXT;
BEGIN
  -- Buscar email do fotógrafo
  SELECT email INTO photographer_email
  FROM auth.users
  WHERE id = NEW.photographer_id;

  -- Escapar caracteres especiais no notes para evitar erro de format()
  -- Substituir % por %% para que format() não tente interpretar como especificador
  safe_notes := REPLACE(COALESCE(NEW.notes, ''), '%', '%%');

  -- Definir título e mensagem baseado no status
  IF NEW.status = 'approved' THEN
    notification_title := 'Repasse Aprovado! 🎉';
    -- Usar concatenação ao invés de format() para evitar problemas com caracteres especiais
    notification_message := 'Seu repasse de R$ ' || 
                           TO_CHAR(NEW.amount, 'FM999G999G990D00') || 
                           ' foi aprovado e será processado em breve.';
    IF safe_notes != '' THEN
      notification_message := notification_message || ' Observação: ' || safe_notes;
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Repasse Recusado';
    -- Usar concatenação ao invés de format() para evitar problemas com caracteres especiais
    notification_message := 'Seu repasse de R$ ' || 
                           TO_CHAR(NEW.amount, 'FM999G999G990D00') || 
                           ' foi recusado.';
    IF safe_notes != '' THEN
      notification_message := notification_message || ' Motivo: ' || safe_notes;
    ELSE
      notification_message := notification_message || ' Entre em contato para mais informações.';
    END IF;
  ELSIF NEW.status = 'completed' THEN
    notification_title := 'Repasse Concluído! ✅';
    notification_message := 'Seu repasse de R$ ' || 
                           TO_CHAR(NEW.amount, 'FM999G999G990D00') || 
                           ' foi concluído com sucesso!';
  ELSE
    RETURN NEW; -- Não notificar para outros status
  END IF;

  -- Inserir notificação com tipo correto baseado no status
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    created_at
  ) VALUES (
    NEW.photographer_id,
    notification_title,
    notification_message,
    CASE 
      WHEN NEW.status = 'approved' THEN 'payout_approved'
      WHEN NEW.status = 'rejected' THEN 'payout_rejected'
      WHEN NEW.status = 'completed' THEN 'payout_completed'
      ELSE 'payout_status_change'
    END,
    NOW()
  );

  -- Enviar email se disponível
  IF photographer_email IS NOT NULL THEN
    -- TODO: Integrar com sistema de email (Resend)
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger (caso já exista)
DROP TRIGGER IF EXISTS on_payout_status_change ON public.payout_requests;

CREATE TRIGGER on_payout_status_change
  AFTER UPDATE OF status
  ON public.payout_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_payout_status_change();

-- Comentário explicativo
-- Corrigir função notify_payout_status() que causa erro format() type specifier
-- Bug: format('%s', text) interpreta % dentro do text como especificadores
-- Solução: concatenar strings em vez de usar format() para evitar interpretação

CREATE OR REPLACE FUNCTION public.notify_payout_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer_name TEXT;
  v_message TEXT;
BEGIN
  -- Apenas notificar quando status mudar
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Buscar nome do fotógrafo
    SELECT full_name INTO v_photographer_name
    FROM profiles
    WHERE id = NEW.photographer_id;
    
    -- Construir mensagem de forma segura (sem usar format() para campos variáveis)
    IF NEW.status = 'approved' THEN
      -- Para aprovação, usar format apenas com amount (numérico seguro)
      v_message := format('Seu repasse de R$ %.2f foi aprovado e será processado em até 2 dias úteis.', NEW.amount);
    ELSE
      -- Para rejeição, concatenar strings em vez de usar format() para evitar interpretação de %
      v_message := 'Seu repasse de R$ ' || NEW.amount::TEXT || ' foi recusado.';
      IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_message := v_message || ' Motivo: ' || NEW.notes;
      ELSE
        v_message := v_message || ' Entre em contato para mais informações.';
      END IF;
    END IF;
    
    -- Criar notificação
    BEGIN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        link,
        metadata
      ) VALUES (
        NEW.photographer_id,
        CASE 
          WHEN NEW.status = 'approved' THEN 'payout_approved'::text
          ELSE 'payout_rejected'::text
        END,
        CASE 
          WHEN NEW.status = 'approved' THEN 'Repasse Aprovado! 💰'
          ELSE 'Repasse Recusado'
        END,
        v_message,
        '/dashboard/financial',
        jsonb_build_object(
          'payout_request_id', NEW.id,
          'amount', NEW.amount,
          'status', NEW.status,
          'processed_at', NEW.processed_at
        )
      );
      
      -- Log para debug
      RAISE NOTICE 'Notificação de repasse % criada para fotógrafo %', NEW.status, v_photographer_name;
    EXCEPTION
      WHEN check_violation THEN
        RAISE WARNING 'Erro ao criar notificação: tipo inválido. Status: %, Tipo tentado: %', 
          NEW.status, 
          CASE WHEN NEW.status = 'approved' THEN 'payout_approved' ELSE 'payout_rejected' END;
        -- Não lançar erro para não bloquear o update do payout_request
      WHEN OTHERS THEN
        RAISE WARNING 'Erro inesperado ao criar notificação: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Comentário explicativo para futuras referências
COMMENT ON FUNCTION public.notify_payout_status() IS 
'Trigger function que cria notificações quando status de payout_requests muda.
IMPORTANTE: Não usar format() com campos de texto variáveis (como notes) pois 
caracteres especiais como % e . podem causar erro 22023 "unrecognized format() type specifier".
Usar concatenação de strings para campos de texto do usuário.';
```
</details>

### 3. Clicar em RUN
Pressione **Run** ou `Ctrl+Enter`

### 4. Verificar Aplicação
Execute para confirmar que a função foi atualizada:

```sql
-- Ver função completa
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'notify_payout_status';

-- Verificar tipos permitidos em notifications
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'notifications_type_check';
```

### 5. Testar
1. Vá no painel admin de repasses
2. Aprove ou rejeite um repasse com notes contendo pontos, vírgulas, ou caracteres especiais
   - Exemplo: "Nome não condizente com o titular da conta"
3. ✅ Não deve mais aparecer erro 400
4. ✅ O status deve ser atualizado corretamente
5. ✅ Verifique que a notificação foi criada na tabela notifications

---

## ✅ Resultado Esperado

Após aplicar a migration:

- ✅ Update de `payout_requests` funciona sem erros 400
- ✅ Notificações são criadas corretamente
- ✅ Campo `notes` aceita qualquer caractere (`.`, `%`, etc)
- ✅ Mensagens formatadas corretamente para usuários
- ✅ Tipos de notificação com cast explícito `::text`
- ✅ Exception handling previne bloqueio se notificação falhar
- ✅ Warnings no log do Supabase para debug (não bloqueiam operação)

---

## 🐛 Se Ainda Houver Erro

Se após aplicar a migration o erro persistir:

1. **Verifique se aplicou a versão correta:**
   ```sql
   SELECT routine_name, specific_name, created 
   FROM information_schema.routines 
   WHERE routine_name = 'notify_payout_status';
   ```

2. **Verifique os logs do Supabase:**
   - Vá em **Logs** > **Postgres Logs**
   - Procure por mensagens `NOTICE` ou `WARNING` relacionadas a `notify_payout_status`

3. **Teste diretamente no SQL Editor:**
   ```sql
   UPDATE payout_requests 
   SET status = 'rejected', 
       notes = 'Teste com ponto. E percentual 50%',
       processed_at = now()
   WHERE id = 'SEU_PAYOUT_ID_AQUI';
   ```

4. Se encontrar outro erro, me envie o log completo.
