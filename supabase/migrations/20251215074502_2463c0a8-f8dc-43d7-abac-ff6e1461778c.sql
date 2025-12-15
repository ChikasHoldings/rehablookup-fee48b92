-- Add columns for automated lead qualification and assignment tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS qualified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS qualification_reason text,
ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS assignment_reason text,
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;

-- Add comments for clarity
COMMENT ON COLUMN public.leads.qualified IS 'Whether the lead passed automated qualification rules';
COMMENT ON COLUMN public.leads.qualification_reason IS 'Reason if lead was marked as unqualified';
COMMENT ON COLUMN public.leads.assignment_status IS 'pending, assigned, unassigned_no_capacity, unassigned_no_match';
COMMENT ON COLUMN public.leads.assignment_reason IS 'Human-readable explanation of how/why lead was assigned or not';
COMMENT ON COLUMN public.leads.assigned_at IS 'Timestamp when lead was auto-assigned to a provider';

-- Create index for faster filtering by assignment status
CREATE INDEX IF NOT EXISTS idx_leads_assignment_status ON public.leads(assignment_status);
CREATE INDEX IF NOT EXISTS idx_leads_qualified ON public.leads(qualified);