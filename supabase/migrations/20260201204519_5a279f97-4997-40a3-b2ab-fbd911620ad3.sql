-- Marketing Leads table for ad-sourced traffic
CREATE TABLE public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Info
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  preferred_contact text DEFAULT 'phone',
  
  -- Clinical Data (from intake form)
  urgency text,
  who_seeking_help text,
  location_zip text,
  location_city_state text,
  level_of_care text,
  insurance_type text,
  insurance_provider text,
  primary_substance text[],
  dual_diagnosis text,
  age_range text,
  gender text,
  previous_treatment text,
  co_occurring_conditions text[],
  employment_status text,
  message text,
  
  -- Tracking
  source text NOT NULL DEFAULT 'marketing',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_page text,
  
  -- Facility Matching
  matched_facility_ids uuid[] DEFAULT '{}',
  facilities_requested uuid[] DEFAULT '{}',
  
  -- Follow-up Status
  followup_email_sent boolean DEFAULT false,
  followup_email_sent_at timestamptz,
  converted_to_concierge boolean DEFAULT false,
  converted_at timestamptz,
  
  -- Status
  status text DEFAULT 'new',
  admin_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_marketing_leads_created_at ON public.marketing_leads(created_at DESC);
CREATE INDEX idx_marketing_leads_status ON public.marketing_leads(status);
CREATE INDEX idx_marketing_leads_followup ON public.marketing_leads(followup_email_sent, created_at);
CREATE INDEX idx_marketing_leads_email ON public.marketing_leads(email);

-- Enable RLS
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage marketing leads"
  ON public.marketing_leads FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

-- Service role access for edge functions
CREATE POLICY "Service role full access to marketing leads"
  ON public.marketing_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_marketing_leads_updated_at
  BEFORE UPDATE ON public.marketing_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();