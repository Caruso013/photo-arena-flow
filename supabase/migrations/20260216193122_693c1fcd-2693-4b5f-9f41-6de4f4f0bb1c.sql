INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos', 'org-logos', true);

CREATE POLICY "Public read org logos" ON storage.objects FOR SELECT USING (bucket_id = 'org-logos');

CREATE POLICY "Admins can upload org logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'org-logos');

CREATE POLICY "Admins can update org logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'org-logos');

CREATE POLICY "Admins can delete org logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'org-logos');