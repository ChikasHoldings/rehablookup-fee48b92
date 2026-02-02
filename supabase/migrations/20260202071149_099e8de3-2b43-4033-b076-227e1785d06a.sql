-- Create international_case_notes table for timestamped internal notes
CREATE TABLE IF NOT EXISTS public.international_case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.international_placement_cases(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.international_case_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can view notes
CREATE POLICY "Admins can view international case notes"
ON public.international_case_notes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert notes
CREATE POLICY "Admins can insert international case notes"
ON public.international_case_notes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_international_case_notes_case_id ON public.international_case_notes(case_id);
CREATE INDEX idx_international_case_notes_created_at ON public.international_case_notes(created_at DESC);

-- Create international_case_events table if not exists (for audit trail)
CREATE TABLE IF NOT EXISTS public.international_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.international_placement_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid,
  actor_type text,
  event_data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.international_case_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view events
CREATE POLICY "Admins can view international case events"
ON public.international_case_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert events
CREATE POLICY "Admins can insert international case events"
ON public.international_case_events
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_international_case_events_case_id ON public.international_case_events(case_id);
CREATE INDEX idx_international_case_events_created_at ON public.international_case_events(created_at DESC);