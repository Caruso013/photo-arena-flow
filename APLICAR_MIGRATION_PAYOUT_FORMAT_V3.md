# 🔧 Aplicar Migration: Fix Erro de Aprovação de Repasse

## ❌ Erro Atual

Ao **APROVAR** repasse:
```
unrecognized format() type specifier "."
Code: 22023
```

Ao **REJEITAR** repasse: ✅ **FUNCIONA**

## 🎯 Solução

A função `notify_payout_status_change()` está usando `TO_CHAR()` que causa erro com números decimais.
A solução é usar concatenação simples com `ROUND()`.

## 📝 Passos

### 1. Acessar SQL Editor do Supabase

1. Abra: https://supabase.com/dashboard
2. Selecione o projeto
3. Vá em **SQL Editor**

### 2. Executar SQL Abaixo

Cole e execute este código:

```sql
CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
RETURNS TRIGGER AS $$
DECLARE
  photographer_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Buscar email do fotógrafo
  SELECT email INTO photographer_email
  FROM auth.users
  WHERE id = NEW.photographer_id;

  -- Definir título e mensagem baseado no status
  IF NEW.status = 'approved' THEN
    notification_title := 'Repasse Aprovado! 🎉';
    -- Usar concatenação simples com ROUND() para evitar problemas
    notification_message := 'Seu repasse de R$ ' || 
                           ROUND(NEW.amount::numeric, 2)::text || 
                           ' foi aprovado e será processado em breve.';
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      notification_message := notification_message || ' Observação: ' || NEW.notes;
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Repasse Recusado';
    notification_message := 'Seu repasse de R$ ' || 
                           ROUND(NEW.amount::numeric, 2)::text || 
                           ' foi recusado.';
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      notification_message := notification_message || ' Motivo: ' || NEW.notes;
    ELSE
      notification_message := notification_message || ' Entre em contato para mais informações.';
    END IF;
  ELSIF NEW.status = 'completed' THEN
    notification_title := 'Repasse Concluído! ✅';
    notification_message := 'Seu repasse de R$ ' || 
                           ROUND(NEW.amount::numeric, 2)::text || 
                           ' foi concluído com sucesso!';
  ELSE
    RETURN NEW;
  END IF;

  -- Inserir notificação com tipo correto
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Verificar

Clique em **Run** e deve aparecer: `Success. No rows returned`

### 4. Testar

Volte ao admin e tente aprovar um repasse. Deve funcionar! ✅

## 📊 Mudanças Aplicadas

- ❌ **Removido**: `TO_CHAR(NEW.amount, 'FM999G999G990D00')` 
- ✅ **Adicionado**: `ROUND(NEW.amount::numeric, 2)::text`
- ✅ **Corrigido**: Tipos de notificação corretos no CASE
- ✅ **Mantido**: Rejeição já funcionando

## ✅ Resultado Esperado

Após aplicar:
- ✅ **Aprovar repasse**: FUNCIONA
- ✅ **Rejeitar repasse**: FUNCIONA (já estava funcionando)
- ✅ **Notificações**: Criadas corretamente com tipos válidos
