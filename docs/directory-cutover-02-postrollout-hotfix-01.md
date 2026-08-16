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
