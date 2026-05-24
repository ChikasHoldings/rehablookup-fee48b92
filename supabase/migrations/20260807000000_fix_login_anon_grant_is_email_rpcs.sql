-- CRITICAL LOGIN FIX
--
-- Symptom: every seeker and provider attempting to sign in was rejected
-- with "No account found with this email address." even when the
-- credentials were correct. Supabase auth `/token` was returning 200,
-- but the pre-signin flow on /login bailed out before reaching it.
--
-- Root cause: Login.tsx → detectAccountType() calls three RPCs
-- (is_email_admin, is_email_provider, is_email_seeker) BEFORE invoking
-- supabase.auth.signInWithPassword(). At that point the caller is the
-- `anon` role, but EXECUTE on those three functions was granted to
-- `authenticated` and `service_role` only — never `anon`.
--
-- The PostgREST RPC call returned a permission-denied error. Login.tsx
-- catches that error and logs it, then falls through to "unknown"
-- account type → returns blocked=true → user sees "No account found".
--
-- The fix: grant EXECUTE to `anon`. These three functions:
--   1. Take an email and return a plain boolean.
--   2. Don't reveal the email (the caller supplied it).
--   3. Don't enumerate user lists.
--   4. Are SQL functions reading auth.users + profiles/user_roles only
--      to confirm if the email belongs to a known account type so the
--      Login.tsx routing can pick the right post-signin destination.
--
-- All three guarantees still hold. Safe to expose to anon.

GRANT EXECUTE ON FUNCTION public.is_email_admin(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_email_provider(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_email_seeker(text) TO anon;
