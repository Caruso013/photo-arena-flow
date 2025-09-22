-- Verificar se existe usuário admin
SELECT id, email, role FROM profiles WHERE role = 'admin';

-- Se não existir, criar um usuário admin (substitua pelo email e ID do usuário que você quer promover)
-- UPDATE profiles SET role = 'admin' WHERE email = 'seu-email-admin@email.com';

-- Ou inserir um novo usuário admin diretamente na tabela profiles
-- (você precisa ter um usuário já criado via auth primeiro)
-- INSERT INTO profiles (id, email, role, full_name) 
-- VALUES ('uuid-do-usuario', 'admin@stafotos.com.br', 'admin', 'Administrador');