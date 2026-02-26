
-- Deletar vínculos em organization_users primeiro
DELETE FROM public.organization_users 
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE role = 'organization'
);

-- Deletar os usuários do auth (cascateia para profiles)
DELETE FROM auth.users 
WHERE id IN (
  SELECT id FROM public.profiles WHERE role = 'organization'
);
