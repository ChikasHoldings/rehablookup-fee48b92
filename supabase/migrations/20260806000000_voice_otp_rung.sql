-- Activate the Voice OTP rung of the ownership ladder.
--
-- Spec ladder: voice → SMS → domain email → document → help-me.
-- The SMS/email/doc rungs were already wired via the bridge migration
-- (20260805000000). Voice was the missing top rung.
--
-- Implementation: reuse the existing phone_verification_codes table —
-- voice OTP and SMS OTP both target the authoritative on-file phone
-- (HARD RULE: never a claimant-typed number, per spec). The only
-- difference is delivery channel (Twilio Voice API instead of SMS) and
-- score weight (voice = 90, SMS = 85). The bridge trigger inspects the
-- `purpose` column on phone_verification_codes to distinguish:
--   'claim_verification'       → sms_otp signal at score 85
--   'claim_verification_voice' → voice_otp signal at score 90
--
-- No new tables. No new columns. Just a trigger body update so the
-- engine records the right signal_type when an OTP is verified.

CREATE OR REPLACE FUNCTION public.phone_otp_bridge_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
  v_signal_type text;
  v_score numeric;
  v_rule text;
  v_detail text;
BEGIN
  IF NOT (OLD.verified = false AND NEW.verified = true) THEN
    RETURN NEW;
  END IF;
  IF NEW.claim_request_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_attempt_id := public._active_attempt_for_claim(NEW.claim_request_id);
  IF v_attempt_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Differentiate by purpose. Voice OTP is the highest-confidence
  -- ownership signal: the claimant heard a code spoken on the
  -- authoritative phone number, dialed from Twilio, then entered it
  -- in the wizard. That's significantly harder to fake than an SMS
  -- intercept.
  IF NEW.purpose = 'claim_verification_voice' THEN
    v_signal_type := 'voice_otp';
    v_score := 90.0;
    v_rule := 'voice_otp_cleared';
    v_detail := 'Voice OTP cleared on authoritative facility phone (on file)';
  ELSE
    v_signal_type := 'sms_otp';
    v_score := 85.0;
    v_rule := 'sms_otp_cleared';
    v_detail := 'SMS OTP cleared on authoritative facility phone (on file)';
  END IF;

  PERFORM public.record_ownership_signal(
    v_attempt_id, v_signal_type, true, v_score,
    jsonb_build_array(jsonb_build_object('rule', v_rule, 'detail', v_detail)),
    jsonb_build_object(
      'phone_verification_code_id', NEW.id,
      'phone', NEW.phone,
      'purpose', NEW.purpose
    )
  );
  RETURN NEW;
END;
$$;
