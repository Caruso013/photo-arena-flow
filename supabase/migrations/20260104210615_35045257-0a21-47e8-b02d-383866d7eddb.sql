-- Adicionar campos de PIX na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_key_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_recipient_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_institution TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_pending_change JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pix_change_requested_at TIMESTAMPTZ;

-- Comentários explicativos
COMMENT ON COLUMN public.profiles.pix_key IS 'Chave PIX criptografada do fotógrafo';
COMMENT ON COLUMN public.profiles.pix_key_type IS 'Tipo da chave: cpf, cnpj, email, telefone, aleatoria';
COMMENT ON COLUMN public.profiles.pix_pending_change IS 'Alteração de PIX pendente aguardando período de carência';
COMMENT ON COLUMN public.profiles.pix_change_requested_at IS 'Data da solicitação de alteração de PIX';

-- RLS: Fotógrafos podem ver e atualizar apenas seus próprios dados de PIX
CREATE POLICY "Photographers can view own pix data"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Photographers can update own pix data"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins podem ver dados de PIX de todos os fotógrafos
CREATE POLICY "Admins can view all pix data"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));