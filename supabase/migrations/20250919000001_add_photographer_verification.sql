-- Adicionar campo verified para fotógrafos
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Adicionar comentário na coluna
COMMENT ON COLUMN profiles.verified IS 'Indica se o fotógrafo foi verificado pelo administrador';

-- Criar tabela para eventos futuros que fotógrafos podem se inscrever
CREATE TABLE IF NOT EXISTS upcoming_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255) NOT NULL,
  max_photographers INTEGER DEFAULT 1,
  application_deadline TIMESTAMP WITH TIME ZONE,
  organizer_contact VARCHAR(255),
  requirements TEXT,
  payment_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Criar tabela para inscrições de fotógrafos em eventos
CREATE TABLE IF NOT EXISTS event_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES upcoming_events(id) ON DELETE CASCADE,
  photographer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  application_message TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  UNIQUE(event_id, photographer_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_upcoming_events_date ON upcoming_events(event_date);
CREATE INDEX IF NOT EXISTS idx_upcoming_events_status ON upcoming_events(status);
CREATE INDEX IF NOT EXISTS idx_event_applications_event_id ON event_applications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_applications_photographer_id ON event_applications(photographer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified) WHERE role = 'photographer';

-- RLS (Row Level Security) policies
ALTER TABLE upcoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_applications ENABLE ROW LEVEL SECURITY;

-- Políticas para upcoming_events
CREATE POLICY "Admins can manage all upcoming events" ON upcoming_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Verified photographers can view upcoming events" ON upcoming_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'photographer' 
      AND profiles.verified = true
    )
  );

-- Políticas para event_applications
CREATE POLICY "Photographers can manage their own applications" ON event_applications
  FOR ALL USING (photographer_id = auth.uid());

CREATE POLICY "Admins can manage all applications" ON event_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Comentários nas tabelas
COMMENT ON TABLE upcoming_events IS 'Eventos futuros onde fotógrafos podem se candidatar';
COMMENT ON TABLE event_applications IS 'Candidaturas de fotógrafos para eventos futuros';