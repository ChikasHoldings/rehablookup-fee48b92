-- Add reply_email field to facilities for Reply-To handling
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS reply_email TEXT;

-- Add a comment explaining the field
COMMENT ON COLUMN public.facilities.reply_email IS 'Email address where lead replies will be sent. Used as Reply-To header in outbound emails.';