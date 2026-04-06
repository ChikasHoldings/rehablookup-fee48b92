
CREATE OR REPLACE FUNCTION public.get_facility_leads_count(p_facility_id uuid)
RETURNS TABLE(total_count bigint, monthly_qualified_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
  v_monthly bigint;
  v_start_of_month timestamptz;
BEGIN
  -- Verify caller owns this facility
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities 
    WHERE id = p_facility_id AND user_id = auth.uid()
  ) AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  v_start_of_month := date_trunc('month', now());

  SELECT COUNT(*) INTO v_total
  FROM public.leads
  WHERE facility_id = p_facility_id;

  SELECT COUNT(*) INTO v_monthly
  FROM public.leads
  WHERE facility_id = p_facility_id
    AND qualified = true
    AND created_at >= v_start_of_month;

  RETURN QUERY SELECT v_total, v_monthly;
END;
$$;
