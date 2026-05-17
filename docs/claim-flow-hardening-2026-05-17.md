# Claim flow + facility-edit hardening

**Date:** 2026-05-17 (round 3)
**Anchors:** prior `docs/onboarding-audit-2026-05-17.md`, `docs/onboarding-hardening-2026-05-17b.md`
**Goal:** end-to-end functional claim/list → plan → full facility edit → land in provider panel, with zero deployed-only source-of-truth gaps and SAMHSA pre-fill on the claim editor.

## Source-of-truth gaps closed

Six claim-pipeline functions and one approval trigger lived only on the deployed Supabase project. A fresh DB or a redeploy from a stale repo would silently break the claim flow. All vendored this pass with byte-for-byte parity (fetched via Supabase MCP `get_edge_function` / `pg_get_functiondef`):

| Artifact | Type | Behavior |
|---|---|---|
| `submit-facility-claim` v2 | edge fn | Idempotent claim upsert; accepts `pendingEnrichments` jsonb capturing description / contact corrections / logo / photos / services / insurance / accreditations |
| `initiate-claim-email-verification` | edge fn | 6-digit OTP via Resend to work-email-at-facility-domain; gated on rate limit + active-codes cap |
| `initiate-claim-sms-verification` | edge fn | 6-digit OTP via Twilio to the facility's listed phone (proving access to the listed line) |
| `confirm-claim-verification-code` | edge fn | Validates OTP across email + SMS, 5-attempt cap, constant-time-ish compare, locks claim on too-many-failures |
| `send-claim-approval-email` | edge fn | Admin-gated approval notification with dashboard link |
| `send-claim-rejection-email` | edge fn | Admin-gated rejection notification surfacing the `rejection_reason` |
| `handle_claim_request_approval` | DB trigger | Approval-time ownership transfer + provider_credits seed + materialization of `pending_enrichments` into `facilities` + `facility_services` + `facility_insurance` + `facility_accreditations` |

The migration `20260530000000_claim_request_approval_trigger.sql` carries the trigger definition forward.

## SAMHSA pre-fill on Step4Enrichment

Before: the claim wizard's enrichment step only pre-filled `correctedContact` from the existing facility row. Description, services, and insurance started blank — a SAMHSA claimer with already-populated data had to re-type or click every item.

After: the one-time seed effect (`ClaimWizard.tsx:1903-1976`) now fetches `facility_services` + `facility_insurance` for the facility being claimed and pre-populates the wizard state alongside `correctedContact` and `description` from `facility.description`. The claimer sees their existing data in the form and can EDIT (toggle, add, remove, rewrite) instead of starting from zero.

The seed runs once per wizard session (gated on `state.step4Seeded`) and respects in-progress edits (only seeds when the field is empty), so a refresh mid-edit doesn't blow away changes.

## Approval trigger materialization (vendored detail)

When an admin sets `facility_claim_requests.status='approved'`, the trigger fires and:
1. Transfers ownership: `facilities.user_id = claimant_user_id`, `claimed_at = now()`.
2. Seeds `provider_credits` (zero balance) so the new owner is ready for paid features.
3. Applies `pending_enrichments`:
   - `description` → `facilities.description`
   - `corrected_contact.{phone,email,website}` → `facilities.{phone,email,website}` (only where non-empty)
   - `logo_path` → `facilities.logo_url`
   - `photo_paths` → `facilities.gallery_urls`
   - `services[]` → `facility_services` rows (ON CONFLICT DO NOTHING)
   - `insurances[]` → `facility_insurance` rows
   - `accreditations[]` → `facility_accreditations` rows (each `verified=false` so admin still individually reviews certs)
4. Auto-rejects competing pending claims for the same facility with `'Another claim was approved for this facility'`.

The trigger fires as `SECURITY DEFINER` with `search_path=public, pg_temp`, so RLS doesn't block any of the writes.

## End-to-end claim flow (verified)

1. Anon hits `/provider/claim/<slug>` → `AuthSignup` with `returnTo` → back to claim.
2. Signed-in but no plan picked → bounced to `/provider/onboarding?intent=claim&facility_id=<id>` (round-2 gate).
3. Wizard: AccountStep (with `handle_new_provider()` trigger + defensive upsert ensuring profile row) → VerifyEmailStep (6-digit OTP, server-side `email_verified_at` flip) → FindOrListStep (inline phone OTP, JWT-authed) → PlanStep (Free or Pro Checkout single-flight) → BuildStep → `/provider/claim/<slug>`.
4. ClaimWizard Steps 1-2 → `submit-facility-claim` creates the claim row.
5. Step 3 Verification — three paths:
   - **Email-domain**: `initiate-claim-email-verification` sends OTP to `you@facility.com`, `confirm-claim-verification-code` validates.
   - **SMS-to-facility-phone**: `initiate-claim-sms-verification` sends OTP to the listed facility phone.
   - **Document-upload**: docs uploaded to `claim-evidence` bucket, claim moves to `verification_status='pending'` for admin review.
6. Step 4 Enrichment — pre-filled with existing SAMHSA data (description, services, insurance, contact). Claimer edits and adds logo, photos, accreditations. `submit-facility-claim` re-runs (idempotent UPDATE) with `pendingEnrichments` carrying the wizard state.
7. Step 5 Review → submit. `onSubmitted` → `complete_provider_onboarding()` RPC → `/provider/claim/<slug>/submitted` → re-fires the RPC for safety → "Go to dashboard".
8. Admin reviews in `/admin/claims`. Approval → trigger transfers ownership + materializes enrichments → `send-claim-approval-email` notifies. Listing is now live and editable from `/provider/listings/<id>` (`ListingEditor`).

## Post-approval editing (verified)

`ListingEditor.tsx` mounts under the provider shell with 10 tabs covering:
- Photos (gallery + logo)
- Basic info (name, type, year established)
- Location (address, city, state, zip)
- Contact (phone, email, reply email, website)
- Program (description, gender served, bed count, international acceptance)
- Services (`facility_services` join table)
- Insurance (`facility_insurance` join table)
- Age groups (`facility_age_groups` join table)
- Trust (`ProviderTrustForm` — accreditations + credentials)
- Staff (`StaffManagementSection` — team members)

Every tab has a real component implementation. Floating save bar with auto-save. Live preview modal. All writes pass through `facilities` UPDATE policy (`auth.uid() = user_id`), which the approval trigger satisfies by setting `user_id = claimant_user_id`.

## What's still owed (carry-forward, not blocking)

- Hours field — no DB column, no UI on any surface. Add `hours jsonb` to `facilities` + UI in ListingEditor.
- Vendoring `purchase-listing-slot` (deployed-only, not currently invoked from the client).
- Vendoring `create-concierge-checkout`, `charge-placement-fee`, `record-placement-agreement`, `submit-placement-case`, `track-featured-analytics` (covered by Prompt 4 in `/root/.claude/plans/immutable-munching-rainbow.md`).
- Featured + Concierge add-on flows (covered by Prompts 3 + 4 in the monetization breakdown).
