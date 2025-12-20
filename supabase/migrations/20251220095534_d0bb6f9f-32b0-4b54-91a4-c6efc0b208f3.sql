-- Restore public access to approved facilities for public pages
-- The admin_notes field is still readable but should not be exposed in the frontend code

CREATE POLICY "Public can view approved facilities" 
ON public.facilities 
FOR SELECT 
USING (status = 'approved');

-- Add comment explaining the security model
COMMENT ON COLUMN public.facilities.admin_notes IS 'Internal admin notes - excluded from public_facilities view and should never be exposed in frontend code';