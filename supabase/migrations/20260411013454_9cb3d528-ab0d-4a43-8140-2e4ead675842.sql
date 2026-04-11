
-- Create admin_trusted_devices table
CREATE TABLE public.admin_trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token_hash TEXT NOT NULL,
  device_label TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  ip_range TEXT,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, device_token_hash)
);

-- Indexes
CREATE INDEX idx_trusted_devices_user ON public.admin_trusted_devices(user_id) WHERE is_active = true;
CREATE INDEX idx_trusted_devices_token ON public.admin_trusted_devices(device_token_hash) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;

-- Admins can view their own devices
CREATE POLICY "Users can view own trusted devices"
  ON public.admin_trusted_devices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can insert their own devices
CREATE POLICY "Users can register trusted devices"
  ON public.admin_trusted_devices FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can update their own devices
CREATE POLICY "Users can update own trusted devices"
  ON public.admin_trusted_devices FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins can delete (revoke) their own devices
CREATE POLICY "Users can revoke own trusted devices"
  ON public.admin_trusted_devices FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Function: Assess login risk
CREATE OR REPLACE FUNCTION public.assess_login_risk(
  p_user_id UUID,
  p_device_token_hash TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_risk_score INTEGER := 0;
  v_risk_factors TEXT[] := '{}';
  v_is_trusted_device BOOLEAN := false;
  v_is_known_ip BOOLEAN := false;
  v_failed_attempts INTEGER := 0;
  v_threshold INTEGER := 50;
  v_is_super_admin BOOLEAN := false;
BEGIN
  -- Check if super admin (stricter threshold)
  v_is_super_admin := is_super_admin(p_user_id);
  IF v_is_super_admin THEN
    v_threshold := 30;
  END IF;

  -- Check trusted device
  IF p_device_token_hash IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM admin_trusted_devices
      WHERE user_id = p_user_id
        AND device_token_hash = p_device_token_hash
        AND is_active = true
        AND expires_at > now()
        AND (p_browser IS NULL OR browser = p_browser)
        AND (p_os IS NULL OR os = p_os)
    ) INTO v_is_trusted_device;
  END IF;

  -- If device is trusted and matches, low risk
  IF v_is_trusted_device THEN
    -- Refresh device expiry
    UPDATE admin_trusted_devices 
    SET last_used_at = now(), expires_at = now() + interval '30 days'
    WHERE user_id = p_user_id AND device_token_hash = p_device_token_hash AND is_active = true;

    RETURN jsonb_build_object(
      'risk_score', 0,
      'requires_2fa', false,
      'risk_factors', '[]'::jsonb,
      'is_trusted_device', true,
      'threshold', v_threshold
    );
  END IF;

  -- New device: +40
  v_risk_score := v_risk_score + 40;
  v_risk_factors := array_append(v_risk_factors, 'new_device');

  -- Check if IP is known from previous logins
  IF p_ip_address IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM admin_trusted_devices
      WHERE user_id = p_user_id AND ip_address = p_ip_address AND is_active = true
    ) INTO v_is_known_ip;

    IF NOT v_is_known_ip THEN
      v_risk_score := v_risk_score + 30;
      v_risk_factors := array_append(v_risk_factors, 'new_ip');
    END IF;
  ELSE
    v_risk_score := v_risk_score + 30;
    v_risk_factors := array_append(v_risk_factors, 'unknown_ip');
  END IF;

  -- Check recent failed login attempts (last 15 min)
  SELECT COUNT(*) INTO v_failed_attempts
  FROM rate_limit_log
  WHERE identifier IN (
    SELECT au.email FROM auth.users au WHERE au.id = p_user_id
  )
  AND action_type = 'admin_login'
  AND success = false
  AND created_at > now() - interval '15 minutes';

  IF v_failed_attempts >= 2 THEN
    v_risk_score := v_risk_score + 20;
    v_risk_factors := array_append(v_risk_factors, 'recent_failed_attempts');
  END IF;

  RETURN jsonb_build_object(
    'risk_score', v_risk_score,
    'requires_2fa', v_risk_score >= v_threshold,
    'risk_factors', to_jsonb(v_risk_factors),
    'is_trusted_device', false,
    'threshold', v_threshold,
    'failed_attempts', v_failed_attempts
  );
END;
$$;

-- Function: Register trusted device (after successful 2FA)
CREATE OR REPLACE FUNCTION public.register_trusted_device(
  p_user_id UUID,
  p_device_token_hash TEXT,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_device_label TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_device_id UUID;
  v_count INTEGER;
  v_ip_range TEXT;
BEGIN
  -- Only allow user to register for themselves
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Compute IP range (first 3 octets for IPv4)
  IF p_ip_address IS NOT NULL AND p_ip_address ~ '^\d+\.\d+\.\d+\.\d+$' THEN
    v_ip_range := regexp_replace(p_ip_address, '\.\d+$', '.0/24');
  ELSE
    v_ip_range := p_ip_address;
  END IF;

  -- Limit to 10 devices per user - deactivate oldest if exceeded
  SELECT COUNT(*) INTO v_count FROM admin_trusted_devices
  WHERE user_id = p_user_id AND is_active = true;

  IF v_count >= 10 THEN
    UPDATE admin_trusted_devices SET is_active = false
    WHERE id = (
      SELECT id FROM admin_trusted_devices
      WHERE user_id = p_user_id AND is_active = true
      ORDER BY last_used_at ASC LIMIT 1
    );
  END IF;

  -- Upsert device
  INSERT INTO admin_trusted_devices (user_id, device_token_hash, browser, os, ip_address, ip_range, device_label)
  VALUES (p_user_id, p_device_token_hash, p_browser, p_os, p_ip_address, v_ip_range, p_device_label)
  ON CONFLICT (user_id, device_token_hash) 
  DO UPDATE SET 
    last_used_at = now(),
    expires_at = now() + interval '30 days',
    is_active = true,
    browser = EXCLUDED.browser,
    os = EXCLUDED.os,
    ip_address = EXCLUDED.ip_address,
    ip_range = EXCLUDED.ip_range
  RETURNING id INTO v_device_id;

  RETURN v_device_id;
END;
$$;
