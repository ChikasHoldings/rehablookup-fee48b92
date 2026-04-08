-- Fix existing welcome notifications that point to /admin/settings
-- so advisors (and other non-settings users) can access them
UPDATE public.admin_user_notifications 
SET link = '/admin/profile' 
WHERE type = 'welcome' AND link = '/admin/settings';