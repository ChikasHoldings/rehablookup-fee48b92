
-- Add lead scoring and dynamic pricing columns to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS lead_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_score_label text DEFAULT 'Low',
  ADD COLUMN IF NOT EXISTS credit_cost integer DEFAULT 2500;

-- Create index for priority inbox sorting
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads (lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_credit_cost ON public.leads (credit_cost);

-- Function to calculate lead score (0-100)
CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_score integer := 0;
  v_weights jsonb;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Fetch configurable weights from platform_settings
  SELECT setting_value INTO v_weights
  FROM public.platform_settings
  WHERE setting_key = 'lead_scoring_weights';

  -- Default weights if not configured
  IF v_weights IS NULL THEN
    v_weights := '{
      "urgency_urgent": 30,
      "urgency_this_week": 20,
      "urgency_this_month": 10,
      "care_memory": 15,
      "care_detox": 15,
      "care_residential": 12,
      "care_php": 10,
      "care_iop": 8,
      "care_outpatient": 5,
      "inquiry_callback": 15,
      "inquiry_info": 8,
      "has_insurance": 10,
      "has_message": 5,
      "message_long": 5,
      "readiness_high": 15,
      "readiness_medium": 8,
      "has_budget": 5,
      "has_dual_diagnosis": 5
    }'::jsonb;
  END IF;

  -- Urgency scoring
  IF v_lead.urgency = 'Urgent' OR v_lead.urgency = 'Immediately' THEN
    v_score := v_score + COALESCE((v_weights->>'urgency_urgent')::int, 30);
  ELSIF v_lead.urgency = 'This week' THEN
    v_score := v_score + COALESCE((v_weights->>'urgency_this_week')::int, 20);
  ELSIF v_lead.urgency = 'This month' THEN
    v_score := v_score + COALESCE((v_weights->>'urgency_this_month')::int, 10);
  END IF;

  -- Care type scoring (higher value = higher score)
  IF v_lead.level_of_care ILIKE '%memory%' THEN
    v_score := v_score + COALESCE((v_weights->>'care_memory')::int, 15);
  ELSIF v_lead.level_of_care ILIKE '%detox%' THEN
    v_score := v_score + COALESCE((v_weights->>'care_detox')::int, 15);
  ELSIF v_lead.level_of_care ILIKE '%residential%' OR v_lead.level_of_care ILIKE '%inpatient%' THEN
    v_score := v_score + COALESCE((v_weights->>'care_residential')::int, 12);
  ELSIF v_lead.level_of_care ILIKE '%php%' OR v_lead.level_of_care ILIKE '%partial%' THEN
    v_score := v_score + COALESCE((v_weights->>'care_php')::int, 10);
  ELSIF v_lead.level_of_care ILIKE '%iop%' OR v_lead.level_of_care ILIKE '%intensive%' THEN
    v_score := v_score + COALESCE((v_weights->>'care_iop')::int, 8);
  ELSIF v_lead.level_of_care ILIKE '%outpatient%' THEN
    v_score := v_score + COALESCE((v_weights->>'care_outpatient')::int, 5);
  END IF;

  -- Inquiry type scoring
  IF v_lead.inquiry_type = 'request_callback' THEN
    v_score := v_score + COALESCE((v_weights->>'inquiry_callback')::int, 15);
  ELSIF v_lead.inquiry_type = 'request_info' THEN
    v_score := v_score + COALESCE((v_weights->>'inquiry_info')::int, 8);
  END IF;

  -- Insurance scoring
  IF v_lead.insurance_type IS NOT NULL AND v_lead.insurance_type != '' AND v_lead.insurance_type != 'None' THEN
    v_score := v_score + COALESCE((v_weights->>'has_insurance')::int, 10);
  END IF;

  -- Message quality
  IF v_lead.message IS NOT NULL AND length(v_lead.message) > 0 THEN
    v_score := v_score + COALESCE((v_weights->>'has_message')::int, 5);
    IF length(v_lead.message) > 100 THEN
      v_score := v_score + COALESCE((v_weights->>'message_long')::int, 5);
    END IF;
  END IF;

  -- Readiness level
  IF v_lead.readiness_level = 'high' OR v_lead.readiness_level = 'ready' THEN
    v_score := v_score + COALESCE((v_weights->>'readiness_high')::int, 15);
  ELSIF v_lead.readiness_level = 'medium' OR v_lead.readiness_level = 'considering' THEN
    v_score := v_score + COALESCE((v_weights->>'readiness_medium')::int, 8);
  END IF;

  -- Budget preference
  IF v_lead.budget_preference IS NOT NULL AND v_lead.budget_preference != '' THEN
    v_score := v_score + COALESCE((v_weights->>'has_budget')::int, 5);
  END IF;

  -- Dual diagnosis
  IF v_lead.dual_diagnosis IS NOT NULL AND v_lead.dual_diagnosis != 'No' AND v_lead.dual_diagnosis != '' THEN
    v_score := v_score + COALESCE((v_weights->>'has_dual_diagnosis')::int, 5);
  END IF;

  -- Cap at 100
  IF v_score > 100 THEN v_score := 100; END IF;

  RETURN v_score;
