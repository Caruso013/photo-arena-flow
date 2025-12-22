-- Tabela para rastrear pagamentos às organizações
CREATE TABLE public.organization_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, cycle_start, cycle_end)
);

-- Enable RLS
ALTER TABLE public.organization_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem gerenciar pagamentos
CREATE POLICY "Admins can manage organization payments"
ON public.organization_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Policy: Organizações podem ver seus próprios pagamentos
CREATE POLICY "Organizations can view their payments"
ON public.organization_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_payments.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.is_active = true
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organization_payments_updated_at
BEFORE UPDATE ON public.organization_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();