-- Script para criar usuário admin
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, crie o usuário no auth.users (se ainda não existir)
-- Você pode fazer isso via dashboard do Supabase ou via código

-- 2. Depois, insira/atualize o profile para ser admin
-- Substitua 'SEU_EMAIL_ADMIN' pelo email que você quer usar como admin

-- Para atualizar um usuário existente para admin:
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@stafotos.com.br';

-- Para verificar se o usuário foi criado:
SELECT id, email, role, full_name FROM profiles WHERE role = 'admin';

-- Se o usuário não existir na tabela profiles, você pode inserir assim:
-- (substitua o UUID pelo ID real do usuário do auth.users)
/*
INSERT INTO profiles (id, email, role, full_name, created_at, updated_at) 
VALUES (
  'uuid-do-usuario-auth', 
  'admin@stafotos.com.br', 
  'admin', 
  'Administrador do Sistema',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET role = 'admin';
*/