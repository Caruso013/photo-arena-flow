-- Adicionar constraint unique para evitar vínculos duplicados
ALTER TABLE organization_users 
ADD CONSTRAINT organization_users_user_org_unique UNIQUE (user_id, organization_id);

-- Vincular usuários existentes às suas organizações
-- IGART -> IGART org
INSERT INTO organization_users (user_id, organization_id)
SELECT 
  p.id as user_id,
  o.id as organization_id
FROM profiles p
CROSS JOIN organizations o
WHERE p.email = 'igart@stafotos.com' 
  AND o.name = 'IGART'
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- RubiCup -> Rubi Cup org
INSERT INTO organization_users (user_id, organization_id)
SELECT 
  p.id as user_id,
  o.id as organization_id
FROM profiles p
CROSS JOIN organizations o
WHERE p.email = 'rubicup@stafotos.com' 
  AND o.name = 'Rubi Cup'
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Garantir que esses usuários tenham role 'organization'
UPDATE profiles 
SET role = 'organization'
WHERE email IN ('igart@stafotos.com', 'rubicup@stafotos.com');