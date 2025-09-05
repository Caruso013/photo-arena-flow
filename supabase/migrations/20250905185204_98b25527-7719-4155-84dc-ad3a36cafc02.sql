-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('user', 'photographer', 'admin');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create campaigns table for photo events/championships
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  location TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  watermarked_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on photos
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Create purchases table for tracking photo sales
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for campaigns
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Photographers can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (
    auth.uid() = photographer_id AND 
    public.has_role(auth.uid(), 'photographer')
  );

CREATE POLICY "Photographers can update own campaigns" ON public.campaigns
  FOR UPDATE USING (
    auth.uid() = photographer_id AND 
    public.has_role(auth.uid(), 'photographer')
  );

CREATE POLICY "Admins can manage all campaigns" ON public.campaigns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for photos
CREATE POLICY "Anyone can view available photos" ON public.photos
  FOR SELECT USING (is_available = true);

CREATE POLICY "Photographers can manage own photos" ON public.photos
  FOR ALL USING (
    auth.uid() = photographer_id AND 
    public.has_role(auth.uid(), 'photographer')
  );

CREATE POLICY "Admins can manage all photos" ON public.photos
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for purchases
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Photographers can view own sales" ON public.purchases
  FOR SELECT USING (auth.uid() = photographer_id);

CREATE POLICY "Admins can view all purchases" ON public.purchases
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Create storage buckets for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('photos-original', 'photos-original', false),
  ('photos-watermarked', 'photos-watermarked', true),
  ('photos-thumbnails', 'photos-thumbnails', true),
  ('campaign-covers', 'campaign-covers', true);

-- Storage policies for original photos (private)
CREATE POLICY "Photographers can upload original photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos-original' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Only purchased photos accessible" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'photos-original' AND (
      -- Owner can access
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Admin can access
      public.has_role(auth.uid(), 'admin') OR
      -- Buyer who purchased can access
      EXISTS (
        SELECT 1 FROM public.purchases p
        JOIN public.photos ph ON p.photo_id = ph.id
        WHERE p.buyer_id = auth.uid() 
        AND p.status = 'completed'
        AND ph.original_url LIKE '%' || name || '%'
      )
    )
  );

-- Storage policies for watermarked photos (public)
CREATE POLICY "Anyone can view watermarked photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos-watermarked');

CREATE POLICY "Photographers can upload watermarked photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos-watermarked' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for thumbnails (public)
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos-thumbnails');

CREATE POLICY "Photographers can upload thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photos-thumbnails' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for campaign covers (public)
CREATE POLICY "Anyone can view campaign covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'campaign-covers');

CREATE POLICY "Photographers can upload campaign covers" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'campaign-covers' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );