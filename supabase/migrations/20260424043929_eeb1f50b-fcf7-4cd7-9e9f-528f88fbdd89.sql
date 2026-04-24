-- H4 (final): Restore table-wide SELECT to `authenticated` (RLS already gates the rows;
-- admins, owners, and engaged seekers all need to read these PII columns for legitimate
-- workflows). Keep the column-restricted grant to `anon` so anonymous public visitors
-- absolutely cannot read email/reply_email/phone via a direct query.

-- Restore full table-level SELECT to authenticated (RLS handles row-level gating).
GRANT SELECT ON public.facilities TO authenticated;

-- Anon's restricted column grant from the previous migration stays in place.
-- (anon has SELECT only on the safe public columns — email/reply_email/phone are not granted.)