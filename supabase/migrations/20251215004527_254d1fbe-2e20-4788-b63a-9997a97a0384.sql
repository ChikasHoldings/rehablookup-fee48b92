-- Add column to track if profile completion has been celebrated
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS profile_completion_celebrated boolean DEFAULT false;