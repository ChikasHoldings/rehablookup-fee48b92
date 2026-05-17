# Add-on cap enforcement + live availability

**Date:** 2026-05-17 (round 8)
**Anchor:** cross-cutting hardening doc from round 7. This closes one of its named carry-forward items.

## Why this exists

The Featured + Concierge marketing promises explicit slot caps ("30 per state, 15 per major metro, 8 per smaller city, 25 per treatment-type, 5 per insurance" for Featured; "3-5 per major city, 1-3 per smaller markets" for Concierge). Until this round the round-7 Add forms wrote new rows without consulting the cap, so a runaway client or an admin script could oversell beyond promised caps — diluting every existing partner's rotation share and creating a refund-grade customer-trust failure.

This round adds:
- Server-side BEFORE-INSERT triggers on `featured_placements` and `concierge_partner_facilities` that raise `check_violation` when an insert would put the active-row count over the cap.
- `get_placement_availability(p_type, p_value)` and `get_concierge_availability(p_state, p_city)` SECURITY-DEFINER RPCs returning `{cap, used, remaining}` so the Add forms can show live availability before the user commits.
- `concierge_geo_caps` table seeded with a default statewide cap of 3 for all 50 states + DC; admin can tune any (state, city) entry by hand.

## Migration `20260602000000_addon_cap_enforcement_and_availability`

| Artifact | Purpose |
|---|---|
| `concierge_geo_caps` table | PK `(geo_state, geo_city)` with `geo_city='*'` meaning "statewide default." Pre-seeded for 51 states/territories with `max_slots=3`. |
| `get_placement_availability(text, text)` | SECURITY DEFINER; reads `placement_caps`; falls back to type-level avg with floor of 5 when an exact (type, value) row is missing (avoids 0-slot UX for newly-routed geos). |
| `get_concierge_availability(text, text)` | SECURITY DEFINER; reads `concierge_geo_caps`; falls back to statewide cap, then 3 default. Treats `geo_city=NULL` in partner rows as statewide. |
| `enforce_featured_placement_cap` trigger | BEFORE INSERT OR UPDATE; counts active rows excluding self; raises `check_violation` on overflow. Deactivation (`active=true→false`) skips the check entirely so cancellations always succeed. |
| `enforce_concierge_geo_cap` trigger | Symmetric trigger on `concierge_partner_facilities`. |

Migration applied to live DB; verified via direct RPC calls:
```sql
SELECT * FROM get_placement_availability('state', 'TX');  -- (cap 18, used 0, remaining 18)
SELECT * FROM get_concierge_availability('CA', 'Los Angeles');  -- (cap 3, used 0, remaining 3)
```

## UI changes — `AddFeaturedPlacementForm`

When the user picks a page type + value, the form calls `get_placement_availability` via TanStack Query. The result renders inside the form as one of:

- "Checking availability…" (loading)
- "**12 of 18** slots available for this scope (6 currently in use)." (normal)
- "**Cap reached** — 18 of 18 slots in use for this scope. Try a different value or join the waitlist by contacting support." (full → Add button disabled)

If the server-side trigger still rejects the insert (race between two clients hitting the same cap simultaneously), the catch block translates the verbose Postgres `check_violation` into a friendly toast: *"This placement scope is full. Pick a different value or contact support to join the waitlist."*

## UI changes — `AddConciergeGeoForm`

Mirror behaviour. Availability lookup keyed on `(state, trimmed city)`. Cap-reached state disables the Add button and surfaces a friendly toast on the race-loss path.

## Race-safety

The trigger counts `WHERE id <> NEW.id` so an UPDATE that's already active doesn't count itself. Two concurrent clients submitting the same last slot will both pass the availability RPC (read-only) but only one will pass the trigger — the second gets `check_violation` and surfaces the friendly toast. The UI re-fetches availability via TanStack focus refetch so the loser sees the updated "cap reached" state next time.

## Production-readiness checklist (cumulative)

- [x] Pro upgrade idempotent + double-billing-resistant (round 4)
- [x] Featured + Concierge end-to-end purchase + activation (rounds 5, 6)
- [x] Provider-side dunning + add forms + renewal display (round 7)
- [x] Server-side cap enforcement on both add-on tables (this round)
- [x] Live availability display in both Add forms (this round)
- [x] Friendly error messages on cap-violation races

## Carry-forward (out of scope this round)

- Admin Featured/Concierge cap-management UI for tuning `placement_caps` and `concierge_geo_caps` entries (set Austin to 6 instead of 3, etc.).
- Waitlist mechanism — currently the "join the waitlist by contacting support" message asks the user to email, but no `waitlist` table or `request-concierge-waitlist` edge function exists yet.
- Stripe-test-mode smoke tests (separate infrastructure prompt).
