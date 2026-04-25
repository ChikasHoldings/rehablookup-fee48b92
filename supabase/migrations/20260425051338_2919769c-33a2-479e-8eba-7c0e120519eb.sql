-- Defense-in-depth: revoke anon column-level SELECT on facility email-verification metadata.
-- Pairs with prior hardening of facilities.email and facilities.reply_email.
REVOKE SELECT (reply_email_verified, reply_email_verified_at)
  ON public.facilities
  FROM anon;