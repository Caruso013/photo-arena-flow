-- 1. Atualizar status das compras para 'completed'
UPDATE purchases 
SET status = 'completed'
WHERE id IN ('0573df99-c2f7-4346-89d7-ff6a8f063dad', '68fbe268-4668-449b-be5a-56de8638fcee');