-- Allow anyone (including anonymous users) to SELECT from system_config.
-- This is needed so the home_hero_banner and other public settings are
-- visible to all visitors, not just admins.
-- Write operations (INSERT/UPDATE/DELETE) remain restricted to admins only.

DROP POLICY IF EXISTS "Public can read system config" ON public.system_config;

CREATE POLICY "Public can read system config"
ON public.system_config
FOR SELECT
USING (true);
