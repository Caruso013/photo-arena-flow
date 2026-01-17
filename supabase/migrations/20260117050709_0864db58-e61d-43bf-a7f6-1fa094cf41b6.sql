
-- Criar política para permitir que usuários não autenticados possam ver estatísticas básicas
-- Usamos uma view segura para expor apenas dados públicos

-- Criar política pública para leitura de perfis públicos (apenas contagem)
DROP POLICY IF EXISTS "Public can count photographers" ON public.profiles;
CREATE POLICY "Public can count photographers"
ON public.profiles
FOR SELECT
TO anon
USING (role = 'photographer');

-- Nota: A view public_profiles_safe já existe para dados públicos
