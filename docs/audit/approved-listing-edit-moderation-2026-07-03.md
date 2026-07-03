# Approved-listing edit re-moderation — decision (2026-07-03)

**Scope:** what happens when a provider edits an already `approved` / live listing.
**Decision:** **Option A — no pre-publish re-moderation before launch.** Current controls are sufficient; residual risk is bounded and reactively moderated. A future "pending sensitive-edit" design is captured below as a **non-blocking** post-launch enhancement.

## Current behavior (verified)

- Provider edits (auto-save + manual save in `src/pages/provider/ListingEditor.tsx`) update **content fields only** — `name, address, city, state, zip, phone, email, reply_email, website, description, facility_type, gender_served, bed_count, logo_url, gallery_urls, year_established, hours, languages, accessibility, accepting_admissions`. They **never write `status`**.
- An `approved` listing therefore **stays `approved`** and edits are **public immediately** (through `public_facilities`).
- This is **deliberate, documented design**, not an oversight — `20260818000000_facility_status_publish_guard.sql` explicitly short-circuits `TG_OP='UPDATE' AND OLD.status='approved'` as "a normal provider edit, not a (re)publish."
- The editor **auto-saves every ~3 seconds while typing**, so any edit-triggered review queue or admin notification would be a spam hazard.

## Why the residual risk is acceptable for launch

Sensitive/privileged columns are already server-gated (a provider cannot change them via edit):

| Field(s) | Control |
|---|---|
| `status` (self-publish) | `enforce_facility_status_gate` — admin/service only |
| `verified` (trust badge) | `enforce_facility_verified_gate` — admin/service only; badge also Pro-masked in `public_facilities` |
| `featured` / `featured_pinned` / `featured_display_order` | `enforce_facility_featured_gate` |
| `suspended`, `calculated_ranking_score`, `listing_completeness_score`, `response_rate_score`, `data_source` | `enforce_facility_privileged_columns_gate` (PR #69) |
| `user_id` / ownership | RLS `WITH CHECK user_id = auth.uid()` |

Free-text and contact fields (`name`, `description`, `phone`, `website`, `email`) **can** change post-approval and go live immediately. That residual is bounded by:

1. **Input sanitization on every save** — `sanitizeFacilityName`, `sanitizeText`, `sanitizeDescription`, `validateEmail`, `sanitizeWebsite` (XSS / format / length).
2. **No trust-signal forgery** — the public "Verified" badge is admin-granted **and** Pro-masked, so misleading free-text cannot manufacture trust chrome.
3. **Reactive admin moderation** — admins can `suspend` a listing (now audit-logged via `admin_audit_log`), and the PR-#69 gate makes that suspension stick (provider cannot self-unsuspend).
4. **Change visibility** — every edit bumps `updated_at`, which admin listing surfaces can sort/monitor by.

Pre-publish re-moderation would either (a) **dark a paid Pro listing** on a trivial typo fix until an admin re-approves — bad launch UX and a monetization-visibility regression — or (b) require a **pending-edit versioning system** (show old publicly, queue new), which is explicitly out of scope for this pass and does not currently exist.

## Non-blocking future enhancement (deferred)

If post-launch data shows abuse of free-text edits on claimed listings, the smallest safe design is a **sensitive-field edit flag** that keeps the current version public while surfacing changed sensitive fields to an admin review lane:

- Add a `facility_pending_edits` staging table (or a `pending_review_fields jsonb` column) written by an `AFTER UPDATE` trigger **only** when a sensitive field changes on an `approved` **claimed** row, **debounced** (e.g. one open review row per facility) to survive the 3s auto-save cadence.
- Public display keeps reading the live row; admins get a review queue entry; on approve, no-op (already live) or on reject, admin reverts from the stored snapshot (the claim path already stores `previous_facility_snapshot`, a reusable pattern).
- This preserves provider self-service for harmless edits and never darks a live listing.

**Launch impact:** none. This is a monitoring-driven enhancement, not a launch blocker.
