-- =============================================
-- CONCIERGE PLACEMENT SERVICE DATABASE SCHEMA
-- =============================================

-- 1. Add concierge network fields to facilities table
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS concierge_network_opted_in boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS concierge_opted_in_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS concierge_accepted_care_types jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS concierge_accepted_insurance jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS concierge_availability_status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS concierge_admissions_contact text,
ADD COLUMN IF NOT EXISTS concierge_admissions_email text,
ADD COLUMN IF NOT EXISTS concierge_admissions_phone text,
ADD COLUMN IF NOT EXISTS concierge_agreement_preference text DEFAULT 'either',
ADD COLUMN IF NOT EXISTS concierge_notes text;

-- 2. Create placement_cases table (main case table)
CREATE TABLE IF NOT EXISTS public.placement_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Contact Info
  seeker_name text NOT NULL,
  seeker_email text NOT NULL,
  seeker_phone text NOT NULL,
  seeker_user_id uuid REFERENCES auth.users(id),
  who_seeking_help text DEFAULT 'self', -- self, loved_one, professional
  
  -- Intake Data
  primary_issue text[], -- substances or conditions
  level_of_care text, -- detox, inpatient, php, iop, outpatient, mat, sober_living
  payment_type text, -- insurance, self_pay, medicaid, medicare
  insurance_carrier text,
  insurance_plan text,
  self_pay_budget text,
  preferred_states text[],
  preferred_cities text[],
  urgency text, -- immediate, within_week, within_month, flexible
  age_range text, -- adult, young_adult, adolescent
  gender text,
  special_considerations jsonb DEFAULT '{}'::jsonb,
  additional_notes text,
  preferred_contact_method text DEFAULT 'phone',
  best_time_to_contact text,
  
  -- Status Workflow
  status text NOT NULL DEFAULT 'new', -- new, reviewing, matching, introductions_sent, in_contact, admitted, closed, cancelled
  status_updated_at timestamp with time zone DEFAULT now(),
  assigned_to uuid REFERENCES auth.users(id),
  
  -- Monetization
  monetization_type text, -- commission, flat_fee
  commission_percent numeric(5,2),
  flat_fee_cents integer,
  terms_status text DEFAULT 'draft', -- draft, proposed, accepted, invoiced, paid
  
  -- Outcome Tracking
  admitted_facility_id uuid REFERENCES public.facilities(id),
  admitted_at timestamp with time zone,
  revenue_cents integer,
  revenue_collected_at timestamp with time zone,
  closed_reason text
);

-- 3. Create placement_case_providers table (provider introductions)
CREATE TABLE IF NOT EXISTS public.placement_case_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.placement_cases(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  provider_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  introduced_at timestamp with time zone,
  provider_response text DEFAULT 'pending', -- pending, interested, limited, not_available, declined
  responded_at timestamp with time zone,
  availability_notes text,
  selected_for_placement boolean DEFAULT false,
  
  UNIQUE(case_id, facility_id)
);

-- 4. Create placement_case_messages table (timeline/updates)
CREATE TABLE IF NOT EXISTS public.placement_case_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.placement_cases(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  message_type text NOT NULL DEFAULT 'status_update', -- status_update, admin_note, user_message, provider_update, document_request
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id)
);

-- 5. Create placement_case_documents table (document checklist)
CREATE TABLE IF NOT EXISTS public.placement_case_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.placement_cases(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  document_type text NOT NULL, -- insurance_card, id, medical_records, etc.
  document_name text,
  status text NOT NULL DEFAULT 'requested', -- requested, uploaded, verified
  file_url text,
  uploaded_at timestamp with time zone,
  verified_at timestamp with time zone,
  verified_by uuid REFERENCES auth.users(id)
);

-- 6. Create placement_agreements table
CREATE TABLE IF NOT EXISTS public.placement_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.placement_cases(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  provider_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  agreement_type text NOT NULL, -- commission, flat_fee
  commission_percent numeric(5,2),
  flat_fee_cents integer,
  
  status text NOT NULL DEFAULT 'draft', -- draft, sent, signed, void
  sent_at timestamp with time zone,
  signed_at timestamp with time zone,
  signature_name text,
  signature_ip text,
  document_url text,
  
  UNIQUE(case_id, facility_id)
);

-- 7. Create placement_invoices table
CREATE TABLE IF NOT EXISTS public.placement_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.placement_cases(id) ON DELETE CASCADE,
  agreement_id uuid NOT NULL REFERENCES public.placement_agreements(id),
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, paid, cancelled
  
  stripe_invoice_id text,
  stripe_payment_link text,
  
  sent_at timestamp with time zone,
  paid_at timestamp with time zone,
  receipt_url text,
  manual_payment boolean DEFAULT false,
  notes text
);

-- Enable RLS on all new tables
ALTER TABLE public.placement_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_case_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_invoices ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- placement_cases policies
CREATE POLICY "Users can view their own cases" ON public.placement_cases
  FOR SELECT USING (
    seeker_user_id = auth.uid() OR 
    seeker_email = (auth.jwt() ->> 'email')
  );

