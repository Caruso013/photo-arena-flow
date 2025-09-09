-- Create table for photographer payout requests
CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Policies for payout requests
CREATE POLICY "Photographers can view own requests" 
ON public.payout_requests 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can create own requests" 
ON public.payout_requests 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Admins can manage all requests" 
ON public.payout_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION public.update_payout_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payout_request_updated_at();