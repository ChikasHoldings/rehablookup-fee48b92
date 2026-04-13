
CREATE OR REPLACE FUNCTION public.increment_provider_credits(
  p_provider_id uuid,
  p_facility_id uuid,
  p_amount_cents integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Validate inputs
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  IF p_amount_cents > 200000 THEN
    RAISE EXCEPTION 'Amount exceeds maximum allowed';
  END IF;

  -- Atomic upsert with increment — no read-then-write race condition
  INSERT INTO public.provider_credits (provider_id, facility_id, balance_cents, updated_at)
  VALUES (p_provider_id, p_facility_id, p_amount_cents, now())
  ON CONFLICT (provider_id)
  DO UPDATE SET
    balance_cents = provider_credits.balance_cents + EXCLUDED.balance_cents,
    updated_at = now()
  RETURNING balance_cents INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;
