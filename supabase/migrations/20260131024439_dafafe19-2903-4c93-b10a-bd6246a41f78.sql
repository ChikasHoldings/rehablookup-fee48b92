-- Create table to track purchased additional listing slots
CREATE TABLE public.purchased_listing_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  price_cents INTEGER NOT NULL DEFAULT 4900,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.purchased_listing_slots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own purchased slots"
  ON public.purchased_listing_slots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchased slots"
  ON public.purchased_listing_slots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_purchased_listing_slots_user_id ON public.purchased_listing_slots(user_id);
CREATE INDEX idx_purchased_listing_slots_status ON public.purchased_listing_slots(status);

-- Function to count purchased slots for a user
CREATE OR REPLACE FUNCTION public.get_purchased_slot_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.purchased_listing_slots
  WHERE user_id = p_user_id AND status = 'completed';
$$;