-- ─────────────────────────────────────────────────────────────────────────
-- Security advisor remediation (P1 / audit finding H1):
-- Lock down state-mutating SECURITY DEFINER functions that were EXECUTE-able
-- by the public `anon` (unauthenticated) role — and, for the purely-internal
-- ones, by `authenticated` too.
--
-- Why this matters:
--   These functions are SECURITY DEFINER (they BYPASS RLS) and mutate the
--   facility-claim verification pipeline, the re-verification queue, the
--   placement/expiry sweeps, and the add-on waitlist. The Supabase security
--   advisor flagged them as `anon_security_definer_function_executable`.
--   The claim-verification trio is a privilege-escalation chain:
--       start_claim_verification(claim)         -- creates an attempt
--     → record_ownership_signal(attempt, …, p_score, p_passed=true)
--                                               -- attacker-controlled score
--     → finalize_claim_decision(attempt)        -- writes facility_claim_requests
--                                                  .status = 'approved'
--   i.e. an unauthenticated caller hitting /rest/v1/rpc/* could drive a
--   facility claim to auto-approved. Revoking EXECUTE closes that surface.
--
-- Why this is safe (verified — none are invoked from the client via .rpc()):
--   Bucket A (internal only): called via PERFORM inside SECURITY DEFINER
--     triggers / bridge functions (see 20260805000000), by pg_cron
--     (refresh_facility_metrics_daily — cron job 44), or by cron edge
--     functions running with the service_role key (run_*_sweep via
--     run-re-verification-sweep; mark_review_request_sent via
--     send-placement-review-requests). All of those run as the function
--     owner / service_role, which retain their own EXECUTE grant, so dropping
--     PUBLIC/anon/authenticated does not break them.
--   Bucket B (signed-in actions): set_concierge_eligibility_revoked and
--     mark_lead_messages_read are called by signed-in admin/provider UI via
--     .rpc(); the rest are signed-in provider actions. Each self-guards on
--     auth.uid()/admin internally, so we drop PUBLIC + anon but KEEP
--     authenticated.
--
-- NOT touched (legitimately public read/util RPCs): get_public_facility_data,
--   get_embed_*, get_active_promotion, dismiss_promotion, submit_review_via_token,
--   check_rate_limit, get_concierge_availability, is_* boolean helpers, etc.
--
-- Reversible: GRANT EXECUTE ON FUNCTION <sig> TO anon/authenticated; rolls back.
-- Idempotent: REVOKE/GRANT are no-ops if the grant is already absent/present.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  fn regprocedure;
  -- Internal-only (trigger / pg_cron / service-role edge fn) → drop PUBLIC, anon, authenticated.
  bucket_a text[] := array[
    'finalize_claim_decision','start_claim_verification','record_ownership_signal',
    'record_re_verification_event','resolve_re_verification_event','_re_verify_notify_provider',
    'run_backstop_sweep','run_expiry_sweep','run_data_feed_diff',
    'refresh_facility_metrics_daily','mark_review_request_sent','unclaim_abandoned_facility',
    'fulfill_addon_waitlist_on_concierge_claim','fulfill_addon_waitlist_on_featured_claim',
    'enforce_international_partner_only'
  ];
  -- Signed-in actions → drop PUBLIC + anon, keep authenticated.
  bucket_b text[] := array[
    'set_concierge_eligibility_revoked','mark_lead_messages_read','invite_facility_team_member',
    'create_review_request','attest_concierge_eligibility','confirm_facility_alias'
  ];
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any(bucket_a)
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn);
  end loop;

  for fn in
    select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname = any(bucket_b)
  loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
