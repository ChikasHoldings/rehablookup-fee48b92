# Monetization Featured add-on fixes — 2026-05-20

Pair with `docs/monetization-featured-audit-2026-05-20.md`.

## TL;DR

**No code changes.** Every finding in Prompt 3 of the master plan
verified PASS against existing implementation. This branch ships as
a documentation-only commit.

## Detailed verdict

| Finding | Status | Evidence |
| --- | --- | --- |
| 1. Build `create-checkout-session` | ✅ already exists (315 lines) | `supabase/functions/create-checkout-session/index.ts` |
| 2. Webhook activation seeds placements | ✅ already implemented | `activateFeaturedAddon` at `stripe-webhook/index.ts:1119+` |
| 3. Slot-selector ("Add placement") | ✅ already built (316 lines) | `AddFeaturedPlacementForm.tsx` |
| 4. Public rotation correctness | ✅ has_featured + status + active filter all in place | `get-featured-rotation/index.ts:412-431` |
| 5. Remove placement (no sub-cancel) | ✅ implemented | `FeaturedManagementPanel.tsx:159-179` |
| 6. Admin slot management | ✅ AddonCapsTab + FeaturedPlacementTab | mounted in `AdminSubscriptions.tsx:789, 794` |
| 7. Cap enforcement (trigger + RPC) | ✅ already in place | migration `20260602000000_addon_cap_enforcement_and_availability.sql` |
| 8. Refund on cancel-from-subscription | ✅ Round-31 hardened | `_shared/cancel-subscription.ts:427-475` |

## Stale plan anchors

The master plan's Prompt 3 anchor list mentioned two things that
turned out to be stale (already-done):

1. **"Build the missing `create-checkout-session` edge function"** —
   it exists locally + deployed at v1.1.0. The plan's claim that it
   "does not exist" predated the multi-intent rebuild. Verified
   against both the local file (315 lines, supports
   `intent="initial_subscription"+product="pro"` AND
   `intent="add_addon"+product="featured"|"concierge"`) and the
   deployed source via `mcp__supabase__list_edge_functions`.

2. **"Admin slot cap management — build any missing"** — the master
   plan said this was needed but `AddonCapsTab.tsx` already exists
   with full cap-management UI (view, edit, add entries for both
   `placement_caps` and `concierge_geo_caps`). Mounted in
   `AdminSubscriptions.tsx`.

## Verification

```
$ git rev-list --count origin/claude/monetization-2-pro-upgrade ^HEAD
0   # branch descends from monetization-2 tip
$ npx tsc --noEmit
(clean)
$ npx vite build
(clean — no source changes)
```

## Ship-readiness

Featured add-on ships. Forward dependency for Prompt 4 (Concierge): the
same `create-checkout-session` function handles Concierge add-on via
`intent="add_addon"+product="concierge"`. Same cap-enforcement
trigger pattern (`enforce_concierge_geo_cap`) and the same admin
cap-management surface (`AddonCapsTab` already covers concierge_geo_caps
side-by-side with placement_caps).
