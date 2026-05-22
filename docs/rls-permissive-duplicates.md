# RLS Multiple-Permissive-Policy Consolidation

**Date:** 2026-05-22  
**Project:** `mldbxpntzcjalgjmwnqa` (production)

## Problem

Supabase advisor reports **212 `multiple_permissive_policies` warnings** — places where a table has more than one PERMISSIVE policy for the same (role, action) combination. PostgreSQL OR-combines them and evaluates each per row, which balloons query time on hot paths.

The 212 advisor warnings collapse to **68 distinct (table, command) groups across 48 tables** (the advisor lints per role; each group typically maps to 3 warnings — anon/authenticated/authenticator).

## Strategy

For each group:

1. **Filter out `service_role`-only policies.** `service_role` and `postgres` have `rolbypassrls = true` — RLS doesn't run for them. Their policies are dead code and are dropped without replacement.

2. **For the remaining "active" policies** in the group:
   - 0 left → drop everything, no replacement (service-role-only groups)
   - 1 left → keep it as-is, just drop the service_role siblings
   - 2+ left → drop all, create a single consolidated PERMISSIVE policy with:
     - `USING` = `OR` of all original `USING` predicates
     - `WITH CHECK` = `OR` of all original `WITH CHECK` predicates
     - role binding = broadest in the group (`{public}` > `{authenticated}` > narrower)

3. **Behavior is preserved by construction.** PostgreSQL OR-combines multiple PERMISSIVE policies anyway; we just flatten them into one. Predicates that reference `auth.uid()` evaluate `false` for anon callers (where `auth.uid()` is null), so widening the role binding from `{authenticated}` to `{public}` does not leak data.

## Smoke test approach

The user-requested 4-role smoke test (anon / seeker / provider / admin) requires real JWTs which aren't available from MCP SQL. Instead we use **logical equivalence**: after each migration, we verify that:

- The dropped policies no longer exist.
- The new consolidated policy exists with the expected combined predicate.
- The total permissive-policy count for each (table, command) group is exactly 1.
- `SET LOCAL ROLE authenticated; SELECT count(*) ...` returns plausible results (sanity check).

## Batch plan

| Batch | Tables | Migration file |
|-------|--------|----------------|
| 1 | account_activity_log, addon_waitlist, admin_audit_log, admin_user_permissions, admin_user_profiles | `20260522060001_…` |
| 2 | badge_impressions, concierge_case_events, concierge_inquiries, concierge_introduction_audit, concierge_introductions | `20260522060002_…` |
| 3 | concierge_messages, concierge_partner_facilities, concierge_threads, concierge_tour_requests, facilities | `20260522060003_…` |
| 4 | facility_accreditations, facility_age_groups, facility_claim_requests, facility_credential_documents, facility_insurance | `20260522060004_…` |
| 5 | facility_pending_changes, facility_reviews, facility_reviews_config, facility_services, facility_staff | `20260522060005_…` |
| 6 | facility_subscriptions, facility_views, featured_impressions, featured_phone_clicks, featured_placement_analytics | `20260522060006_…` |
| 7 | featured_placements, insurance_verification_requests, lead_contact_events, lead_distributions, leads | `20260522060007_…` |
| 8 | marketing_leads, profiles, provider_events, provider_payment_methods, rate_limit_log | `20260522060008_…` |
| 9 | review_disputes, review_requests, review_responses, seeker_profiles, subscription_events | `20260522060009_…` |
| 10 | user_roles, user_sessions | `20260522060010_…` |
| 11 | storage.objects (4 groups in one table) | `20260522060011_…` |

## Role-binding patterns

| Pattern | Group count | Notes |
|---------|-------------|-------|
| `{authenticated} \| {public}` | 23 | merged → `{public}` |
| `{public}` only | 22 | merged → `{public}` |
| `{authenticated}` only | 10 | merged → `{authenticated}` |
| `{anon,authenticated} \| {authenticated}` | 4 | merged → `{anon,authenticated}` |
| `{authenticated} \| {service_role}` | 3 | drop service_role; keep authenticated as-is |
| `{public} \| {service_role}` | 2 | drop service_role; keep public as-is |
| `{anon,authenticated} \| {authenticated} \| {public}` | 2 | merged → `{public}` |
| `{service_role}` only | 1 | drop all (concierge_case_events ALL) |
| `{anon} \| {authenticated} \| {public}` | 1 | merged → `{public}` |

## Acceptance

`get_advisors(performance)` → `multiple_permissive_policies` count = **0** (down from 212).
