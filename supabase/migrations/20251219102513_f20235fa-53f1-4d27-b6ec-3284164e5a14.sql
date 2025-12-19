-- Add timezone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.timezone IS 'User preferred timezone in IANA format (e.g., America/New_York)';