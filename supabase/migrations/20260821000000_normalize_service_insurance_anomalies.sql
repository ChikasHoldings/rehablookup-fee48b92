-- Fix 7 (directory-filtering audit): normalize near-duplicate taxonomy values
-- so treatment/insurance slug filters don't miss the stragglers. Dedupe first
-- (a facility may already carry the canonical value) then rename. Idempotent.

DELETE FROM public.facility_services a
 WHERE a.service_name = 'Detox Programs'
   AND EXISTS (SELECT 1 FROM public.facility_services b
                WHERE b.facility_id = a.facility_id AND b.service_name = 'Detoxification');
UPDATE public.facility_services SET service_name = 'Detoxification'
 WHERE service_name = 'Detox Programs';

DELETE FROM public.facility_insurance a
 WHERE a.insurance_name = 'Self-Pay'
   AND EXISTS (SELECT 1 FROM public.facility_insurance b
                WHERE b.facility_id = a.facility_id AND b.insurance_name = 'Self-Pay/Private Pay');
UPDATE public.facility_insurance SET insurance_name = 'Self-Pay/Private Pay'
 WHERE insurance_name = 'Self-Pay';
