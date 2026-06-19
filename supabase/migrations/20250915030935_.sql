-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add payout_percentage to profiles table for photographers
ALTER TABLE public.profiles 
ADD COLUMN payout_percentage numeric DEFAULT 70.00 CHECK (payout_percentage >= 0 AND payout_percentage <= 100);

-- Create sub_events table for events within campaigns
CREATE TABLE public.sub_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_time timestamp with time zone,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sub_events_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE
);

-- Enable RLS on sub_events
ALTER TABLE public.sub_events ENABLE ROW LEVEL SECURITY;

-- Create policies for sub_events
CREATE POLICY "Anyone can view active sub events" 
ON public.sub_events 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Photographers can manage sub events for own campaigns" 
ON public.sub_events 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = sub_events.campaign_id 
    AND campaigns.photographer_id = auth.uid()
    AND has_role(auth.uid(), 'photographer'::user_role)
  )
);

CREATE POLICY "Admins can manage all sub events" 
ON public.sub_events 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Add sub_event_id to photos table (optional)
ALTER TABLE public.photos 
ADD COLUMN sub_event_id uuid,
ADD CONSTRAINT photos_sub_event_id_fkey FOREIGN KEY (sub_event_id) REFERENCES public.sub_events(id) ON DELETE SET NULL;

-- Create trigger for sub_events updated_at
CREATE TRIGGER update_sub_events_updated_at
BEFORE UPDATE ON public.sub_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();;
