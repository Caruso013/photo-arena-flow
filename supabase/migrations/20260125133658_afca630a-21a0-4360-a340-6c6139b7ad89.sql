-- Adicionar campos para termos do evento na tabela campaigns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS event_terms TEXT,
ADD COLUMN IF NOT EXISTS event_terms_pdf_url TEXT;

-- Adicionar novos campos para a candidatura de fotógrafos em eventos
ALTER TABLE public.event_applications
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS has_vehicle BOOLEAN,
ADD COLUMN IF NOT EXISTS has_night_equipment BOOLEAN,
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP WITH TIME ZONE;

-- Criar bucket para armazenar PDFs de termos de eventos (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-terms', 'event-terms', true)
ON CONFLICT (id) DO NOTHING;

-- Política para admins fazerem upload de termos
CREATE POLICY "Admins can upload event terms"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-terms' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política para qualquer um visualizar termos (são públicos)
CREATE POLICY "Anyone can view event terms"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-terms');

-- Política para admins deletarem termos
CREATE POLICY "Admins can delete event terms"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-terms' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);