END;
$$;

-- Function to calculate credit cost based on score and time
CREATE OR REPLACE FUNCTION public.calculate_lead_credit_cost(
  p_lead_id uuid,
  p_facility_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_score integer;
  v_base_cost integer;
  v_is_redistributed boolean := false;
  v_hours_old numeric;
  v_pricing jsonb;
  v_redist_price integer;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN 2500; END IF;

  v_score := COALESCE(v_lead.lead_score, calculate_lead_score(p_lead_id));

  -- Check if redistributed for this facility
  IF p_facility_id IS NOT NULL AND v_lead.original_facility_id IS NOT NULL 
     AND v_lead.original_facility_id != p_facility_id THEN
    v_is_redistributed := true;
  END IF;

  -- Get pricing config
  SELECT setting_value INTO v_pricing
  FROM public.platform_settings
  WHERE setting_key = 'lead_credit_pricing';

  IF v_pricing IS NULL THEN
    v_pricing := '{
      "score_0_25_cents": 2500,
      "score_26_50_cents": 3900,
      "score_51_75_cents": 5900,
      "score_76_100_cents": 8900,
      "exclusive_multiplier": 1.0,
      "shared_discount_percent": 40,
      "time_decay_enabled": false,
      "time_decay_percent_per_hour": 0
    }'::jsonb;
  END IF;

  -- Redistributed leads get flat price
  SELECT setting_value->>'cents' INTO v_redist_price
  FROM public.platform_settings
  WHERE setting_key = 'redistributed_unlock_price';
  v_redist_price := COALESCE(v_redist_price::int, 1500);

  IF v_is_redistributed THEN
    RETURN v_redist_price;
  END IF;

  -- Score-based pricing tiers
  IF v_score <= 25 THEN
    v_base_cost := COALESCE((v_pricing->>'score_0_25_cents')::int, 2500);
  ELSIF v_score <= 50 THEN
    v_base_cost := COALESCE((v_pricing->>'score_26_50_cents')::int, 3900);
  ELSIF v_score <= 75 THEN
    v_base_cost := COALESCE((v_pricing->>'score_51_75_cents')::int, 5900);
  ELSE
    v_base_cost := COALESCE((v_pricing->>'score_76_100_cents')::int, 8900);
  END IF;

  -- Time-based decay (optional, configurable)
  IF COALESCE((v_pricing->>'time_decay_enabled')::boolean, false) THEN
    v_hours_old := EXTRACT(EPOCH FROM (now() - v_lead.created_at)) / 3600;
    IF v_hours_old > 0 THEN
      v_base_cost := GREATEST(
        v_base_cost - (v_base_cost * LEAST(v_hours_old, 24)::int * COALESCE((v_pricing->>'time_decay_percent_per_hour')::int, 0) / 100),
        COALESCE((v_pricing->>'score_0_25_cents')::int, 2500) -- never below lowest tier
      );
    END IF;
  END IF;

  -- Shared lead discount (if already shared/redistributed status)
  IF v_lead.redistribution_status = 'extended' THEN
    v_base_cost := v_base_cost - (v_base_cost * COALESCE((v_pricing->>'shared_discount_percent')::int, 40) / 100);
  END IF;

  RETURN GREATEST(v_base_cost, 500); -- Minimum $5
END;
$$;

-- Function to get the score label
CREATE OR REPLACE FUNCTION public.get_lead_score_label(p_score integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_score >= 75 THEN 'Urgent'
    WHEN p_score >= 50 THEN 'High'
    WHEN p_score >= 25 THEN 'Medium'
    ELSE 'Low'
  END;
$$;

-- Trigger to auto-calculate score and cost on lead insert/update
CREATE OR REPLACE FUNCTION public.trigger_calculate_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score integer;
BEGIN
  v_score := calculate_lead_score(NEW.id);
  NEW.lead_score := v_score;
  NEW.lead_score_label := get_lead_score_label(v_score);
  NEW.credit_cost := calculate_lead_credit_cost(NEW.id);
  RETURN NEW;
END;
$$;

-- Note: trigger must run BEFORE insert/update so it can modify NEW
CREATE TRIGGER trg_leads_calculate_score
  BEFORE INSERT OR UPDATE OF urgency, level_of_care, inquiry_type, insurance_type, message, readiness_level, budget_preference, dual_diagnosis
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_lead_score();

-- Backfill existing leads with scores
UPDATE public.leads 
SET 
  lead_score = public.calculate_lead_score(id),
  lead_score_label = public.get_lead_score_label(public.calculate_lead_score(id)),
  credit_cost = public.calculate_lead_credit_cost(id);
