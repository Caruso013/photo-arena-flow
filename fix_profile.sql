-- Script para criar perfil manualmente no Supabase
-- Execute isso no SQL Editor do Supabase

-- Inserir perfil para o usuário pedromkk77@gmail.com
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  'Pedro Domingos Ramos da Silva' as full_name,
  'user' as role
FROM auth.users 
WHERE email = 'pedromkk77@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Verificar se o perfil foi criado
SELECT * FROM public.profiles WHERE email = 'pedromkk77@gmail.com';