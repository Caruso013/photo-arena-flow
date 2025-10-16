-- Corrigir coluna id da tabela revenue_shares para ter valor default
ALTER TABLE public.revenue_shares 
ALTER COLUMN id SET DEFAULT gen_random_uuid();