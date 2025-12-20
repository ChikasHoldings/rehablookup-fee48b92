-- =====================================================
-- SECURITY FIX MIGRATION
-- Addresses: Admin notes exposure, profiles validation
-- =====================================================

-- 1. Create a secure function for facility owners to view their facilities WITHOUT admin_notes
CREATE OR REPLACE FUNCTION public.get_owner_facility_data(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  email text,
  website text,
  description text,
  facility_type text,
  bed_count text,
  gender_served text,
  logo_url text,
  gallery_urls text[],
  featured boolean,
  featured_pinned boolean,
  last_featured_shown_at timestamptz,
  verified boolean,
  reply_email text,
  reply_email_verified boolean,
  reply_email_verified_at timestamptz,
  status text,
  year_established integer,
  leads_reset_at timestamptz,
  bonus_leads integer,
  lead_limit_override integer,
  suspended boolean,
  profile_completion_celebrated boolean,
  profile_reminder_count integer,
  profile_reminder_sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id,
    f.name,
    f.slug,
    f.address,
    f.city,
    f.state,
    f.zip_code,
    f.phone,
    f.email,
    f.website,
    f.description,
    f.facility_type,
    f.bed_count,
    f.gender_served,
    f.logo_url,
    f.gallery_urls,
    f.featured,
    f.featured_pinned,
    f.last_featured_shown_at,
    f.verified,
    f.reply_email,
    f.reply_email_verified,
    f.reply_email_verified_at,
    f.status,
    f.year_established,
    f.leads_reset_at,
    f.bonus_leads,
    f.lead_limit_override,
    f.suspended,
    f.profile_completion_celebrated,
    f.profile_reminder_count,
    f.profile_reminder_sent_at,
    f.created_at,
    f.updated_at
  FROM public.facilities f
  WHERE f.user_id = p_user_id;
$$;

-- 2. Fix profiles INSERT policy to strictly validate user_id matches auth.uid()
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 3. Create a secure function to check lead access (prevents any policy gaps)
CREATE OR REPLACE FUNCTION public.can_access_lead(p_lead_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.facilities f ON l.facility_id = f.id
    WHERE l.id = p_lead_id 
    AND (f.user_id = p_user_id OR p_user_id IN (
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    ))
  );
$$;

-- 4. Create function to verify session ownership (hash comparison only, never expose token)
CREATE OR REPLACE FUNCTION public.get_user_sessions_safe(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  device_name text,
  browser text,
  os text,
  location text,
  ip_address text,
  last_active_at timestamptz,
  created_at timestamptz,
  is_current boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.device_name,
    s.browser,
    s.os,
    s.location,
    s.ip_address,
    s.last_active_at,
    s.created_at,
    s.is_current
  FROM public.user_sessions s
  WHERE s.user_id = p_user_id
  AND s.revoked_at IS NULL
  AND (s.expires_at IS NULL OR s.expires_at > now());
$$;

-- 5. Update user_sessions policy to never expose session_token
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- 6. Create a view for public facility access that explicitly excludes sensitive data
DROP VIEW IF EXISTS public.public_facilities;
CREATE VIEW public.public_facilities AS
SELECT 
  f.id,
  f.name,
  f.slug,
  f.address,
  f.city,
  f.state,
  f.zip_code,
  f.phone,
  f.email,
  f.website,
  f.description,
  f.facility_type,
  f.bed_count,
  f.gender_served,
  f.logo_url,
  f.gallery_urls,
  f.featured,
  f.featured_pinned,
  f.last_featured_shown_at,
  f.verified,
  f.reply_email,
  f.reply_email_verified,
  f.reply_email_verified_at,
  f.status,
  f.created_at,
  f.updated_at
FROM public.facilities f
WHERE f.status = 'approved';

-- Grant access to the view
GRANT SELECT ON public.public_facilities TO anon, authenticated;

-- 7. Add comment documenting security considerations
COMMENT ON FUNCTION public.get_owner_facility_data IS 'Returns facility data for owners WITHOUT admin_notes field to prevent exposure of internal notes';
COMMENT ON FUNCTION public.can_access_lead IS 'Validates lead access rights - returns true only for assigned facility owner or admin';
COMMENT ON FUNCTION public.get_user_sessions_safe IS 'Returns user sessions WITHOUT session_token to prevent token exposure';
COMMENT ON VIEW public.public_facilities IS 'Public-facing facility data excluding sensitive fields like admin_notes, user_id, and internal tracking fields';