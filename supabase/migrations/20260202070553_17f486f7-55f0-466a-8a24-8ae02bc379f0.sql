-- Add missing columns to international_placement_cases
ALTER TABLE public.international_placement_cases 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'English',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS international_payment_id UUID;

-- Add provider_id to invoices table and other needed columns
ALTER TABLE public.international_facility_invoices
ADD COLUMN IF NOT EXISTS provider_id UUID,
ADD COLUMN IF NOT EXISTS issued_by UUID,
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;

-- Ensure RLS is enabled
ALTER TABLE public.international_placement_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.international_facility_invoices ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for international_placement_cases
DROP POLICY IF EXISTS "Users can view own international cases" ON public.international_placement_cases;
DROP POLICY IF EXISTS "Users can insert own international cases" ON public.international_placement_cases;
DROP POLICY IF EXISTS "Admins full access to international cases" ON public.international_placement_cases;

CREATE POLICY "Users can view own international cases" 
ON public.international_placement_cases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own international cases" 
ON public.international_placement_cases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins full access to international cases" 
ON public.international_placement_cases 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate policies for events
DROP POLICY IF EXISTS "Users can view own case events" ON public.international_case_events;
DROP POLICY IF EXISTS "Admins full access to case events" ON public.international_case_events;

CREATE POLICY "Users can view own case events" 
ON public.international_case_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.international_placement_cases c 
    WHERE c.id = case_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins full access to case events" 
ON public.international_case_events 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate policies for invoices
DROP POLICY IF EXISTS "Providers can view own facility invoices" ON public.international_facility_invoices;
DROP POLICY IF EXISTS "Admins full access to facility invoices" ON public.international_facility_invoices;

CREATE POLICY "Providers can view own facility invoices" 
ON public.international_facility_invoices 
FOR SELECT 
USING (provider_id = auth.uid());

CREATE POLICY "Admins full access to facility invoices" 
ON public.international_facility_invoices 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));