
CREATE TABLE public.provider_auto_reload_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  threshold_cents INTEGER NOT NULL DEFAULT 5000,
  reload_amount_cents INTEGER NOT NULL DEFAULT 20000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(provider_id)
);

ALTER TABLE public.provider_auto_reload_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own auto-reload settings"
  ON public.provider_auto_reload_settings
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert own auto-reload settings"
  ON public.provider_auto_reload_settings
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own auto-reload settings"
  ON public.provider_auto_reload_settings
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());
