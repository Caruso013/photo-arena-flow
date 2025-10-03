-- MIGRAÇÃO SIMPLES E DIRETA PARA CORRIGIR O ERRO
-- Copie e cole EXATAMENTE este código no Supabase SQL Editor

-- 1. Remover tabela se existir (para corrigir qualquer problema)
DROP TABLE IF EXISTS photographer_applications;

-- 2. Criar tabela photographer_applications com estrutura correta
CREATE TABLE photographer_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    portfolio_url TEXT,
    experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50),
    equipment TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT
);

-- 3. Criar índices para performance
CREATE INDEX idx_photographer_applications_user_id ON photographer_applications(user_id);
CREATE INDEX idx_photographer_applications_status ON photographer_applications(status);
CREATE INDEX idx_photographer_applications_created_at ON photographer_applications(created_at);

-- 4. Constraint única para evitar múltiplas candidaturas pendentes
CREATE UNIQUE INDEX idx_photographer_applications_unique_pending 
ON photographer_applications(user_id) WHERE status = 'pending';

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_photographer_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para updated_at
CREATE TRIGGER update_photographer_applications_updated_at_trigger
    BEFORE UPDATE ON photographer_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_photographer_applications_updated_at();

-- 7. Habilitar RLS (Row Level Security)
ALTER TABLE photographer_applications ENABLE ROW LEVEL SECURITY;

-- 8. Políticas de segurança - Usuários podem criar e ver suas candidaturas
CREATE POLICY "Users can create their own applications"
ON photographer_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
ON photographer_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 9. Políticas de segurança - Admins podem ver e gerenciar todas
CREATE POLICY "Admins can view all applications"
ON photographer_applications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
    OR auth.uid() = user_id
);

CREATE POLICY "Admins can update all applications"
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

-- 10. Verificar se deu tudo certo
SELECT 'Tabela photographer_applications criada com sucesso!' as status;

-- 11. Mostrar estrutura da tabela criada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'photographer_applications'
ORDER BY ordinal_position;