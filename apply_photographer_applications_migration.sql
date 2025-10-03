-- Aplicar migração da tabela photographer_applications
-- Execute este SQL no Supabase SQL Editor

-- Criar tabela photographer_applications
CREATE TABLE IF NOT EXISTS photographer_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    portfolio_url TEXT,
    experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50),
    equipment TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_photographer_applications_user_id ON photographer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_photographer_applications_status ON photographer_applications(status);
CREATE INDEX IF NOT EXISTS idx_photographer_applications_created_at ON photographer_applications(created_at);

-- Constraint única para evitar múltiplas candidaturas pendentes do mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS idx_photographer_applications_unique_pending 
ON photographer_applications(user_id) WHERE status = 'pending';

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_photographer_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_photographer_applications_updated_at_trigger ON photographer_applications;
CREATE TRIGGER update_photographer_applications_updated_at_trigger
    BEFORE UPDATE ON photographer_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_photographer_applications_updated_at();

-- RLS Policies
ALTER TABLE photographer_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem criar e ver suas próprias candidaturas
CREATE POLICY IF NOT EXISTS "Users can create their own applications"
ON photographer_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view their own applications"
ON photographer_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins podem ver e gerenciar todas as candidaturas
CREATE POLICY IF NOT EXISTS "Admins can view all applications"
ON photographer_applications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY IF NOT EXISTS "Admins can update all applications"
ON photographer_applications FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Verificar se a migração foi aplicada com sucesso
SELECT 'Migração photographer_applications aplicada com sucesso!' as status;