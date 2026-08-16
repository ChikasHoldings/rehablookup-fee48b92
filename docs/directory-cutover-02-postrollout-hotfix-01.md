# Directory cutover — post-rollout stage 2 hotfix #1

**Branch:** `directory-cutover-02-postrollout-hotfix-01`
**Base:** `de0168406b583781ee9d8311ab9f928608d31c0c` (production `main` at time of writing)
**Scope:** code prep + Preview only. No migration, no production deploy, no Stripe change, no stage 3.

Independent post-production verification of the stage 1 + stage 2 rollout found two
narrow defects. Both are repaired here.

---

## Blocker 1 — homepage claimed a verified inventory

### The claim vs. the data

| production fact | value |
| --- | --- |
| `public_facilities` listings | 3,794 |
| raw `facilities.verified = true` (all statuses) | 5 |
| …of those, approved and unsuspended | 3 |
| `public_facilities.verified` exposure | Pro-gated |
| active Pro subscriptions | 0 |

`src/components/home/TrustStrip.tsx` had already retired this claim for the trust
strip and documents the reasoning in full. The root shell and several other
homepage surfaces still carried it.

### What was saying it

| surface | before |
| --- | --- |
| `src/lib/seo/titles.ts` → `DESCRIPTIONS.home` | `Search 3,800+ verified addiction treatment centers. …` |
| `index.html` description / `og:description` / `twitter:description` | same string |
| `index.html` noscript lead | `RehabLookup connects individuals and families with verified drug and alcohol rehabilitation centers across all 50 states…` |
| `index.html` noscript bullet | `Verified Facilities: Listed treatment centers go through a verification process … before they appear in the directory` |
| `index.html` noscript step 1 | `…to browse verified facilities near you` |
| `index.html` noscript CTA | `Search verified treatment centers by location…` |
| `src/pages/Index.tsx` hero subheadline | `Compare verified treatment centers and check your insurance coverage.` |
| `src/pages/Index.tsx` trust bar | `{directory count}+ Verified Facilities` |
| `src/pages/Index.tsx` WebPage / Service JSON-LD | `Search 3,800+ verified drug and alcohol rehab centers…` / `…comparing verified addiction treatment centers` |
| `src/components/home/RecoveryJourneyCTA.tsx` | `{count}+ verified facilities`; `independent directory of verified addiction-treatment facilities` |
| `src/components/home/FindByStateSection.tsx` | `Browse verified addiction treatment centers in all 50 states…`; `"Verified"` state-card chip |
| `src/components/home/ProvidersCTA.tsx` | `3,800+ / Verified centers` stat tile |
| `src/components/home/CommonQuestionsSection.tsx` | `Many verified facilities offer same-day…` |
| `src/components/SEO.tsx` Organization / WebSite schema | `…find verified drug and alcohol treatment centers across the United States` / `Find verified addiction treatment centers near you` |
| `src/components/SEO.tsx` near-me / treatment-type / search-results builders | `Compare {count}+ verified treatment centers`, `Browse {count} verified addiction treatment centers` |

### The build-time trap

Fixing `index.html` alone is **not** sufficient. `vite.config.ts`'s
`syncHomepageTitle` plugin substitutes `TITLES.home` / `DESCRIPTIONS.home` from
`src/lib/seo/titles.ts` into the shell during `vite build`, so the first pass of
this hotfix produced a `dist/index.html` that still read `3,800+ verified`.
`src/lib/seo/titles.ts` is the real source of the served homepage description and
is now in the guard's scan set for exactly that reason.

### What "verified" still means

The word is **not** banned. These stay legal and were left untouched:

- a facility-specific verified badge (`facility.verified`, `award: "RehabLookup Verified Facility"`)
- the Pro feature name "Verified Listings" and "a verified badge that builds family trust"
- verified provider contact state (`reply_email_verified`, verified phone)
- accreditation/licensing shown on a record that actually carries it
- `LegitScript Verified` (a real third-party credential)
- every internal / admin / provider verification workflow

Only a claim about the **whole inventory** was removed.

### Guard

`scripts/check-public-directory-truth.mjs`, wired into `build:vercel` immediately
before `validate:blocking`. It scans the homepage/root shell only —
`index.html`, `dist/index.html`, `src/pages/Index.tsx`,
`src/components/home/**`, `src/components/SEO.tsx`, `src/lib/seo/titles.ts` —
and fails on:

1. a plural inventory noun described as verified (`verified facilities`, `verified treatment centers`, `Verified Facilities`)
2. a directory-sized count presented as verified (`3,800+ verified`)
3. a live directory count rendered next to a `Verified` label (the JSX shape no single-string rule can see)
4. a blanket "everything is verified/vetted before it is listed" process promise
5. a blanket "nothing appears until verified" promise
6. verified inventory claimed across all 50 states / the United States

