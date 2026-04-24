-- Revoke column-level SELECT on PII columns from the anon role.
-- The public_facilities view does not include these columns, so the public
-- directory continues to work via security_invoker without leaking emails.
REVOKE SELECT (email, reply_email) ON public.facilities FROM anon;