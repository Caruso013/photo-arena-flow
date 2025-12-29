-- Vincular IGART (usuário f02336d1 → organização 62571971) como admin
INSERT INTO organization_members (user_id, organization_id, role, is_active, photographer_percentage)
VALUES ('f02336d1-5fd6-49ef-bd75-63d7499fa444', '62571971-eb45-4dc2-b061-59cc728f5599', 'admin', true, 0)
ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'admin', is_active = true;

-- Vincular RubiCup (usuário 68d5bfb2 → organização b113427c) como admin
INSERT INTO organization_members (user_id, organization_id, role, is_active, photographer_percentage)
VALUES ('68d5bfb2-800e-4f40-b1ca-d26d8186ef07', 'b113427c-cc1f-46f2-a9b6-a2cdbf6d68af', 'admin', true, 0)
ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'admin', is_active = true;

-- Vincular APF (usuário 55c9fec2 → organização c31c98a0) como admin
INSERT INTO organization_members (user_id, organization_id, role, is_active, photographer_percentage)
VALUES ('55c9fec2-89e1-4ca6-9dc8-58d125da20d0', 'c31c98a0-b78f-41fc-9430-78559cf811d1', 'admin', true, 0)
ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'admin', is_active = true;