-- Create provider_payment_methods table
CREATE TABLE IF NOT EXISTS public.provider_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('card', 'ach')),
  stripe_payment_method_id text NOT NULL UNIQUE,
  stripe_customer_id text,
  last_four text NOT NULL,
  bank_name text,
  card_brand text,
  exp_month integer,
  exp_year integer,
  is_default boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add terms acceptance fields to facilities
ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS concierge_terms_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS concierge_terms_version text,
ADD COLUMN IF NOT EXISTS concierge_terms_accepted_by uuid;

-- Enable RLS
ALTER TABLE public.provider_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS policies for provider_payment_methods
CREATE POLICY "Providers can view own payment methods"
  ON public.provider_payment_methods
  FOR SELECT USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can insert own payment methods"
  ON public.provider_payment_methods
  FOR INSERT WITH CHECK (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can update own payment methods"
  ON public.provider_payment_methods
  FOR UPDATE USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can delete own payment methods"
  ON public.provider_payment_methods
  FOR DELETE USING (
    facility_id IN (SELECT id FROM facilities WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all payment methods"
  ON public.provider_payment_methods
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_payment_methods_facility 
  ON provider_payment_methods(facility_id);

CREATE INDEX IF NOT EXISTS idx_provider_payment_methods_default 
  ON provider_payment_methods(facility_id, is_default) 
  WHERE is_default = true;

-- Trigger for updated_at
CREATE TRIGGER update_provider_payment_methods_updated_at
  BEFORE UPDATE ON public.provider_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();