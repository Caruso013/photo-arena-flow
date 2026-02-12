-- Add new fields to campaigns for the applications system
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS applications_open boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_audience integer NULL,
ADD COLUMN IF NOT EXISTS event_start_time text NULL,
ADD COLUMN IF NOT EXISTS event_end_time text NULL,
ADD COLUMN IF NOT EXISTS photo_price_display numeric NULL,
ADD COLUMN IF NOT EXISTS available_slots integer NULL;