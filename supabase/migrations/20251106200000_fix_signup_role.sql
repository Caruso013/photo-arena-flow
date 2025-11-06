-- ============================================
-- Fix: Corrigir trigger para salvar o role do usuário no cadastro
-- ============================================

-- Recriar a função para incluir o role do metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Pegar o role do metadata, ou 'user' como default
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');
  
  -- Inserir perfil com role correto
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data ->> 'full_name',
    user_role::user_role
  );
  
  RETURN NEW;
END;
$$;

-- O trigger já existe, não precisa recriar
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Cria perfil automaticamente ao registrar usuário, incluindo o role selecionado';