CREATE POLICY "Anyone can submit placement cases" ON public.placement_cases
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own pending cases" ON public.placement_cases
  FOR UPDATE USING (
    (seeker_user_id = auth.uid() OR seeker_email = (auth.jwt() ->> 'email'))
    AND status = 'new'
  );

CREATE POLICY "Admins can view all cases" ON public.placement_cases
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all cases" ON public.placement_cases
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage cases" ON public.placement_cases
  FOR ALL USING (true) WITH CHECK (true);

-- placement_case_providers policies
CREATE POLICY "Providers can view introductions to their facilities" ON public.placement_case_providers
  FOR SELECT USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can update their introduction responses" ON public.placement_case_providers
  FOR UPDATE USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all introductions" ON public.placement_case_providers
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage introductions" ON public.placement_case_providers
  FOR ALL USING (true) WITH CHECK (true);

-- placement_case_messages policies
CREATE POLICY "Users can view non-internal messages on their cases" ON public.placement_case_messages
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM placement_cases 
      WHERE seeker_user_id = auth.uid() OR seeker_email = (auth.jwt() ->> 'email')
    ) AND is_internal = false
  );

CREATE POLICY "Users can insert messages on their cases" ON public.placement_case_messages
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT id FROM placement_cases 
      WHERE seeker_user_id = auth.uid() OR seeker_email = (auth.jwt() ->> 'email')
    ) AND is_internal = false
  );

CREATE POLICY "Providers can view messages on cases they're introduced to" ON public.placement_case_messages
  FOR SELECT USING (
    case_id IN (
      SELECT case_id FROM placement_case_providers 
      WHERE facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
      AND provider_response = 'interested'
    ) AND is_internal = false
  );

CREATE POLICY "Admins can manage all messages" ON public.placement_case_messages
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage messages" ON public.placement_case_messages
  FOR ALL USING (true) WITH CHECK (true);

-- placement_case_documents policies
CREATE POLICY "Users can view documents on their cases" ON public.placement_case_documents
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM placement_cases 
      WHERE seeker_user_id = auth.uid() OR seeker_email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Users can upload documents to their cases" ON public.placement_case_documents
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT id FROM placement_cases 
      WHERE seeker_user_id = auth.uid() OR seeker_email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Users can update their documents" ON public.placement_case_documents
  FOR UPDATE USING (
    case_id IN (
      SELECT id FROM placement_cases 
      WHERE seeker_user_id = auth.uid() OR seeker_email = (auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can manage all documents" ON public.placement_case_documents
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage documents" ON public.placement_case_documents
  FOR ALL USING (true) WITH CHECK (true);

-- placement_agreements policies
CREATE POLICY "Providers can view agreements for their facilities" ON public.placement_agreements
  FOR SELECT USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can sign agreements for their facilities" ON public.placement_agreements
  FOR UPDATE USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
    AND status = 'sent'
  );

CREATE POLICY "Admins can manage all agreements" ON public.placement_agreements
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage agreements" ON public.placement_agreements
  FOR ALL USING (true) WITH CHECK (true);

-- placement_invoices policies
CREATE POLICY "Providers can view invoices for their facilities" ON public.placement_invoices
  FOR SELECT USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all invoices" ON public.placement_invoices
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage invoices" ON public.placement_invoices
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_placement_cases_status ON public.placement_cases(status);
CREATE INDEX IF NOT EXISTS idx_placement_cases_seeker_user_id ON public.placement_cases(seeker_user_id);
CREATE INDEX IF NOT EXISTS idx_placement_cases_seeker_email ON public.placement_cases(seeker_email);
CREATE INDEX IF NOT EXISTS idx_placement_cases_assigned_to ON public.placement_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_placement_case_providers_case_id ON public.placement_case_providers(case_id);
CREATE INDEX IF NOT EXISTS idx_placement_case_providers_facility_id ON public.placement_case_providers(facility_id);
CREATE INDEX IF NOT EXISTS idx_placement_case_messages_case_id ON public.placement_case_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_placement_case_documents_case_id ON public.placement_case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_facilities_concierge_opted_in ON public.facilities(concierge_network_opted_in) WHERE concierge_network_opted_in = true;

-- =============================================
-- DEFAULT PLATFORM SETTINGS FOR CONCIERGE
-- =============================================
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('default_commission_percent', '15', 'Default commission percentage for placement cases'),
  ('default_flat_fee_cents', '250000', 'Default flat fee in cents ($2,500) for placement cases')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_placement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_placement_cases_updated_at
  BEFORE UPDATE ON public.placement_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_placement_updated_at();

CREATE TRIGGER update_placement_agreements_updated_at
  BEFORE UPDATE ON public.placement_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_placement_updated_at();

CREATE TRIGGER update_placement_invoices_updated_at
  BEFORE UPDATE ON public.placement_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_placement_updated_at();