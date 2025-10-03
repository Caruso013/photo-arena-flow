-- Criar tabela para solicitações de fotógrafos
CREATE TABLE photographer_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT NOT NULL,
    portfolio_url TEXT,
    experience_years INTEGER,
    equipment TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_photographer_applications_user_id ON photographer_applications(user_id);
CREATE INDEX idx_photographer_applications_status ON photographer_applications(status);
CREATE INDEX idx_photographer_applications_applied_at ON photographer_applications(applied_at);

-- RLS Policies
ALTER TABLE photographer_applications ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem criar suas próprias solicitações
CREATE POLICY "Users can create their own applications" ON photographer_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem ver apenas suas próprias solicitações
CREATE POLICY "Users can view their own applications" ON photographer_applications
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuários podem atualizar apenas suas próprias solicitações pendentes
CREATE POLICY "Users can update their own pending applications" ON photographer_applications
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND status = 'pending'
    );

-- Política: Admins podem ver todas as solicitações
CREATE POLICY "Admins can view all applications" ON photographer_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Política: Admins podem processar (atualizar) todas as solicitações
CREATE POLICY "Admins can process applications" ON photographer_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_photographer_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER photographer_applications_updated_at_trigger
    BEFORE UPDATE ON photographer_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_photographer_applications_updated_at();

-- Constraint para impedir múltiplas solicitações pendentes do mesmo usuário
CREATE UNIQUE INDEX unique_pending_application_per_user 
ON photographer_applications (user_id) 
WHERE status = 'pending';