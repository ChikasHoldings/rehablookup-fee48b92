-- Create facility_staff table for staff/owner profiles
CREATE TABLE public.facility_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  bio TEXT, -- Optional short bio (max 500 chars)
  photo_url TEXT NOT NULL, -- REQUIRED - Staff photo stored in facility-images bucket
  email TEXT, -- Optional contact email (hidden from public)
  phone TEXT, -- Optional phone (hidden from public)
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.facility_staff ENABLE ROW LEVEL SECURITY;

-- Enable realtime for provider dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_staff;

-- Create index for faster lookups
CREATE INDEX idx_facility_staff_facility_id ON public.facility_staff(facility_id);
CREATE INDEX idx_facility_staff_display_order ON public.facility_staff(facility_id, display_order);

-- RLS Policies

-- Public can view visible staff from approved facilities
CREATE POLICY "Public can view visible staff from approved facilities"
ON public.facility_staff
FOR SELECT
USING (
  is_visible = true 
  AND facility_id IN (
    SELECT id FROM public.facilities WHERE status = 'approved'
  )
);

-- Providers can view all their facility staff (including hidden)
CREATE POLICY "Providers can view their facility staff"
ON public.facility_staff
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Providers can insert staff for their facilities
CREATE POLICY "Providers can insert staff for their facilities"
ON public.facility_staff
FOR INSERT
WITH CHECK (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Providers can update their facility staff
CREATE POLICY "Providers can update their facility staff"
ON public.facility_staff
FOR UPDATE
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Providers can delete their facility staff
CREATE POLICY "Providers can delete their facility staff"
ON public.facility_staff
FOR DELETE
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Admins can view all staff
CREATE POLICY "Admins can view all staff"
ON public.facility_staff
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all staff
CREATE POLICY "Admins can update all staff"
ON public.facility_staff
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete all staff
CREATE POLICY "Admins can delete all staff"
ON public.facility_staff
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_facility_staff_updated_at
BEFORE UPDATE ON public.facility_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();