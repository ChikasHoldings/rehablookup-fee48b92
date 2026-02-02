-- Create international_payments table for tracking payment records
CREATE TABLE public.international_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL DEFAULT 29900,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  client_name TEXT,
  client_country TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.international_payments ENABLE ROW LEVEL SECURITY;

-- Admin can view all payments
CREATE POLICY "Admins can view all international payments"
ON public.international_payments
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Users can view their own payments
CREATE POLICY "Users can view own international payments"
ON public.international_payments
FOR SELECT
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Service role can insert/update (for edge functions)
CREATE POLICY "Service role can manage international payments"
ON public.international_payments
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for lookups
CREATE INDEX idx_international_payments_stripe_session ON public.international_payments(stripe_checkout_session_id);
CREATE INDEX idx_international_payments_stripe_intent ON public.international_payments(stripe_payment_intent_id);
CREATE INDEX idx_international_payments_email ON public.international_payments(email);

-- Add trigger for updated_at
CREATE TRIGGER update_international_payments_updated_at
BEFORE UPDATE ON public.international_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();