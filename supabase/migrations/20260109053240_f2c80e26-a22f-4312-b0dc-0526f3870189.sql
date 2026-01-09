-- Phase 6: Dual Confirmation, Invoicing, and Charging

-- Add fee tracking columns to concierge_inquiries
ALTER TABLE public.concierge_inquiries
ADD COLUMN IF NOT EXISTS provider_fee_type text DEFAULT 'flat_fee',
ADD COLUMN IF NOT EXISTS provider_fee_cents integer,
ADD COLUMN IF NOT EXISTS provider_fee_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS provider_invoice_id uuid;

-- Add admin override fields to placement_invoices
ALTER TABLE public.placement_invoices
ADD COLUMN IF NOT EXISTS fee_type text DEFAULT 'flat_fee',
ADD COLUMN IF NOT EXISTS discount_percent numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason text,
ADD COLUMN IF NOT EXISTS waived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS waived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS waived_by uuid,
ADD COLUMN IF NOT EXISTS waive_reason text,
ADD COLUMN IF NOT EXISTS override_amount_cents integer,
ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS overridden_by uuid,
ADD COLUMN IF NOT EXISTS override_reason text,
ADD COLUMN IF NOT EXISTS inquiry_id uuid REFERENCES public.concierge_inquiries(id),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Make agreement_id nullable since we may not have agreements for all invoices
ALTER TABLE public.placement_invoices ALTER COLUMN agreement_id DROP NOT NULL;

-- Update default due_at to Net-14
ALTER TABLE public.placement_invoices ALTER COLUMN due_at SET DEFAULT (now() + interval '14 days');

-- Create audit table for fee events
CREATE TABLE IF NOT EXISTS public.placement_fee_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.placement_invoices(id),
  inquiry_id uuid REFERENCES public.concierge_inquiries(id),
  facility_id uuid REFERENCES public.facilities(id),
  event_type text NOT NULL,
  actor_id uuid,
  actor_type text,
  amount_cents integer,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Add comment for event_type values
COMMENT ON COLUMN public.placement_fee_events.event_type IS 'Values: created, charged, failed, waived, overridden, refunded, reminder_sent, retry_attempted';

-- Enable RLS on placement_fee_events
ALTER TABLE public.placement_fee_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for placement_fee_events
CREATE POLICY "Admins can view all fee events"
  ON public.placement_fee_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_user_profiles
    WHERE user_id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "Providers can view own fee events"
  ON public.placement_fee_events FOR SELECT
  USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "System can insert fee events"
  ON public.placement_fee_events FOR INSERT
  WITH CHECK (true);

-- Add foreign key constraint for provider_invoice_id
ALTER TABLE public.concierge_inquiries
ADD CONSTRAINT concierge_inquiries_provider_invoice_id_fkey 
FOREIGN KEY (provider_invoice_id) REFERENCES public.placement_invoices(id);