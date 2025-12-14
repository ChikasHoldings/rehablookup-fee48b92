-- Add featured column to facilities table for premium listings
ALTER TABLE public.facilities 
ADD COLUMN featured boolean NOT NULL DEFAULT false;