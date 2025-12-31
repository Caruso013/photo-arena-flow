-- Adicionar campos de logo e cor para organizações
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#D4AF37';

-- Adicionar comentários
COMMENT ON COLUMN public.organizations.logo_url IS 'URL da logo da organização';
COMMENT ON COLUMN public.organizations.primary_color IS 'Cor primária da organização em formato HEX';