-- Allow anyone to view approved facilities publicly
CREATE POLICY "Anyone can view approved facilities" 
ON public.facilities 
FOR SELECT 
USING (status = 'approved');

-- Allow anyone to view services of approved facilities
CREATE POLICY "Anyone can view services of approved facilities" 
ON public.facility_services 
FOR SELECT 
USING (facility_id IN (SELECT id FROM public.facilities WHERE status = 'approved'));

-- Allow anyone to view insurance of approved facilities
CREATE POLICY "Anyone can view insurance of approved facilities" 
ON public.facility_insurance 
FOR SELECT 
USING (facility_id IN (SELECT id FROM public.facilities WHERE status = 'approved'));

-- Allow anyone to view age groups of approved facilities
CREATE POLICY "Anyone can view age groups of approved facilities" 
ON public.facility_age_groups 
FOR SELECT 
USING (facility_id IN (SELECT id FROM public.facilities WHERE status = 'approved'));