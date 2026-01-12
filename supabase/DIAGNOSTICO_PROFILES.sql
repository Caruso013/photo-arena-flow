-- DIAGNÓSTICO E CORREÇÃO: Erro 500 ao atualizar profiles

-- PASSO 1: Ver triggers na tabela profiles
SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    CASE WHEN tgenabled = 'D' THEN 'DISABLED' ELSE 'ENABLED' END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'profiles'
AND NOT tgisinternal;

-- PASSO 2: Remover qualquer trigger de validação de payout na tabela profiles (erro!)
DROP TRIGGER IF EXISTS validate_payout_recipient_trigger ON public.profiles;

-- PASSO 3: Verificar se RLS está ativada
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'profiles';

-- PASSO 4: Ver todas as políticas RLS na tabela profiles
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- PASSO 5: Garantir permissões corretas
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- PASSO 6: Testar update simples (substitua o ID pelo seu)
-- UPDATE public.profiles SET pix_key = 'teste@email.com' WHERE id = '9f94b76c-9494-4994-8d45-8d553395b645';
