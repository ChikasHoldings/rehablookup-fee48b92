-- Admin roles hardening (follow-up): close the self-service commission/HR
-- self-edit hole on admin_user_profiles.
--
-- The self-edit branch of admin_user_profiles_update_consolidated used a column
-- DENY-list (it pinned status, admin_role, mfa_skip, mfa_enabled,
-- force_password_change, temp_password_hash, temp_password_expires_at) and left
-- commission_rate, employment_type, hire_date, and created_by self-writable.
-- commission_rate drives advisor placement earnings, so ANY admin tier could
-- self-raise their own commission via a direct PostgREST UPDATE on their own row
-- (the USING `auth.uid() = user_id` branch passed, and the WITH CHECK did not
-- pin commission_rate) -- an EKRA / financial-integrity hole. employment_type,
-- hire_date, and created_by are HR/provenance fields that are likewise only set
-- by a super admin at provisioning time and must not be self-editable.
--
-- Fix: add those four columns to the pinned set so a self-update can change
-- only genuine self-service columns (names, avatar, phone, notification prefs,
-- email digest cadence, idle timeout). Super admins retain full UPDATE via the
-- is_super_admin() branch, and the service-role edge functions
-- (create-admin-user / manage-admin-user) bypass RLS entirely.

DROP POLICY IF EXISTS admin_user_profiles_update_consolidated ON public.admin_user_profiles;

CREATE POLICY admin_user_profiles_update_consolidated
  ON public.admin_user_profiles
  FOR UPDATE
  USING (
    public.is_super_admin((SELECT auth.uid()))
    OR ((SELECT auth.uid()) = user_id)
  )
  WITH CHECK (
    public.is_super_admin((SELECT auth.uid()))
    OR (
      (SELECT auth.uid()) = user_id
      AND NOT (status IS DISTINCT FROM (SELECT aup.status FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (admin_role IS DISTINCT FROM (SELECT aup.admin_role FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (mfa_skip IS DISTINCT FROM (SELECT aup.mfa_skip FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (mfa_enabled IS DISTINCT FROM (SELECT aup.mfa_enabled FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (force_password_change IS DISTINCT FROM (SELECT aup.force_password_change FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (temp_password_hash IS DISTINCT FROM (SELECT aup.temp_password_hash FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (temp_password_expires_at IS DISTINCT FROM (SELECT aup.temp_password_expires_at FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (commission_rate IS DISTINCT FROM (SELECT aup.commission_rate FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (employment_type IS DISTINCT FROM (SELECT aup.employment_type FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (hire_date IS DISTINCT FROM (SELECT aup.hire_date FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
      AND NOT (created_by IS DISTINCT FROM (SELECT aup.created_by FROM public.admin_user_profiles aup WHERE aup.user_id = (SELECT auth.uid())))
    )
  );

-- Least-privilege: anon never legitimately writes the admin role tables. RLS
-- already blocks it (every policy requires an authenticated uid, which is null
-- for anon), but the table-level DML grant is gratuitous attack surface -- the
-- entire defense would otherwise rest on every present and future policy being
-- airtight against a null auth.uid(). Legitimate writes go through the
-- service-role edge functions, which bypass grants and RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.admin_user_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.user_roles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.admin_user_permissions FROM anon;
