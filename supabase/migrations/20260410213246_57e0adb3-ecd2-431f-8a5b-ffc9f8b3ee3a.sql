
-- Seeker onboarding drip tracking (mirrors provider_onboarding_drip)
CREATE TABLE public.seeker_onboarding_drip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  last_email_sent_at timestamp with time zone,
  completed boolean NOT NULL DEFAULT false,
  opted_out boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.seeker_onboarding_drip ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage seeker drip" ON public.seeker_onboarding_drip
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own drip" ON public.seeker_onboarding_drip
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_seeker_drip_updated_at
  BEFORE UPDATE ON public.seeker_onboarding_drip
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seeker facility alerts tracking
CREATE TABLE public.seeker_facility_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, facility_id)
);

ALTER TABLE public.seeker_facility_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage facility alerts" ON public.seeker_facility_alerts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own alerts" ON public.seeker_facility_alerts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
