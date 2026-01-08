-- =============================================
-- PHASE 1: NEW MONETIZATION TABLES
-- =============================================

-- 1. Lead Unlocks - Track which providers have unlocked which leads
CREATE TABLE public.lead_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  unlock_price_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  payment_method text NOT NULL DEFAULT 'credits', -- 'credits' or 'stripe'
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lead_id, facility_id)
);

-- 2. Provider Credits - Credit balance for providers
CREATE TABLE public.provider_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL UNIQUE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Credit Transactions - Credit purchase/usage history
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL, -- Positive = purchase, negative = usage
  transaction_type text NOT NULL, -- 'purchase', 'unlock', 'refund', 'bonus'
  reference_id uuid, -- lead_unlock_id or other reference
  stripe_payment_intent_id text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Pro Subscriptions - Pro visibility upgrade tracking
CREATE TABLE public.pro_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'inactive', -- 'active', 'canceled', 'past_due', 'inactive'
  unlock_discount_percent integer NOT NULL DEFAULT 20,
  price_cents integer NOT NULL DEFAULT 9900, -- $99/month default
  started_at timestamp with time zone,
  current_period_end timestamp with time zone,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(facility_id)
);

-- 5. Concierge Inquiries - Paid user intake for matching service
CREATE TABLE public.concierge_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- User info
  user_name text NOT NULL,
  user_email text NOT NULL,
  user_phone text NOT NULL,
  -- Intake data (flexible JSON for full form)
  intake_data jsonb NOT NULL DEFAULT '{}',
  -- Location preferences
  preferred_state text,
  preferred_city text,
  -- Payment
  payment_status text NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  payment_amount_cents integer NOT NULL DEFAULT 4900, -- $49 default
  stripe_payment_intent_id text,
  -- Matching
  matched_facility_ids uuid[] DEFAULT '{}',
  match_count integer DEFAULT 0,
  -- Status workflow
  status text NOT NULL DEFAULT 'new', -- 'new', 'paid', 'matching', 'matched', 'engaged', 'closed'
  admin_notes text,
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  matched_at timestamp with time zone,
  closed_at timestamp with time zone
);

-- 6. Concierge Engagements - Provider-to-seeker engagement tracking
CREATE TABLE public.concierge_engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concierge_inquiry_id uuid NOT NULL REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  -- Payment for unlock
  unlock_price_cents integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  payment_method text NOT NULL DEFAULT 'credits',
  -- Status
  status text NOT NULL DEFAULT 'engaged', -- 'engaged', 'contacted', 'admitted', 'declined'
  outcome_notes text,
  -- Timestamps
  engaged_at timestamp with time zone NOT NULL DEFAULT now(),
  contacted_at timestamp with time zone,
  outcome_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(concierge_inquiry_id, facility_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_lead_unlocks_lead_id ON public.lead_unlocks(lead_id);
CREATE INDEX idx_lead_unlocks_facility_id ON public.lead_unlocks(facility_id);
CREATE INDEX idx_lead_unlocks_provider_id ON public.lead_unlocks(provider_id);

CREATE INDEX idx_provider_credits_provider_id ON public.provider_credits(provider_id);
CREATE INDEX idx_provider_credits_facility_id ON public.provider_credits(facility_id);

CREATE INDEX idx_credit_transactions_provider_id ON public.credit_transactions(provider_id);
CREATE INDEX idx_credit_transactions_facility_id ON public.credit_transactions(facility_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

CREATE INDEX idx_pro_subscriptions_provider_id ON public.pro_subscriptions(provider_id);
CREATE INDEX idx_pro_subscriptions_status ON public.pro_subscriptions(status);

CREATE INDEX idx_concierge_inquiries_status ON public.concierge_inquiries(status);
CREATE INDEX idx_concierge_inquiries_payment_status ON public.concierge_inquiries(payment_status);
CREATE INDEX idx_concierge_inquiries_created_at ON public.concierge_inquiries(created_at DESC);

CREATE INDEX idx_concierge_engagements_inquiry_id ON public.concierge_engagements(concierge_inquiry_id);
CREATE INDEX idx_concierge_engagements_facility_id ON public.concierge_engagements(facility_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Lead Unlocks RLS
ALTER TABLE public.lead_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own unlocks"
  ON public.lead_unlocks FOR SELECT
  USING (facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert unlocks"
  ON public.lead_unlocks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all unlocks"
  ON public.lead_unlocks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Provider Credits RLS
ALTER TABLE public.provider_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own credits"
  ON public.provider_credits FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Service role can manage credits"
  ON public.provider_credits FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all credits"
  ON public.provider_credits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Credit Transactions RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own transactions"
  ON public.credit_transactions FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all transactions"
  ON public.credit_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Pro Subscriptions RLS
ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own pro subscription"
  ON public.pro_subscriptions FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "Service role can manage pro subscriptions"
  ON public.pro_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all pro subscriptions"
  ON public.pro_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Concierge Inquiries RLS
ALTER TABLE public.concierge_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage concierge inquiries"
  ON public.concierge_inquiries FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all concierge inquiries"
  ON public.concierge_inquiries FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update concierge inquiries"
  ON public.concierge_inquiries FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Concierge Engagements RLS
ALTER TABLE public.concierge_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own engagements"
  ON public.concierge_engagements FOR SELECT
  USING (facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage engagements"
  ON public.concierge_engagements FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all engagements"
  ON public.concierge_engagements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if a lead is unlocked by a facility
CREATE OR REPLACE FUNCTION public.is_lead_unlocked(p_lead_id uuid, p_facility_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lead_unlocks
    WHERE lead_id = p_lead_id AND facility_id = p_facility_id
  );
END;
$$;

-- Function to get provider's current credit balance
CREATE OR REPLACE FUNCTION public.get_provider_credit_balance(p_provider_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT balance_cents INTO v_balance
  FROM provider_credits
  WHERE provider_id = p_provider_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$;

-- Function to check if provider has active Pro subscription
CREATE OR REPLACE FUNCTION public.has_active_pro(p_facility_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pro_subscriptions
    WHERE facility_id = p_facility_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$;

-- Function to get Pro discount percent for a facility
CREATE OR REPLACE FUNCTION public.get_pro_discount(p_facility_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discount integer;
BEGIN
  SELECT unlock_discount_percent INTO v_discount
  FROM pro_subscriptions
  WHERE facility_id = p_facility_id
  AND status = 'active'
  AND (current_period_end IS NULL OR current_period_end > now());
  
  RETURN COALESCE(v_discount, 0);
END;
$$;

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_provider_credits_updated_at
  BEFORE UPDATE ON public.provider_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pro_subscriptions_updated_at
  BEFORE UPDATE ON public.pro_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_concierge_inquiries_updated_at
  BEFORE UPDATE ON public.concierge_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();