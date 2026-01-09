-- Update default payment amount from 4900 to 2900 cents ($29)
ALTER TABLE public.concierge_inquiries 
ALTER COLUMN payment_amount_cents SET DEFAULT 2900;

-- Add new intake fields for enhanced concierge flow
ALTER TABLE public.concierge_inquiries 
ADD COLUMN IF NOT EXISTS age_range text,
ADD COLUMN IF NOT EXISTS relationship_to_decision_maker text DEFAULT 'self',
ADD COLUMN IF NOT EXISTS primary_concern text,
ADD COLUMN IF NOT EXISTS level_of_care text,
ADD COLUMN IF NOT EXISTS prior_treatment_history boolean,
ADD COLUMN IF NOT EXISTS prior_treatment_notes text,
ADD COLUMN IF NOT EXISTS co_occurring_concerns jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS desired_location_state text,
ADD COLUMN IF NOT EXISTS desired_location_city text,
ADD COLUMN IF NOT EXISTS desired_radius_miles integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS timeline_urgency text,
ADD COLUMN IF NOT EXISTS needs_transport_help boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS assessment_preference text,
ADD COLUMN IF NOT EXISTS payment_type text,
ADD COLUMN IF NOT EXISTS insurance_carrier text,
ADD COLUMN IF NOT EXISTS budget_range text,
ADD COLUMN IF NOT EXISTS willing_to_travel boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS decision_maker_name text,
ADD COLUMN IF NOT EXISTS decision_maker_phone text,
ADD COLUMN IF NOT EXISTS best_time_to_call text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS checkout_session_id text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS idempotency_key text,
ADD COLUMN IF NOT EXISTS intake_submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS concierge_inquiries_idempotency_key_idx 
ON public.concierge_inquiries(idempotency_key) WHERE idempotency_key IS NOT NULL;