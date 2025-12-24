-- Corrigir perfil da RubiCup que está faltando
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('68d5bfb2-800e-4f40-b1ca-d26d8186ef07', 'rubicup@stafotos.com', 'RubiCup', 'organization')
ON CONFLICT (id) DO UPDATE SET 
  role = 'organization', 
  full_name = 'RubiCup',
  email = 'rubicup@stafotos.com',
  updated_at = now();