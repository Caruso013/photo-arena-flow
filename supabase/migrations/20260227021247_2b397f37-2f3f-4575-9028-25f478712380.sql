-- Atualizar preço das fotos do evento AFP | CAMPO DO CRB | 26/02 para R$12,90
-- Sub-evento S15 (id: 798f9f0e e c9a965d3 e 8defff2d)
-- Sub-evento S14 (id: 1f4e274b)
-- Sub-evento S17 (id: b9f07138)

UPDATE photos 
SET price = 12.90, updated_at = now()
WHERE campaign_id = '0014724d-7026-4fb7-8a9b-dc6d3f840610'
AND sub_event_id IN (
  SELECT id FROM sub_events 
  WHERE campaign_id = '0014724d-7026-4fb7-8a9b-dc6d3f840610'
  AND (title ILIKE '%Sub 15%' OR title ILIKE '%Sub 14%' OR title ILIKE '%Sub 17%')
);