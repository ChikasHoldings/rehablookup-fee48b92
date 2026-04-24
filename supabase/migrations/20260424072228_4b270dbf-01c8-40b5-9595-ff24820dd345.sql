-- 1. badge_impressions: drop unrestricted public INSERT (serve-badge edge fn uses service role)
DROP POLICY IF EXISTS "Public can insert badge impressions" ON public.badge_impressions;

-- 2. request_help_analytics: replace WITH CHECK (true) with constrained policy + event_type whitelist
DROP POLICY IF EXISTS "Public can insert analytics events" ON public.request_help_analytics;

ALTER TABLE public.request_help_analytics
  DROP CONSTRAINT IF EXISTS request_help_analytics_event_type_check,
  DROP CONSTRAINT IF EXISTS request_help_analytics_source_check;

ALTER TABLE public.request_help_analytics
  ADD CONSTRAINT request_help_analytics_event_type_check
    CHECK (event_type IN (
      'page_view','step_view','step_complete',
      'form_start','form_step','form_submit','form_submit_start','form_submit_success','form_submit_error',
      'form_submission','form_abandon',
      'modal_open','cta_click','video_play','nearby_facility_click',
      'verification_code_sent','email_verified',
      'request_help_conversion','exit_intent','scroll_milestone'
    ));

CREATE POLICY "Anonymous telemetry insert (constrained)"
ON public.request_help_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND source IS NOT NULL
  AND length(event_type) <= 64
  AND length(source) <= 128
  AND (step_number IS NULL OR (step_number BETWEEN 0 AND 50))
);
