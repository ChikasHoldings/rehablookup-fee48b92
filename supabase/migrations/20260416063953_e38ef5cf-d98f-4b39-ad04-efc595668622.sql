
CREATE TABLE public.lead_contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('call', 'email', 'sms')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_contact_events_lead ON public.lead_contact_events(lead_id);
CREATE INDEX idx_lead_contact_events_facility ON public.lead_contact_events(facility_id);
CREATE INDEX idx_lead_contact_events_provider ON public.lead_contact_events(provider_id);

ALTER TABLE public.lead_contact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can insert own contact events"
  ON public.lead_contact_events FOR INSERT TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can read own contact events"
  ON public.lead_contact_events FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins can read all contact events"
  ON public.lead_contact_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
