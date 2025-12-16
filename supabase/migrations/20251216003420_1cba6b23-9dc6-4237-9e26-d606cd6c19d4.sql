-- Create routing logs table to track all lead routing decisions (internal only)
CREATE TABLE public.lead_routing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_provider_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  assignment_reason TEXT NOT NULL,
  plan_tier TEXT,
  subscription_status TEXT,
  lead_limit INTEGER,
  used_leads INTEGER,
  routing_source TEXT NOT NULL DEFAULT 'system', -- 'system' for auto-routing, 'direct' for profile submissions
  requested_facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL, -- Original facility if different from assigned
  eligibility_check_result JSONB DEFAULT '{}'::jsonb, -- Full eligibility check details
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_routing_logs ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access routing logs (internal only)
CREATE POLICY "Service role can insert routing logs"
ON public.lead_routing_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view routing logs"
ON public.lead_routing_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add index for efficient querying
CREATE INDEX idx_lead_routing_logs_lead_id ON public.lead_routing_logs(lead_id);
CREATE INDEX idx_lead_routing_logs_assigned_provider ON public.lead_routing_logs(assigned_provider_id);
CREATE INDEX idx_lead_routing_logs_created_at ON public.lead_routing_logs(created_at DESC);