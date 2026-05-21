# Add-on waitlist

**Date:** 2026-05-17 (round 10)
**Anchors:** rounds 8 (cap enforcement) + 9 (admin cap management).

## Why

Rounds 8 and 9 enforced caps but the "scope is full" UX was a dead end ("contact support"). Providers had no way to signal demand, and ops had no visibility into where the queue was thickest. This round adds the missing waitlist primitive — provider opt-in when full, admin notification when a slot frees, admin view of the open queue.

## Migration `20260604000000_addon_waitlist`

Single `addon_waitlist` table with an `addon_type` discriminator so both Featured and Concierge queues live in one place:

| Column | Featured use | Concierge use |
|---|---|---|
| `addon_type` | `'featured'` | `'concierge'` |
| `facility_id` | claimer's facility | same |
| `requested_by` | provider's user id (gated by RLS) | same |
| `scope_type`, `scope_value` | required | NULL |
| `geo_state`, `geo_city`, `level_of_care` | NULL | required (state); city and LoC optional |
| `status` | `'waiting' | 'invited' | 'fulfilled' | 'expired' | 'canceled'` | same |
| `requested_at`, `invited_at`, `closed_at` | lifecycle stamps | same |

A `CHECK` constraint enforces "Featured columns required for Featured rows; Concierge columns required for Concierge rows; never both." Partial UNIQUE indexes prevent duplicate open entries per facility per scope while still allowing re-opt-in after a `fulfilled` or `canceled` close.

### RLS
- **Providers** can SELECT their own rows, INSERT rows where `requested_by = auth.uid()`, and UPDATE only to `status='canceled'` on their own open rows.
- **Admins** (via `has_role(auth.uid(), 'admin'::app_role)`) can SELECT all and UPDATE any.
- Service role bypasses, so the triggers below can write `admin_notifications` rows.

### Triggers
Two AFTER triggers — one on `featured_placements`, one on `concierge_partner_facilities` — detect when a slot transitions `active=true → false` (UPDATE or DELETE). When a slot frees, the trigger queries `addon_waitlist` for the oldest matching waiting row in the same scope and, if found, writes an `admin_notifications` row of type `addon_waitlist_slot_freed` with the waiter's facility/user in metadata. Admin then has the info to offer the slot.

Auto-email to the waiter is intentionally **not** wired in this round — Resend templating + per-user opt-out preferences are their own concern. The admin-notification handoff is the v1 operational path.

## UI

### Provider-side — `JoinAddonWaitlistButton`
Shared component used by both `AddFeaturedPlacementForm` and `AddConciergeGeoForm`. When the cap-reached banner appears, the button shows one of:
- **"Join the waitlist"** — pressable; INSERTs into `addon_waitlist` under the user's JWT (RLS enforces ownership).
- **"On the waitlist — we'll be in touch"** — green check, when the user already has an open entry for that exact scope.
- **"Invited — check your email"** — when admin has flipped the row to `invited`.

Looks up the user's existing entry via TanStack Query keyed on the scope, so re-renders during typing don't flash.

### Admin-side — `WaitlistCard` inside the Caps tab
Third card under the Featured + Concierge cap cards. Shows every `waiting` + `invited` row sorted by `requested_at`. Per-row actions:
- **Mark invited** — for `waiting` rows; sets `status='invited', invited_at=now()`.
- **Mark fulfilled** — for `invited` rows; sets `status='fulfilled', closed_at=now()`.
- **Expire** — close the entry without offering the slot (e.g., provider stopped responding).

Filter by add-on (All / Featured / Concierge). When the queue is empty, renders a friendly "no one is waiting" line.

## End-to-end flow

1. Provider on `/provider/billing/concierge` clicks "Add a geography" → picks TX/Austin → checks LoCs → checks EKRA.
2. `get_concierge_availability('TX', 'Austin')` returns `(3, 3, 0)` → form shows "Cap reached" banner with `<JoinAddonWaitlistButton>`.
3. Provider clicks "Join the waitlist" → `addon_waitlist` row inserts with `status='waiting'`.
4. Button replaces with "On the waitlist — we'll be in touch".
5. Weeks later, a current TX/Austin partner cancels → `concierge_partner_facilities` row flips `active=false` → trigger `trg_notify_addon_waitlist_on_concierge_free` fires → finds the oldest `waiting` row → INSERTs `admin_notifications.type='addon_waitlist_slot_freed'` with the waiter's metadata.
6. Admin loads `/admin/subscriptions` → Caps tab → Waitlist card → sees the entry → emails the provider out-of-band → clicks "Mark invited" → row flips to `status='invited', invited_at=now()`.
7. Provider returns to the Concierge add form → JoinAddonWaitlistButton shows "Invited — check your email" → provider re-runs the add (slot is now open) → success.
8. Admin clicks "Mark fulfilled" on the waitlist row → entry closes.

## Cumulative production-readiness (rounds 4-10)

- [x] Pro upgrade
- [x] Featured Add-On
- [x] Concierge Add-On
- [x] Dunning + self-service add forms + renewal display
- [x] Server-side cap enforcement + availability RPCs
- [x] Admin cap-management UI + cap-table RLS lock-down
- [x] Waitlist with provider opt-in + admin queue + drain notifications

## Carry-forward

- Auto-email the next waiter when a slot frees (currently admin gets notified, admin emails manually). Would need a Resend template, per-user opt-out preferences, and a small Edge Function called from the trigger or via cron.
- Display the waiter's position-in-line in `JoinAddonWaitlistButton` ("you're #3 of 8"). Currently the button just shows binary opt-in state.
- Provider-side view of own open waitlist entries on `BillingPlacements` / `BillingConcierge` (a small section listing every open entry the provider has, with a "Leave the queue" action).
- Stripe-test-mode smoke tests (Prompt 6 proper).
