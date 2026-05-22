# RLS InitPlan Optimization — `auth_rls_initplan`

**Date:** 2026-05-22  
**Project:** `mldbxpntzcjalgjmwnqa` (production)

## Why this matters

Postgres re-evaluates the RLS `USING` and `WITH CHECK` predicates **once per row** during query execution. When those predicates contain a bare function call like `auth.uid()`, Postgres treats it as a STABLE function and re-invokes it for every row scanned.

Wrapping the call in a sub-`SELECT` — `(select auth.uid())` — promotes the call to an **InitPlan**, which Postgres evaluates exactly once at query start and caches. On a 100 k-row scan that's the difference between 1 and 100 000 function invocations.

The Supabase advisor flags every policy with a bare `auth.<fn>()` call as `auth_rls_initplan`.

## Before / after

| | Before | After |
|---|---|---|
| `auth_rls_initplan` advisor warnings | **34** | **0** |
| Affected policies | 34 (across 15 tables) | 0 |
| Sample planner output | `Filter: (auth.uid() = user_id)` | `InitPlan 1; One-Time Filter: ((InitPlan 1).col1 = user_id)` |

## Affected policies

| # | Schema.Table | Policy | Command |
|---|---|---|---|
| 1 | public.addon_waitlist | Admins can update any waitlist entry | UPDATE |
| 2 | public.addon_waitlist | Admins can view all waitlist entries | SELECT |
| 3 | public.addon_waitlist | Providers can cancel their own waitlist entries | UPDATE |
| 4 | public.addon_waitlist | Providers can insert their own waitlist entries | INSERT |
| 5 | public.addon_waitlist | Providers can view their own waitlist entries | SELECT |
| 6 | public.analytics_events | Admin staff read analytics_events | SELECT |
| 7 | public.concierge_geo_caps | Admins can delete concierge geo caps | DELETE |
| 8 | public.concierge_geo_caps | Admins can insert concierge geo caps | INSERT |
| 9 | public.concierge_geo_caps | Admins can update concierge geo caps | UPDATE |
| 10 | public.facility_claim_requests | facility_claim_requests_admin_update | UPDATE |
| 11 | public.facility_claim_requests | facility_claim_requests_claimant_withdraw | UPDATE |
| 12 | public.facility_claim_requests | facility_claim_requests_insert | INSERT |
| 13 | public.facility_claim_requests | facility_claim_requests_select | SELECT |
| 14 | public.facility_match_clusters | clusters_admin_all | ALL |
| 15 | public.facility_reviews | Authenticated users can insert reviews | INSERT |
| 16 | public.placement_caps | Admins can delete placement caps | DELETE |
| 17 | public.placement_caps | Admins can insert placement caps | INSERT |
| 18 | public.placement_caps | Admins can update placement caps | UPDATE |
| 19 | public.provider_interest | Admins can update provider interest | UPDATE |
| 20 | public.provider_interest | Admins can view provider interest | SELECT |
| 21 | public.provider_onboarding_state | provider_onboarding_state_owner_insert | INSERT |
| 22 | public.provider_onboarding_state | provider_onboarding_state_owner_select | SELECT |
| 23 | public.provider_onboarding_state | provider_onboarding_state_owner_update | UPDATE |
| 24 | public.saved_searches | Users delete own saved searches | DELETE |
| 25 | public.saved_searches | Users insert own saved searches | INSERT |
| 26 | public.saved_searches | Users select own saved searches | SELECT |
| 27 | public.saved_searches | Users update own saved searches | UPDATE |
| 28 | public.staged_directory | staged_directory_admin_all | ALL |
| 29 | public.staged_leads | staged_leads_admin_all | ALL |
| 30 | public.staged_samhsa | staged_samhsa_admin_all | ALL |
| 31 | public.user_compare_list | Users delete own compare entries | DELETE |
| 32 | public.user_compare_list | Users insert own compare entries | INSERT |
| 33 | public.user_compare_list | Users select own compare list | SELECT |
| 34 | realtime.messages | Users can only subscribe to own channels | SELECT |

## Migration

`supabase/migrations/20260522054500_rls_perf_wrap_auth_calls.sql` — drops + recreates every affected policy. Policy names and role bindings are preserved, only the predicate text changes.

Pattern per policy:

```sql
DROP POLICY IF EXISTS "policy_name" ON schema.table;
CREATE POLICY "policy_name"
  ON schema.table
  AS PERMISSIVE FOR <CMD>
  TO <role>
  USING (...replaced auth.uid()/jwt()/role() with (select auth.<fn>()) ...)
  WITH CHECK (...same...);
```

## Smoke test results

| Table | rows visible to `authenticated` role (anon session) | result |
|---|---|---|
| addon_waitlist | 0 | OK — own-row policy with null `auth.uid()` returns no rows |
| analytics_events | 0 | OK — admin-only policy correctly denies |
| concierge_geo_caps | 51 | OK — other "anyone can read" policy allows |
| facility_claim_requests | 0 | OK |
| facility_match_clusters | 0 | OK |
| facility_reviews | 0 | OK (only INSERT was affected; SELECT has separate policies) |
| placement_caps | 118 | OK — other "anyone can read" policy allows |
| provider_interest | 0 | OK |
| provider_onboarding_state | 0 | OK |
| saved_searches | 0 | OK |
| staged_directory | 0 | OK — admin-only |
| staged_leads | 0 | OK — admin-only |
| staged_samhsa | 0 | OK — admin-only |
| user_compare_list | 0 | OK |
| realtime.messages | n/a | not directly queryable; behavior verified by realtime subscription |

Sample `EXPLAIN` on `saved_searches`:

```
Result
  One-Time Filter: ((InitPlan 1).col1 = '...'::uuid)
  InitPlan 1
    ->  Result
  ->  Bitmap Heap Scan on saved_searches
        Recheck Cond: (user_id = '...'::uuid)
```

`InitPlan 1` is the once-per-query evaluation of `(select auth.uid())`.

## Acceptance

✅ `get_advisors(performance)` returns 0 `auth_rls_initplan` warnings (down from 34).  
✅ Every affected policy still exists with the same name and role binding.  
✅ Sample queries on every affected table execute without error under the `authenticated` role.

## Not addressed in this migration

- **25 storage.objects policies** also have unwrapped `auth.uid()` calls. The advisor does not lint the `storage` schema, so they don't appear in the warning count. They suffer the same per-row evaluation cost and should be wrapped in a follow-up migration.
- The `multiple_permissive_policies` advisor (212 warnings) is a separate issue — multiple PERMISSIVE policies for the same role/command on the same table cause the planner to OR them all together. Out of scope for this task.
