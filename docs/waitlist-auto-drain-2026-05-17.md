# Waitlist auto-drain

**Date:** 2026-05-17 (round 11)
**Anchor:** round 10's waitlist primitive.

## Why

Round 10 wrote `admin_notifications` when a slot freed, but converting that to an invite required an admin to read the notification, look up the requester's email, send manually, and flip the row to `invited`. Slot-free → invite latency was bounded by admin attention. This round closes that loop with a cron-driven drain that auto-sends the invite email and flips the row, leaving the admin notification as a fallback record.

## Artifacts

### `supabase/functions/drain-addon-waitlist/index.ts`
Cron-only edge function. Hard-coded service-role check on the JWT (`token === SUPABASE_SERVICE_ROLE_KEY`) so direct calls return 403 even with `verify_jwt:true`.

For up to 200 oldest-first `status='waiting'` rows per tick:
1. Re-check availability via `get_placement_availability` / `get_concierge_availability` (the row may be stale if a slot was filled since the trigger fired).
2. Resolve the requester's email via `auth.admin.getUserById` and the facility name from `facilities`.
3. **Claim the row first**: `UPDATE addon_waitlist SET status='invited', invited_at=now() WHERE id=? AND status='waiting' RETURNING id`. The `WHERE status='waiting'` filter means a concurrent cron tick claims at most one of any duplicate run.
4. Send the Resend invite with `Idempotency-Key: addon-waitlist-invite:<row.id>` so a retry within Resend's dedup window can't double-send.
5. On Resend failure, write an `admin_notifications.type='addon_waitlist_invite_email_failed'` row so the operator can re-invite manually (the row stays `invited` to preserve the partial-unique invariant; admin can flip it back via the UI if needed).

Returns `{ success: true, stats: { considered, invited, slot_taken, errors, skipped } }`.

### `supabase/migrations/20260605000000_addon_waitlist_drain_cron.sql`
Schedules `drain-addon-waitlist` cron job every 5 minutes using the same `extensions.http_post` + `app.settings.functions_url` + `app.settings.service_role_key` pattern as the existing `send-renewal-reminders` cron. Idempotent via `cron.unschedule(...)` wrapped in a tolerant DO block.

**Staged for normal deploy** (not applied to live DB yet). The cron will fire HTTP POSTs to `/drain-addon-waitlist`; the function must be deployed first to avoid 404 noise. Standard pipeline ordering handles this.

## End-to-end (post-deploy)

1. Provider hits a capped scope → opts into waitlist via `JoinAddonWaitlistButton` (round 10).
2. A current slot-holder cancels → trigger writes `admin_notifications.type='addon_waitlist_slot_freed'` (round 10's contract preserved).
3. Within 5 minutes, the drain cron tick:
   - Re-checks availability — still 1 free.
   - Resolves requester email + facility name.
   - UPDATEs the row to `invited` (claim).
   - Sends Resend invite with the manage-add-on URL.
4. Provider's email shows "A Featured placement slot opened for state=TX" → clicks "Open the manager" → lands in `/provider/billing/placements` → re-runs the Add form (now `remaining > 0`).
5. Admin sees the row status flip to `invited` in the Caps tab waitlist queue without taking action.

## Failure paths handled

- **Provider already claimed the slot themselves between the trigger and the drain** — `get_*_availability` returns 0 → drain skips with `stats.slot_taken++`. Row stays `waiting`; next tick re-checks.
- **Concurrent drain ticks (overlapping cron runs)** — the `WHERE status='waiting'` filter on UPDATE means only one tick claims the row.
- **Resend send failure** — `addon_notifications.type='addon_waitlist_invite_email_failed'` row gives ops the recipient + waitlist id so they can resend manually. Row stays `invited` so the partial-unique invariant holds.
- **Provider's auth account was deleted** — `auth.admin.getUserById` returns no user → skip silently with `stats.skipped++`. ON DELETE CASCADE on `requested_by` would normally clean this row, but if there's a brief window this short-circuits cleanly.
- **`app.settings.functions_url` not set on the DB** — the cron's `extensions.http_post` fails silently (pg_net swallows); no harm. The existing `renewal-reminder-health-check` migration documents the manual setup step.

## Cumulative production-readiness (rounds 4-11)

- [x] Pro upgrade
- [x] Featured Add-On
- [x] Concierge Add-On
- [x] Dunning + self-service forms + renewal display
- [x] Cap enforcement + availability RPCs
- [x] Admin cap-management UI + RLS lock-down
- [x] Waitlist with provider opt-in + admin queue + drain notifications
- [x] Auto-email invite on slot-free (this round)

## Carry-forward

- Waitlist position-in-line indicator in `JoinAddonWaitlistButton` ("you're #3 of 8") — requires a small RPC counting waiting rows ahead of the user.
- Per-user "I never want auto-invites" opt-out preference. Today every waitlister gets the invite email; an opt-out column on the waitlist row would let the user request admin-only outreach.
- Provider-side dashboard panel listing every open waitlist entry the provider has across all their facilities with a "Leave the queue" action.
- Stripe-test-mode smoke tests (separate infra prompt).
