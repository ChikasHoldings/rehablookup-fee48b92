
-- 1. Add unique constraint on placement_invoices to prevent duplicates at DB level
-- First check if it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'placement_invoices_inquiry_facility_unique'
  ) THEN
    ALTER TABLE public.placement_invoices
      ADD CONSTRAINT placement_invoices_inquiry_facility_unique
      UNIQUE (inquiry_id, facility_id);
  END IF;
END $$;

-- 2. Trigger: prevent creating invoices for non-placed inquiries
CREATE OR REPLACE FUNCTION public.validate_placement_invoice()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  -- Look up the inquiry status
  SELECT status INTO v_status
  FROM public.concierge_inquiries
  WHERE id = NEW.inquiry_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Inquiry % not found', NEW.inquiry_id;
  END IF;

  -- Only allow invoices for placed cases (or cases being placed in the same transaction)
  IF v_status NOT IN ('placed', 'in_contact', 'introductions_sent', 'matched') THEN
    RAISE EXCEPTION 'Cannot create invoice: inquiry % is in status %. Must be placed or in active placement flow.', NEW.inquiry_id, v_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_placement_invoice_trigger ON public.placement_invoices;
CREATE TRIGGER validate_placement_invoice_trigger
  BEFORE INSERT ON public.placement_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_placement_invoice();

-- 3. Function to auto-create advisor earnings on placement confirmation
CREATE OR REPLACE FUNCTION public.create_advisor_earning_on_placement()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_advisor_id uuid;
  v_commission_rate integer;
  v_fee_cents integer;
  v_commission_cents integer;
BEGIN
  -- Only fire when status transitions to 'placed'
  IF NEW.status = 'placed' AND (OLD.status IS DISTINCT FROM 'placed') THEN
    v_advisor_id := NEW.assigned_advisor_id;
    
    -- Skip if no advisor assigned
    IF v_advisor_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get advisor's commission rate (default 10%)
    SELECT COALESCE(commission_rate, 10) INTO v_commission_rate
    FROM public.admin_user_profiles
    WHERE user_id = v_advisor_id;

    IF v_commission_rate IS NULL THEN
      v_commission_rate := 10;
    END IF;

    -- Use provider_fee_cents or default domestic fee
    v_fee_cents := COALESCE(NEW.provider_fee_cents, 100000);
    v_commission_cents := (v_fee_cents * v_commission_rate) / 100;

    -- Insert advisor earning (idempotent - skip if exists)
    INSERT INTO public.advisor_earnings (
      advisor_id, inquiry_id, placement_fee_cents, commission_rate, commission_cents, status
    ) VALUES (
      v_advisor_id, NEW.id, v_fee_cents, v_commission_rate, v_commission_cents, 'pending'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_advisor_earning_trigger ON public.concierge_inquiries;
CREATE TRIGGER create_advisor_earning_trigger
  AFTER UPDATE ON public.concierge_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.create_advisor_earning_on_placement();
