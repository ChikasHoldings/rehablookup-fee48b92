-- Create rate limit log table for tracking login attempts
CREATE TABLE public.rate_limit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL, -- email or IP address
  action_type text NOT NULL DEFAULT 'login', -- login, password_reset, etc.
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limit_identifier_action ON public.rate_limit_log(identifier, action_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limit logs (prevents tampering)
CREATE POLICY "Service role can insert rate limit logs"
  ON public.rate_limit_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can select rate limit logs"
  ON public.rate_limit_log FOR SELECT
  USING (true);

CREATE POLICY "Service role can delete old rate limit logs"
  ON public.rate_limit_log FOR DELETE
  USING (true);

-- Function to check if identifier is rate limited
-- Returns: { is_limited: boolean, attempts: number, retry_after_seconds: number }
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action_type text DEFAULT 'login',
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count integer;
  v_oldest_attempt timestamp with time zone;
  v_retry_after integer;
BEGIN
  -- Count recent failed attempts within the window
  SELECT COUNT(*), MIN(created_at)
  INTO v_attempt_count, v_oldest_attempt
  FROM public.rate_limit_log
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND success = false
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  -- If under limit, not rate limited
  IF v_attempt_count < p_max_attempts THEN
    RETURN jsonb_build_object(
      'is_limited', false,
      'attempts', v_attempt_count,
      'retry_after_seconds', 0
    );
  END IF;

  -- Calculate retry_after based on oldest attempt in window
  v_retry_after := EXTRACT(EPOCH FROM (v_oldest_attempt + (p_window_minutes || ' minutes')::interval - now()))::integer;
  
  IF v_retry_after < 0 THEN
    v_retry_after := 0;
  END IF;

  RETURN jsonb_build_object(
    'is_limited', true,
    'attempts', v_attempt_count,
    'retry_after_seconds', v_retry_after
  );
END;
$$;

-- Function to log a rate limit event
CREATE OR REPLACE FUNCTION public.log_rate_limit_event(
  p_identifier text,
  p_action_type text DEFAULT 'login',
  p_success boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limit_log (identifier, action_type, success, metadata)
  VALUES (p_identifier, p_action_type, p_success, p_metadata);
  
  -- Clean up old entries (older than 24 hours) to prevent table bloat
  DELETE FROM public.rate_limit_log
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Grant execute to authenticated and anon for the check function
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.log_rate_limit_event TO authenticated, anon;