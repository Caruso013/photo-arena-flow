-- Garantir profile do usuário organização RubiCup e definir senha
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('68d5bfb2-800e-4f40-b1ca-d26d8186ef07', 'rubicup@stafotos.com', 'RubiCup', 'organization'::user_role)
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
  role = 'organization'::user_role;

-- Atualizar senha do usuário
UPDATE auth.users
SET encrypted_password = crypt('RubiCup@2026', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '68d5bfb2-800e-4f40-b1ca-d26d8186ef07';

-- Garantir vínculo organization_users
INSERT INTO public.organization_users (user_id, organization_id)
VALUES ('68d5bfb2-800e-4f40-b1ca-d26d8186ef07', 'b113427c-cc1f-46f2-a9b6-a2cdbf6d68af')
ON CONFLICT (user_id, organization_id) DO NOTHING;