
CREATE TABLE public.provider_onboarding_drip (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL DEFAULT '',
  provider_email TEXT NOT NULL,
  day_number INTEGER NOT NULL DEFAULT 0,
  last_sent_day INTEGER NOT NULL DEFAULT 0,
  next_send_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '1 day',
  completed BOOLEAN NOT NULL DEFAULT false,
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.provider_onboarding_drip ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on drip"
  ON public.provider_onboarding_drip
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Providers can view own drip status"
  ON public.provider_onboarding_drip
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Providers can update own drip preferences"
  ON public.provider_onboarding_drip
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
