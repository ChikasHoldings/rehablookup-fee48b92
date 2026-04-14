
-- Add admission coordination columns to concierge_inquiries
ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS tour_coordination_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS admission_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS move_in_date timestamptz,
  ADD COLUMN IF NOT EXISTS admission_notes text;

-- Add comment for clarity
COMMENT ON COLUMN public.concierge_inquiries.tour_coordination_status IS 'Tour phase: not_started, needed, scheduled, completed, skipped, not_applicable';
COMMENT ON COLUMN public.concierge_inquiries.admission_status IS 'Admission phase: pending, tour_phase, admitted, move_in_scheduled, moved_in';
COMMENT ON COLUMN public.concierge_inquiries.move_in_date IS 'Planned or actual move-in date';
COMMENT ON COLUMN public.concierge_inquiries.admission_notes IS 'Admin/advisor notes about admission coordination';