Comments are stripped before scanning, so the rationale can be documented in
place. `listings` is deliberately excluded from rule 1 so the Pro feature name
survives, and rule 1 requires a **plural** noun so a per-facility badge survives.

`src/lib/__tests__/directoryPublicPositioning.test.ts` was updated: it previously
pinned the literal string `verified addiction treatment centers`, which is what
kept the claim alive through stage 2. It now asserts the truthful copy plus four
explicit negative assertions on the root shell.

---

## Blocker 2 — unclaimed inquiries manufactured a false notification failure

### Root cause

`submit-qualified-lead` v3.1.0 correctly suppresses provider notifications for an
unclaimed listing (`masterEnabled = facilityIsClaimed && …`). But **after** those
branches it unconditionally ran:

```ts
supabase.from("notification_events").insert({
  …, user_id: facility.user_id, channel: "email", event_type: "sent", …
})
```

Two independent defects:

1. **Unclaimed → guaranteed constraint failure.** `facility.user_id` is `NULL`
   and production's `notification_events.user_id` is `NOT NULL`. Every inquiry to
   an unclaimed listing hit `23502`, and the catch then inserted an
   `admin_notifications` row titled *"Lead notification audit trail missing"* —
   a false operational failure for a provider notification that was correctly
   never supposed to happen.
2. **Claimed → untruthful audit row.** `channel:"email", event_type:"sent"` was
   written regardless of whether email was disabled by preference, no recipient
   resolved, the address was suppressed, Resend rejected it, or the send threw.

Two adjacent reads were also issued on behalf of a provider that does not exist:
`notification_preferences` and `profiles`, both as `.eq("user_id", null)`.

### Fix

| behaviour | before | after |
| --- | --- | --- |
| `notification_preferences` read (unclaimed) | ran as `.eq("user_id", null)` | skipped |
| `profiles` read (unclaimed) | ran as `.eq("user_id", null)` | skipped |
| provider email (unclaimed) | already suppressed | unchanged |
| `notification_events` (unclaimed) | inserted → `23502` → false admin alert | not written |
| `admin_notifications` (unclaimed) | raised on every inquiry | not raised |
| `notification_events` (claimed, email sent) | written | written, unchanged shape |
| `notification_events` (claimed, email disabled / no recipient / suppressed / rejected / threw) | written as `email`/`sent` | not written |
| `"Facility email sent"` log | emitted whenever the call was reached | emitted only on `success === true` |

**Success criterion.** `sendEmailWithRetry` is the single definition of success.
`success: true` means Resend accepted the message *or* the idempotency key
already had a `sent` tracking event (the mail genuinely went out earlier).
`success: false` covers suppression, permanent rejection and an exhausted retry
budget; a throw is folded into the same shape. The audit row keys off exactly
that value and never re-derives success from "we reached the send call".

**Scope held deliberately narrow.** `notification_events` has always been the
instant *email* audit. This makes that one record truthful; it does not add
per-channel SMS/in-app event rows or redesign the schema.

### Invariants explicitly unchanged

- claimed facility → `deliveryState = "delivered_to_provider"`, even with every notification channel switched off — the inquiry is in the provider inbox regardless
- unclaimed facility → `deliveryState = "stored_pending_claim"`
- exactly one `leads` row, `leads.facility_id` = the selected facility, always
- `notificationEmail` stays `null` for an unclaimed listing — no seeker PII to an unverified import address
- no Concierge, advisor, matching, alternate provider, reassignment or redistribution path
- no `has_active_pro` / Featured gate on inquiry eligibility or on notification
- no migration; no schema or data change of any kind

### Regression coverage

`src/__tests__/submit-qualified-lead-routing.test.ts` gains 15 tests
(27 → 42) that execute the real handler in-process. The stub mirrors the live
`NOT NULL` constraint on `notification_events.user_id`, so the false-alert path is
reproduced rather than assumed. `src/__tests__/helpers/edgeFunctionHarness.ts`
gains an optional `onSend` resolver so a Resend rejection and a transport throw
can be modelled; existing behaviour is unchanged when it is omitted.

---

## Validation

| step | result |
| --- | --- |
| `npm run typecheck` | clean |
| `npm run lint` | 216 problems (180 errors, 36 warnings) — unchanged baseline, none in touched files |
| `npm test -- --run` | 56 files, 819 tests passed |
| `npm run build:vercel` | exit 0 |
| `check:public-directory-truth` | 11 homepage/root artifacts clean |
| `check:directory-public-shell`, `check:inquiry-routing-prerender`, `check:pro-phone-visibility`, `check:public-navigation` | pass |
| `check:no-placeholder-phone`, `check:no-fake-inventory`, `check:redirect-targets`, `check:canonical-ga`, `check:no-duplicate-keys`, `check:internal-links`, `check:edge-function-auth`, `check:pnpm-lockfile`, `check:facility-placeholder` | pass |

---

