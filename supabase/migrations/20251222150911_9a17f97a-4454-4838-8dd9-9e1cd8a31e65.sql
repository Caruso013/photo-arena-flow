-- Vincular RubiCup ao usuário correto (nome é RubiCup, não Rubi Cup)
INSERT INTO organization_users (user_id, organization_id)
VALUES ('68d5bfb2-800e-4f40-b1ca-d26d8186ef07', 'b113427c-cc1f-46f2-a9b6-a2cdbf6d68af')
ON CONFLICT (user_id, organization_id) DO NOTHING;