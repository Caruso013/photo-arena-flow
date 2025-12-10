-- Corrigir TODAS as funções restantes que precisam de search_path

-- 1. apply_progressive_discount
ALTER FUNCTION public.apply_progressive_discount(integer, numeric) SET search_path = 'public';

-- 2. calculate_progressive_discount
ALTER FUNCTION public.calculate_progressive_discount(integer) SET search_path = 'public';

-- 3. cleanup_old_audit_logs
ALTER FUNCTION public.cleanup_old_audit_logs(integer) SET search_path = 'public';

-- 4. cleanup_old_notifications
ALTER FUNCTION public.cleanup_old_notifications(integer) SET search_path = 'public';

-- 5. get_cache_statistics
ALTER FUNCTION public.get_cache_statistics() SET search_path = 'public';

-- 6. get_photographer_platform_percentage
ALTER FUNCTION public.get_photographer_platform_percentage(uuid) SET search_path = 'public';

-- 7. set_first_photo_as_campaign_cover
ALTER FUNCTION public.set_first_photo_as_campaign_cover() SET search_path = 'public';

-- 8. toggle_cleanup_job
ALTER FUNCTION public.toggle_cleanup_job(text, boolean) SET search_path = 'public';

-- 9. update_photographer_goals_updated_at
ALTER FUNCTION public.update_photographer_goals_updated_at() SET search_path = 'public';

SELECT 'Todas as 9 funções restantes corrigidas!' as status;