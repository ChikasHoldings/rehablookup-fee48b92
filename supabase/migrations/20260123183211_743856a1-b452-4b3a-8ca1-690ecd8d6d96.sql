-- 1. Case events audit table for real timeline tracking
CREATE TABLE public.concierge_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  actor_id UUID,
  actor_type TEXT, -- 'seeker', 'provider', 'admin', 'system'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add index for case timeline queries
CREATE INDEX idx_case_events_inquiry ON public.concierge_case_events(inquiry_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.concierge_case_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Admins can view all case events" ON public.concierge_case_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert case events" ON public.concierge_case_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Seekers can view their own case events" ON public.concierge_case_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.concierge_inquiries 
      WHERE id = inquiry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can view events for their matched cases" ON public.concierge_case_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.concierge_inquiries ci
      JOIN public.facilities f ON f.id = ANY(ci.matched_facility_ids)
      WHERE ci.id = inquiry_id AND f.user_id = auth.uid()
    )
  );

-- 5. Allow service role to insert events (for edge functions)
CREATE POLICY "Service role can manage all events" ON public.concierge_case_events
  FOR ALL USING (true) WITH CHECK (true);