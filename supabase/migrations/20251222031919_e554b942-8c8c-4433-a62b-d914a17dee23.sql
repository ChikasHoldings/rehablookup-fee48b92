-- Add special_needs column to leads table to capture all form data
ALTER TABLE public.leads 
ADD COLUMN special_needs text[] DEFAULT '{}'::text[];