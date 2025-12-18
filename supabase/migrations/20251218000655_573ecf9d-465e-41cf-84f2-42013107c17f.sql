-- Add year_established column to facilities
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS year_established integer;

-- Create facility_accreditations table
CREATE TABLE IF NOT EXISTS public.facility_accreditations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  accreditation_type text NOT NULL,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  verified_by uuid,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE(facility_id, accreditation_type)
);

-- Enable RLS on facility_accreditations
ALTER TABLE public.facility_accreditations ENABLE ROW LEVEL SECURITY;

-- Providers can view accreditations of their own facilities
CREATE POLICY "Users can view accreditations of their facilities"
ON public.facility_accreditations
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Anyone can view verified accreditations of approved facilities
CREATE POLICY "Anyone can view verified accreditations of approved facilities"
ON public.facility_accreditations
FOR SELECT
USING (
  verified = true AND
  facility_id IN (
    SELECT id FROM public.facilities WHERE status = 'approved'
  )
);

-- Providers can insert accreditations for their facilities
CREATE POLICY "Users can insert accreditations for their facilities"
ON public.facility_accreditations
FOR INSERT
WITH CHECK (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Providers can delete accreditations from their facilities
CREATE POLICY "Users can delete accreditations from their facilities"
ON public.facility_accreditations
FOR DELETE
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Admins can view all accreditations
CREATE POLICY "Admins can view all accreditations"
ON public.facility_accreditations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update accreditations (for verification)
CREATE POLICY "Admins can update accreditations"
ON public.facility_accreditations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete accreditations
CREATE POLICY "Admins can delete accreditations"
ON public.facility_accreditations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));