## Rollout record — 2026-08-16

Controlled production rollout of this hotfix. Frontend first, Edge Function
second; no migration, no schema change, no data change.

### What shipped

| # | step | result |
| --- | --- | --- |
| 1 | Merge `directory-cutover-02-postrollout-hotfix-01` → `main` | fast-forward to `86f460207767afa64534f99de5aa8a07683686a5` |
| 2 | Vercel production build + deploy | `dpl_HgNBXoHchFzJuMxHathdQbbqBsmm`, READY, `target=production` |
| 3 | Deploy `submit-qualified-lead` | v21 → **v22**, ACTIVE, `verify_jwt=true` |

The merge was already complete when the rollout session began — `origin/main`
was `86f460…`, PR #80 merged. It was verified rather than assumed: `86f460`'s
single parent is exactly the approved base `de0168406b583781ee9d8311ab9f928608d31c0c`,
there is exactly one commit between them, it is not a merge commit, and its tree
is identical to the approved branch. So the SHA that shipped is the SHA that was
reviewed — no squash, rebase, or amend.

### Edge Function deployment

Deployed through the repo's own `deploy-all-stale-functions.yml` workflow with
an explicit single-function input, from a checkout of `main` @ `86f460`. That
path is byte-exact from git and reads `verify_jwt` from `supabase/config.toml`
(`[functions.submit-qualified-lead] verify_jwt = true`), so the auth posture is
carried by configuration rather than re-specified at deploy time.

A dry run was executed first and reported `[1] submit-qualified-lead`,
`Total: 1 / Failed: 0`, confirming the blast radius before the real deploy.

| function | before | after |
| --- | --- | --- |
| `submit-qualified-lead` | v21, `ezbr_sha256 b97ab2b1…` | **v22**, `ezbr_sha256 19c3cc25…`, `verify_jwt=true` |
| `get-public-facilities` | v14 | v14 (untouched) |
| `get-featured-rotation` | v13 | v13 (untouched) |

Rollback artifact: the v21 source was captured before deploying and confirmed
byte-identical to `de016840`'s `supabase/functions/submit-qualified-lead/index.ts`
(`sha256 81960d7b…`), so rollback is a redeploy of that commit.

### Production verification

Homepage (`/`) — the inventory claim is corrected live: `Search 3,800+ addiction
treatment center listings.` in the title/OG/Twitter description, `rl:stats`
carrying the real `{"facilities":3794,"states":51}`, and no directory-wide
"verified" claim, verified count, or "verified before it appears" promise
anywhere in the shell. Directory positioning and the platform-support framing of
the RehabLookup number are intact.

Facility page (`/center/tony-rice-center-inc-shelbyville-tn-cfa6cfec`) — a real
approved, unclaimed, non-Pro listing whose source row *does* carry a phone:
`data-inquiry-routing="facility"`, `data-phone-visibility="hidden"`, Send Inquiry
targeting its own slug, website and directions present, and no facility phone in
any form — no digits, no `tel:`, no JSON-LD `telephone`. The only `tel:` on the
page is the labelled RehabLookup support line.

Build guards on the production deployment: `check:public-directory-truth` (11
artifacts), `check:inquiry-routing-prerender` (**6,062 facility profiles, all
phone-hidden, 0 Pro**), `check:pro-phone-visibility`, `check:directory-public-shell`,
`check:public-navigation` (91 destinations), and all of `validate:blocking`.

Database state was identical before and after the rollout — `leads 0`,
`concierge_inquiries 1`, `concierge_case_events 7`, `notification_events 0`,
`admin_notifications 128`, `public_facilities 3794`, active Pro `0` — and
`lead_notification_event_failure` alerts remain at **0**. The rollout itself
wrote nothing.

### Not verified: the live unclaimed-inquiry probe

**The end-to-end production probe was NOT performed, and its absence is the one
real gap in this record.** Two blockers, neither safely removable:

1. The rollout environment has no network egress to `*.supabase.co`, so the
   deployed function could not be invoked at all.
2. `submit-qualified-lead` enforces server-side email verification
   (`is_email_verified`) before any notification logic runs. A probe would 403 at
   that gate unless a verified-email record were created first — a production
   write outside the scope of a single authorized inquiry.

Fabricating a probe result was not acceptable, so none was reported. What that
leaves unproven **in production** is the observable end state of Blocker 2: that
an inquiry to an unclaimed listing now stores one `leads` row, writes no
`notification_events` row, and raises no `lead_notification_event_failure` alert.

That behaviour is covered by the 42-test `submit-qualified-lead-routing` suite,
which exercises the real handler against a stub mirroring the live NOT NULL
constraint, and the deployed bundle was built from exactly that reviewed source.
Recommended follow-up: one real inquiry to an unclaimed listing from an
environment with egress, then confirm `notification_events` is unchanged and no
`lead_notification_event_failure` row appears.
