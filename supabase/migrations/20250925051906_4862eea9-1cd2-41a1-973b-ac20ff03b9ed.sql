-- Create financial analytics tables and update existing tables for gamification

-- Add revenue tracking table
CREATE TABLE public.revenue_shares (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_id UUID NOT NULL,
    photographer_id UUID NOT NULL,
    organization_id UUID,
    platform_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    photographer_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    organization_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on revenue_shares
ALTER TABLE public.revenue_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for revenue_shares
CREATE POLICY "Admins can view all revenue shares" 
ON public.revenue_shares 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Photographers can view their revenue shares" 
ON public.revenue_shares 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Organization members can view their revenue shares" 
ON public.revenue_shares 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = revenue_shares.organization_id 
    AND user_id = auth.uid() 
    AND is_active = true
));

-- Create event applications table for photographers to register for events
CREATE TABLE public.event_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL,
    photographer_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, photographer_id)
);

-- Enable RLS on event_applications
ALTER TABLE public.event_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_applications
CREATE POLICY "Photographers can create applications" 
ON public.event_applications 
FOR INSERT 
WITH CHECK (auth.uid() = photographer_id AND has_role(auth.uid(), 'photographer'::user_role));

CREATE POLICY "Photographers can view their applications" 
ON public.event_applications 
FOR SELECT 
USING (auth.uid() = photographer_id);

CREATE POLICY "Admins can manage all applications" 
ON public.event_applications 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Organization members can view campaign applications" 
ON public.event_applications 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM campaigns c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = event_applications.campaign_id
    AND om.user_id = auth.uid() 
    AND om.is_active = true
));

-- Add photographer_id as nullable to campaigns (will be assigned when approved)
ALTER TABLE public.campaigns ALTER COLUMN photographer_id DROP NOT NULL;