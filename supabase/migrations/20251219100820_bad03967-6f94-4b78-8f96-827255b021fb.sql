-- Create table for facility pending changes (multi-location verification workflow)
CREATE TABLE public.facility_pending_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  pending_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  pending_status text NOT NULL DEFAULT 'pending' CHECK (pending_status IN ('pending', 'approved', 'rejected')),
  changed_fields text[] NOT NULL DEFAULT '{}',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by_admin_id uuid,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique index to ensure only one active pending change per facility
CREATE UNIQUE INDEX idx_facility_pending_changes_active 
ON public.facility_pending_changes (facility_id) 
WHERE pending_status = 'pending';

-- Create index for admin queue queries
CREATE INDEX idx_facility_pending_changes_status ON public.facility_pending_changes (pending_status, submitted_at DESC);
CREATE INDEX idx_facility_pending_changes_provider ON public.facility_pending_changes (provider_id);

-- Enable RLS
ALTER TABLE public.facility_pending_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all pending changes
CREATE POLICY "Admins can view all pending changes"
ON public.facility_pending_changes
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update pending changes (approve/reject)
CREATE POLICY "Admins can update pending changes"
ON public.facility_pending_changes
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete pending changes
CREATE POLICY "Admins can delete pending changes"
ON public.facility_pending_changes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Providers can view their own pending changes
CREATE POLICY "Providers can view their own pending changes"
ON public.facility_pending_changes
FOR SELECT
USING (auth.uid() = provider_id);

-- Providers can insert pending changes for their own facilities
CREATE POLICY "Providers can insert pending changes"
ON public.facility_pending_changes
FOR INSERT
WITH CHECK (
  auth.uid() = provider_id AND
  facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())
);

-- Providers can update their own pending changes (only while pending)
CREATE POLICY "Providers can update their pending changes"
ON public.facility_pending_changes
FOR UPDATE
USING (auth.uid() = provider_id AND pending_status = 'pending');

-- Providers can delete their own pending changes (only while pending)
CREATE POLICY "Providers can delete their pending changes"
ON public.facility_pending_changes
FOR DELETE
USING (auth.uid() = provider_id AND pending_status = 'pending');

-- Create trigger for updated_at
CREATE TRIGGER update_facility_pending_changes_updated_at
BEFORE UPDATE ON public.facility_pending_changes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.facility_pending_changes;