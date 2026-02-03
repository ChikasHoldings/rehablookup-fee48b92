-- Add accepts_international_patients flag to facilities table
ALTER TABLE public.facilities 
ADD COLUMN accepts_international_patients BOOLEAN DEFAULT false;