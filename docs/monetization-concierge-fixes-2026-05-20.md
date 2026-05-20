# Monetization Concierge add-on fixes — 2026-05-20

Pair with `docs/monetization-concierge-audit-2026-05-20.md`.

## TL;DR

**No code changes.** Every Prompt-4 finding verified PASS against
existing implementation. This branch ships as a documentation-only
commit.

| Finding | Status | Evidence |
| --- | --- | --- |
| 1. create-checkout-session handles Concierge intent | ✅ | LOOKUP_KEYS includes `concierge: { monthly: rl_concierge_monthly_v1, annual: rl_concierge_annual_v1 }` |
| 2. create-concierge-checkout retired | ✅ vendored as 410 in Prompt 2 | `supabase/functions/create-concierge-checkout/index.ts` |
| 3. Webhook activation | ✅ | `activateConciergePartner` at `stripe-webhook/index.ts:807+` |
| 4. Add-geo form | ✅ | `AddConciergeGeoForm.tsx` (200+ lines, EKRA ack + LoCs + availability) |
| 5. Cap enforcement | ✅ | `concierge_geo_caps` table + `enforce_concierge_geo_cap` trigger + `get_concierge_availability` RPC |
| 6. Intake matching (EKRA-safe) | ✅ | Matcher scores by clinical fit; `NonPartnerConsiderationBlock` enforces at advisor-decision layer |
| 7. Admin Concierge dashboard | ✅ | 23+ working components in `src/components/admin/concierge/`, zero stubs |
| 8. Introduction flow + email | ✅ | `send-concierge-introduction` with idempotency + intro_sent_at + case event |
| 9. EKRA audit table | ✅ | `concierge_introduction_audit` (migration `20260521000000_…`) with admin review queue |
| 10. Refund on cancel | ✅ | `_shared/cancel-subscription.ts:476-510` Round-31 hardened |

## Stale plan anchors

The master plan's Prompt 4 anchor list mentioned `concierge_match_audit`
as the audit table name; the canonical name is
`concierge_introduction_audit` (migration `20260521000000`). All
admin surfaces, RPCs, and the AdminConciergeAuditReview UI reference
the canonical name.

The plan also suggested filtering the matcher to surface partners +
2 non-partners algorithmically. The actual implementation is
**stricter than the plan**: the matcher returns top-3 by clinical
score (no partner bias), and EKRA is enforced at the advisor-decision
layer via written rationale for every rejected non-partner candidate
plus a queryable admin audit. This is more EKRA-defensible than the
plan's filter approach (which would have introduced a partner-bias
floor).

## Verification

```
$ git rev-list --count origin/claude/monetization-3-featured ^HEAD
0   # branch descends from monetization-3 tip
$ npx tsc --noEmit
(clean — no source changes)
$ git diff --stat origin/claude/monetization-3-featured..HEAD
 docs/monetization-concierge-audit-2026-05-20.md | +280 lines
 docs/monetization-concierge-fixes-2026-05-20.md | +60 lines
```

## Ship-readiness

Concierge add-on ships. Forward dependency for Prompt 5
(cross-cutting): the admin retention tab, invoice editing UI, and
dunning banner are next — most of which are already addressed in
prior commits on this stack (DunningBanner globally in ProviderShell;
AddonCapsTab + FeaturedPlacementTab in AdminSubscriptions). The one
substantial item that remains is the retention dashboard for
at-risk providers (Prompt 5 Finding 2).
