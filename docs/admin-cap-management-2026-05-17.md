# Admin add-on cap management

**Date:** 2026-05-17 (round 9)
**Anchor:** `docs/cap-enforcement-2026-05-17.md` (round 8).

## Why

Round 8 made cap enforcement real on the server but left tuning to direct SQL. Sales and ops need to bump Austin from the default 3 to 6, drop a saturated state from 18 to 12, or seed a brand-new metro on demand — that has to be a click, not a Postgres console session.

This round adds:
- RLS on both cap tables so admin writes go through the user's JWT (no more service-role-only writes).
- A new "Caps" tab under `/admin/subscriptions` with full CRUD for Featured + Concierge caps, live usage counts, and over-cap warnings.

## Security fix that came out of the audit

`concierge_geo_caps` shipped with RLS **disabled** in round 8 (oversight — the migration didn't `ENABLE ROW LEVEL SECURITY`). That meant any anon or authenticated client could `UPDATE/DELETE/INSERT` on the cap table directly via PostgREST. Migration `20260603000000_addon_cap_admin_rls` closes that gap:

| Table | Before | After |
|---|---|---|
| `placement_caps` | RLS on; public SELECT; no write policies → silent failure for non-service-role | RLS on; public SELECT; admin INSERT/UPDATE/DELETE |
| `concierge_geo_caps` | **RLS off → unrestricted writes** | RLS on; public SELECT; admin INSERT/UPDATE/DELETE |

Both write policies gate on `has_role(auth.uid(), 'admin'::app_role)`. With no JWT (service-role calls from Edge Functions) the predicate is moot because service-role bypasses RLS entirely.

## UI — `src/components/admin/AddonCapsTab.tsx`

Two cards stacked vertically inside the new tab:

### Featured placement caps
- Filter by placement_type (all 8 types) + free-text on `placement_value`
- "Add a Featured cap" inline form (type, value, max_slots, optional notes)
- Table with one row per cap entry. Each row shows the live `used` count (joined from `featured_placements WHERE active=true`); rows where `used > max_slots` flag the count in red. Inline editing of `max_slots` + notes; per-row Save and Delete actions.

### Concierge geo caps
- Same shape, filtering by free-text on state/city
- "Add a Concierge cap" inline form (2-letter state, optional city — blank = `*` statewide)
- Live usage count joined from `concierge_partner_facilities WHERE active=true`
- Rows where `geo_city='*'` render italicized "(statewide)" so admin can see at a glance which row is the default

## Verified flows

1. Admin loads `/admin/subscriptions` → clicks "Caps" tab → sees the seeded 118 Featured caps + 51 Concierge caps.
2. Admin filters Concierge to "TX" → sees the TX statewide row at cap 3, no city overrides.
3. Admin clicks "Add a Concierge cap" → state=TX, city=Austin, max_slots=6 → Add → row appears. New TX/Austin purchases now check the city-specific cap instead of falling back to the statewide default.
4. Admin tries to edit a row while non-admin → RLS rejects with `permission denied for table concierge_geo_caps`; toast surfaces.

## Cumulative production-readiness across rounds 4-9

- [x] Pro upgrade (round 4)
- [x] Featured Add-On (round 5)
- [x] Concierge Add-On (round 6)
- [x] Dunning banner + self-service add forms + renewal display (round 7)
- [x] Server-side cap enforcement + live availability RPCs (round 8)
- [x] Admin cap-management UI + cap-table RLS lock-down (this round)

## Carry-forward

- Waitlist mechanism — "join the waitlist by contacting support" text in the Add forms still routes to email; a `waitlist` table + edge function are owed for proper queuing.
- Stripe-test-mode smoke tests (Prompt 6 proper) — pattern documented in round 7's doc; runnable suites need a test Supabase + Stripe sandbox.
