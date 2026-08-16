-- =============================================================================
-- B2.2 — Remove the paid input from the operator-editable ranking weights.
--
-- PRODUCT CONTRACT
--   Organic directory ranking is neutral. It may reward evidence of listing
--   quality, responsiveness and recency. It may NOT reward payment. A
--   provider cannot buy a higher organic position.
--
-- WHAT IS WRONG IN PRODUCTION
--   platform_settings.setting_value WHERE setting_key='ranking_weights' is
--   currently:
--
--     {"recency":10,"pro_boost":50,"response_rate":15,
--      "location_relevance":5,"listing_completeness":20}
--
--   `pro_boost: 50` is a flat +50 added to calculated_ranking_score for any
--   facility with an active Pro subscription — larger than every other
--   weight combined (20+15+10+5 = 50). It is the single largest ranking
--   signal on the platform and it is bought.
--
-- WHY CODE ALONE IS NOT ENOUGH, AND WHY THIS ROW ALONE IS NOT ENOUGH
--   These two fixes are independent and BOTH are required:
--
--     • calculate-ranking-scores previously did
--         weights = { ...DEFAULT_WEIGHTS, ...settingsData.setting_value }
--       so deleting pro_boost from DEFAULT_WEIGHTS would have changed
--       nothing — this stale row would have put it straight back.
--
--     • Conversely, deleting the key here does not by itself stop an
--       operator (or a restored backup) from re-adding it through the admin
--       settings UI.
--
--   So the Edge function is changed to read an explicit ALLOW-LIST of
--   neutral weight keys — any pro_boost surviving or reappearing in this
--   JSON is structurally ignored by the scorer — and this migration cleans
--   the stored value so the admin UI stops presenting a paid lever as a
--   legitimate ranking knob.
--
-- WHY jsonb `-` AND NOT A REPLACEMENT OBJECT
--   `setting_value - 'pro_boost'` removes exactly one key and preserves
--   every other key and value verbatim, including any operator tuning this
--   migration has no business knowing about. Writing a hard-coded
--   replacement object would silently erase operator settings — including
--   weights added after this migration was authored.
--
-- IDEMPOTENT
--   The `?` containment guard means a re-run (or a first run against an
--   environment that never had the key) updates zero rows rather than
--   touching updated_at. Safe to apply repeatedly and safe to apply out of
--   order relative to the code deploy.
--
-- NOT APPLIED TO PRODUCTION BY THIS CHANGE. See the rollout runbook in
-- docs/directory-cutover-stage-03-entitlement-amendment-b1-b2.md: neutral
-- code deploys first, then this migration, then ONE controlled full
-- recomputation of calculated_ranking_score, then static regeneration.
-- =============================================================================

UPDATE public.platform_settings
   SET setting_value = setting_value - 'pro_boost',
       updated_at    = now()
 WHERE setting_key = 'ranking_weights'
   AND setting_value ? 'pro_boost';

-- Fail-closed post-condition. If the key survives — a concurrent write, a
-- second ranking_weights row, a differently-shaped value — abort rather than
-- report a paid ranking lever as retired while it is still stored.
DO $$
DECLARE
  v_remaining int;
BEGIN
  SELECT count(*)
    INTO v_remaining
  FROM public.platform_settings
  WHERE setting_key = 'ranking_weights'
    AND setting_value ? 'pro_boost';

  IF v_remaining > 0 THEN
    RAISE EXCEPTION
      'ranking_weights still contains pro_boost in % row(s) — organic ranking would remain purchasable', v_remaining;
  END IF;
END
$$;
