# 🔧 CORREÇÃO: Erro 22023 no Trigger de Notificações de Payout

## ❌ Problema Identificado

O erro `unrecognized format() type specifier "."` (código 22023) está sendo causado pela função `notify_payout_status_change()` no banco de dados.

**Causa raiz:** A função usa `format('texto %.2f %s', valor, notes)` e quando o campo `notes` contém caracteres especiais como pontos (`.`), o PostgreSQL tenta interpretá-los como especificadores de formato, causando erro.

**Exemplo que falha:**
```sql
format('Seu repasse de R$ %.2f foi recusado. %s', 20.00, 'Nome não condizente com o titular da conta')
-- Erro: o ponto depois de "recusado" + o texto seguinte confunde o parser
```

## ✅ Solução Implementada

A migration `20251202000000_fix_payout_notification_format.sql` corrige o problema:

1. **Substitui `format()` por concatenação de strings (`||`)** - mais seguro
2. **Escapa `%` no campo `notes`** - `REPLACE(notes, '%', '%%')`
3. **Usa `TO_CHAR()` para formatar valores monetários** - mais preciso que %.2f

## 📋 Como Aplicar a Correção

### Passo 1: Abrir Supabase SQL Editor
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto **photo-arena-flow**
3. Vá em **SQL Editor** no menu lateral

### Passo 2: Executar a Migration
1. Copie todo o conteúdo do arquivo `supabase/migrations/20251202000000_fix_payout_notification_format.sql`
2. Cole no SQL Editor
3. Clique em **Run** (ou pressione `Ctrl+Enter`)

### Passo 3: Verificar Sucesso
Se tudo correr bem, você verá:
```
Success. No rows returned
    ELSE
      -- Concatenar strings em vez de format() para evitar interpretação de %
      v_message := 'Seu repasse de R$ ' || NEW.amount::TEXT || ' foi recusado.';
      IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_message := v_message || ' Motivo: ' || NEW.notes;
      ELSE
        v_message := v_message || ' Entre em contato para mais informações.';
      END IF;
    END IF;
    
    -- Criar notificação
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
        WHEN NEW.status = 'approved' THEN 'payout_approved'
        ELSE 'payout_rejected'
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
    
    RAISE NOTICE 'Notificação de repasse % criada para fotógrafo %', NEW.status, v_photographer_name;
  END IF;
  
  RETURN NEW;
END;
$$;
```

### 3. Clique em **Run** ou pressione `Ctrl + Enter`

### 4. Verifique o Resultado
Você deve ver:
```
Success. No rows returned
```

### 5. Teste a Correção
1. Volte para o dashboard de admin
2. Tente **rejeitar** um repasse com notes
3. Deve funcionar sem erros 400! ✅

## 🔍 O Que Foi Corrigido

### ❌ Antes (Bugado)
```sql
format('Seu repasse de R$ %.2f foi recusado. %s', 
  NEW.amount,
  COALESCE('Motivo: ' || NEW.notes, 'Entre em contato')
)
```
**Problema**: Se `notes` contém `%` ou `.`, PostgreSQL interpreta como especificador de formato.

### ✅ Depois (Corrigido)
```sql
v_message := 'Seu repasse de R$ ' || NEW.amount::TEXT || ' foi recusado.';
IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
  v_message := v_message || ' Motivo: ' || NEW.notes;
END IF;
```
**Solução**: Concatenação de strings (`||`) não interpreta caracteres especiais.

## 📝 Notas Técnicas

- **Trigger**: `trigger_notify_payout_status` (executa AFTER UPDATE em `payout_requests`)
- **Função**: `public.notify_payout_status()`
- **Tabelas Afetadas**: `payout_requests`, `notifications`
- **Erro Corrigido**: PostgreSQL Error Code `22023`

## ✅ Após Aplicar

Remova os logs de debug do `PayoutRequestsManager.tsx`:
- ❌ Pode remover: `console.log('📝 Notes original:', ...)`
- ❌ Pode remover: `console.log('📝 Notes caracteres especiais:', ...)`
- ❌ Pode remover: `console.log('📝 Notes sanitizado:', ...)`
- ✅ Manter: `console.log('📤 Enviando update:', ...)` (útil para debug futuro)

---

**🎯 Status**: Migration criada e pronta para aplicar
**📁 Arquivo**: `supabase/migrations/20251202030000_fix_payout_notification_format.sql`
