# Stage 3 — entitlement contract amendment: B1 (trust) + B2 (organic ranking)

**Status: code-prep + Vercel Preview only.** No production migration applied, no
Edge function deployed, no Stripe write, no production data written, no ranking
recomputation. PR #81 stays draft.

Amends the Stage-3 branch `directory-cutover-03-provider-admin` on top of
`ca5e14d4`.

---

## The contract

RehabLookup is a treatment **directory**.

A provider **may** pay for:

- **Pro**, $99/month — public facility phone + Call CTA, enhanced-profile media
  (video / virtual tour), the raised photo cap, listing analytics.
- **Featured** — clearly labeled paid visibility, in its own rail, separate from
  organic results.

A provider **may never** pay for:

- verification / trust
- organic search ranking
- inquiry eligibility, inquiry value, or matching / assignment

Two of those "never"s were being sold. This amendment removes both.

---

## B1 — verification was a paid feature

`public_facilities` published `verified` through an entitlement mask:

```sql
CASE WHEN has_active_pro(id) THEN verified ELSE false END AS verified
```

Buying Pro is what made a facility publicly verified. Independent production
verification measured the effect exactly:

| Production fact | Value |
| --- | --- |
| `facilities.verified = true` | **5** |
| `public_facilities.verified = true` | **0** |
| `facility_subscriptions` rows | **0** |

Every verified facility in the directory was published as unverified, because
nobody currently holds Pro. The trust signal was not merely purchasable — with
zero subscribers it was globally off.

### The fix

`supabase/migrations/20260901000000_public_facilities_plan_independent_verified.sql`

Recreates `public_facilities` from the current `20260831000000` contract,
changing exactly one expression: `verified` is published from the underlying
column.

`facilities.verified` is `boolean DEFAULT false` and production holds **zero**
NULLs (3807 rows: 5 true / 3802 false / 0 null), so the raw column is read
directly rather than wrapped in a `COALESCE` that would imply an
output-nullability contract the view does not owe. Every consumer already
null-tolerates it (`f.verified || false` in `get-public-facilities`,
`center.verified === true` in the search filter).

### Preserved byte-for-byte

- **Phone stays Pro-gated.** `CASE WHEN has_active_pro(id) THEN phone ELSE NULL`.
  Featured is never consulted.
- **Claimant visibility** (PR #78 resume path) — pending/under_review claims hide
  the facility publicly, *except* from the claimant themselves.
- **`is_claimed = user_id IS NOT NULL`** — the `20260830000100` semantics, not the
  older `claimed_at` form.
- **`is_pro` / `is_premium_visible` = `has_active_pro(id)`**.
- **`video_url` / `virtual_tour_url`** keep their existing Pro gating.
- **`website`** stays ungated.
- **Raw-table security.** The migration contains no `DROP POLICY`, no
  `CREATE POLICY`, no `GRANT`, no `REVOKE` on `public.facilities`. The Stage-2
  closure — anon holds no policy, no table privilege and no column privilege on
  the internal provider record — is untouched and `20260831000000` remains the
  migration that owns it.
- **The five dependent public projections** are deliberately *not* restated, so
  `CREATE OR REPLACE VIEW` leaves them bound to `public_facilities` exactly as
  `20260831000000` repointed them. Not restating them is what makes silent
  reversion impossible.

### `get_public_facility_data` stays dropped

Confirmed **absent from production**. It was deliberately dropped by
`20260829004500` as a dormant SECURITY DEFINER RPC that bypassed the view's
masks. It was not used as a B1 fallback. The new migration carries a fail-closed
`DO` block that aborts if it exists, and the build guard asserts no migration
after the drop recreates it.

### External badge / credential kit — Category B, left Pro-gated

`serve-badge` and `generate-credential-kit` both require `has_active_pro()` **and**
`facility.verified === true`.

Classified as **(B) optional marketing/export packaging built around a trust
status**, not as the trust status itself. The Pro gate controls *export
convenience* — an embeddable SVG badge, a downloadable PDF credential kit. It
does not change whether the facility is **publicly shown as verified** (that is
`public_facilities.verified`, now plan-independent), nor the meaning of verified,
nor verification eligibility, nor the underlying state. Under the amendment's own
test they may remain Pro-gated, so they are unchanged.

One copy line in `generate-credential-kit` — *"maintains an active, verified
RehabLookup Pro listing"* — reads as coupling Pro to verification. That file is
not otherwise touched by this amendment, so per the amendment's scope rule it is
**flagged for Bucket A**, not changed here.

---

## B2 — organic ranking was purchasable, four separate ways

Each path was independently sufficient to sell position, and each read as
reasonable on its own.

### B2.1 `calculate-ranking-scores`

`pro_boost: 50` — a flat +50 for any active Pro subscriber, **larger than every
other weight combined** (20 + 15 + 10 + 5 = 50).

Removed. The function no longer queries `facility_subscriptions`, no longer
derives `isPro`, and no longer references `pro_boost`.

**Deleting the default alone would have fixed nothing.** The old merge was:

```ts
weights = { ...DEFAULT_WEIGHTS, ...settingsData.setting_value }
```

and production still stores `pro_boost: 50` in `platform_settings`. The stored
row would have put the boost straight back. The scorer now copies an explicit
allow-list (`NEUTRAL_WEIGHT_KEYS`), so a stored `pro_boost` — or any future
`featured_boost` / `subscription_tier_boost` — is structurally ignored whatever
the JSON says. Ignored keys are logged.

The other inputs were audited for hidden paid signals and are clean:
completeness counts logo / gallery / description / services / insurance / a
phone being *present* / verified reply email / staff / year / website; recency
reads `last_activity_at`; response rate is currently a constant 50 for everyone
because the `lead_unlocks` source was dropped. None depends on payment.
`location_relevance` remains declared but unused — pre-existing, not touched.

### B2.2 stored `platform_settings`

`supabase/migrations/20260901000100_ranking_weights_drop_pro_boost.sql`

```sql
SET setting_value = setting_value - 'pro_boost'
WHERE setting_key = 'ranking_weights' AND setting_value ? 'pro_boost';
```

Key-subtraction, not a hard-coded replacement object that would erase operator
tuning. The `?` guard makes it idempotent and safe when the key is already
absent. A fail-closed `DO` block aborts if the key survives. **Not applied to
production.**

### B2.3 `_shared/pro-benefits.ts`

Pro activation wrote `facilities.featured = true` and
`calculated_ranking_score += 50`; cancellation wrote `featured = false` and
`-= 50`.

Both removed. What remains is the `profiles.plan` mirror.

**This is not a no-op.** The plan mirror drives the storage photo-cap trigger,
and every other Pro entitlement (phone, media, `is_pro`) is derived live from
`facility_subscriptions` via `has_active_pro()`, which the webhook maintains
separately. Pro still activates — it just no longer reaches into trust, ranking
or Featured state.

Deactivation deliberately no longer clears `featured`: cancelling Pro must not
strip a facility of an independent Featured entitlement it may legitimately
hold.

Result interfaces, the partial-failure notifier and idempotency are preserved.
The `alreadyBoosted` transition guard is gone because it existed only to stop
the +50 double-applying; a plain `UPDATE` is idempotent by construction.

### B2.4 `stripe-webhook` — and a **blocker**

The webhook had a **second, hand-written copy** of the same mutation on the
`past_due → active` recovery path, outside `_shared/`. It would have survived the
shared-module fix untouched. It is now replaced by a call to the shared module.

> **⚠ The canonical generator `scripts/inline-stripe-webhook-shared.py` cannot
> currently be run. This is reported, not worked around.**
>
> Two independent defects, both reproduced in an isolated sandbox copy:
>
> 1. **It points at a directory that no longer exists.** `SHARED_DIR` is
>    `supabase/functions/stripe-webhook/_shared`, which commit `c9c8fbc436`
>    deleted when it inlined the modules. Running it raises `FileNotFoundError`.
>
> 2. **It is not idempotent.** Repaired to point at `supabase/functions/_shared`,
>    it treats the already-inlined `index.ts` as the entrypoint and re-inlines
>    every shared module on top of it: **405,745 bytes vs 200,319** (2.02×), with
>    duplicate `activateProBenefits` declarations. That output does not compile.
>
> Per the amendment's instruction — *"if the generator causes unrelated large
> drift: STOP"* — the generator path was abandoned rather than forced.
>
> **What was done instead.** The canonical shared source was edited first. The
> inlined block in `stripe-webhook/index.ts` was then replaced with the
> generator's exact transform of that source (hoist URL imports, strip relative
> imports), reproducing what a working generator would emit. Equivalence is not
> asserted by eye: a test in `directoryEntitlementContract.test.ts` re-derives
> the transform and asserts the inlined block is byte-identical to
> `_shared/pro-benefits.ts`, so the two cannot drift.
>
> **Follow-up (not in scope here):** the generator needs a pristine
> non-inlined entrypoint before it can be made operable and idempotent again.
> That is a re-architecture of the build step, not an entitlement change.

The webhook diff is confined to the pro-benefits block, the recovery path, and
four provider-facing copy strings that claimed Pro buys "featured placement,
priority search ranking" — now false, and corrected in place because the file is
already touched and the claim directly contradicts B2. **No deploy.**

### B2.5 frontend organic sorting

`src/lib/facilityPlanSort.ts` is **deleted**, not renamed. It exported a
four-tier paid ladder (Featured → Pro → free-claimed → unclaimed) that ran
**before the user's chosen sort** on every non-proximity option in
`SearchResults`, and a two-tier version used by `SeekerHome` / `SeekerSearch`.

"Name A–Z" was not alphabetical. It was paid-tier-first, then alphabetical
within tier.

Replaced by `src/lib/facilityPlanTier.ts`, which exports the `PlanTier` **type
only** and no comparator at all. After the change:

- Pro, Featured, plan tier and subscription status appear in **no** comparator.
- Name A–Z is alphabetical; Name Z–A is its reverse.
- Proximity is driven by proximity; payment cannot lift a farther facility.
- Every branch ends on `id.localeCompare` for deterministic ties.

**Claimed/unclaimed is not reinstated.** It existed only as a rung on the paid
ladder, and ownership is not evidence of directory quality.

The `featured` sort option ("Featured First") is renamed to `relevance`
("Best Match") with neutral ordering. `?sort=featured` still resolves to it via
`LEGACY_SORT_ALIASES`, so existing links and indexed URLs keep working.

The **"Featured Only" quick filter is removed**. It filtered
`center.featured`, which the hooks built as `featured || isPro` — so it quietly
meant "paid listings only". With the conflation gone it would have promised a
paid-placement facet backed by an unproven boolean.

### B2.6 / B2.7 data hooks

- `useApprovedFacilities`: `featured: isPro` → `featured: false`.
- `useStaticFacilities`: `featured: facility.featured || isPro` → `featured: false`;
  `isFeaturedPaid` removed entirely.

Neither is repointed at the raw `facilities.featured` column, because that column
is **the same flag the retired Pro activation wrote** — reading it back is not
evidence of a Featured purchase. Setting the display signal to `false` at the
source means every downstream consumer (`SearchResults`, `FacilityCard`,
`SEOLandingTemplate`, `ResponsiveListingGrid`, `FeaturedCentersSection`) stops
asserting Featured for organic results with no edits to those files. The paid
rails (`FeaturedRail`, `HomepageGeoFeaturedRail`, `LandingFeaturedSection`) set
`hasFeaturedSubscription: true` explicitly and are untouched.

`isPro` is still exposed — Pro product features depend on it.

### B2.8 `get-featured-facilities` → v2.1.0

- Active Pro subscriptions **no longer enter Featured eligibility**.
  `proFacilityIds` is still computed and returned — callers legitimately need
  the Pro entitlement signal — but it is structurally separate from eligibility.
- `plan_type: 'pro'` is gone from the eligibility shape.
- The legacy `facilities.featured = true` path no longer confers eligibility.
  Ignored rows are logged for operator visibility; **no rows are mutated**.
- The Stripe `FEATURED_PRODUCT_IDS` path is **kept**: it identifies genuinely
  paid Featured customers, and removing it without being able to inspect Stripe
  would risk stripping a real paying customer. See the rollout precondition.

### B2.9 the two legacy `facilities.featured` rows — **UNKNOWN, unmutated**

| ID | Name |
| --- | --- |
| `5e41c64a-9708-4ca1-b5cd-feb35c96ab50` | CASCADIA-BOUNTIFUL LIFE ADDICTION TREATMENT CENTER |
| `e995c394-a85e-4fa6-87f1-b263cd4d5715` | Pacific Path Recovery Center |

Read-only provenance audit:

| Source | Result |
| --- | --- |
| `facility_subscriptions` | 0 for both |
| `featured_placements` | 0 for both |
| `subscription_events` | 0 for both — **and 0 platform-wide** |
| `plan_change_audit` | 0 for both — **and 0 platform-wide** |
| `stripe_webhook_events` | 0 for both — **and 0 platform-wide** |
| `featured_impressions` / `featured_placement_analytics` | 0 for both |
| `admin_audit_log` | 0 for both — table holds 24 rows, **oldest 2026-06-20** |
| `provider_events` | 49 each (generic analytics, no Featured grant) |
| repo / migrations / git history | no reference to either ID |
| owner `profiles.plan` | `free` for both |
| `featured_pinned` / `featured_display_order` / `last_featured_shown_at` | false / NULL / NULL |

**Both classified UNKNOWN.**

The absence of evidence is *not* evidence here, and saying otherwise would be the
easy mistake: both facilities were created in **February 2026**, four months
before `admin_audit_log` begins, and the three subscription/billing audit tables
are **empty platform-wide**. There is no substrate in which a grant could have
been recorded. A lapsed Pro subscription whose deactivation never ran is
plausible (the retired `deactivateProBenefits` would have cleared the flag on a
clean cancel), but it is not demonstrated.

**No production write.** No `UPDATE facilities SET featured = false`. The code
simply stops treating an unproven boolean as authoritative paid entitlement. B3
establishes the canonical Featured representation and decides their disposition.

### B2.10 `get-featured-rotation` — preserved, audited only

No redesign. Audited against the B2 rules and clean:

- Paid eligibility `INNER JOIN`s `facility_subscriptions` and requires
  `status = 'active'` **and** `has_featured` or `has_concierge_partner`. A
  Pro-only facility (`tier='pro'`, no `has_featured`) cannot enter.
- Stage-2 phone protection intact: `display_phone` resolves through the canonical
  Pro set and falls through to `null`, so Featured-only, Free and fallback rows
  publish no number.
- Organic ranking logic is not reused.
- Unpaid fallback rows carry `is_fallback: true` and are re-labelled "Top-Rated",
  not "Featured".

---

## Static / prerender / SEO

`scripts/_facility-data.mjs`: the Featured badge is removed from organic
aggregate listings, and the misleading `<h2>Featured Facilities in …</h2>`
heading becomes `Treatment Facilities in …`. The unused `featured` column is
dropped from the select. The verified badge is unchanged — it reads
`public_facilities.verified` and will publish the factual value automatically
once the migration is deployed.

`scripts/generate-missing-html.mjs`: the provider-FAQ answer claiming Pro
Visibility "gives you featured placement on homepage, state, and city pages" is
corrected, because it becomes actively false under B2 and ships on a public
static page. **The surrounding unlock-model copy in that FAQ block is
pre-existing Stage-2 debt and is left for Bucket A.**

**Generated-file churn: exactly one file** — `public/provider-faq.html`. The
aggregate generators skip existing files, so the 46,674 tracked static pages were
not rewritten. That is the correct outcome for code-prep: regenerating them now
would bake in production's **old** `verified` mask, which is still live. Static
regeneration is a rollout step, after the migration.

---

## Guard

`scripts/check-directory-trust-ranking.mjs`, wired into `build:vercel`
immediately before `validate:blocking`.

It judges **final source state**, not migration history, and scans
comment-stripped source so documenting a retired behaviour never trips the guard
that retired it. It is mechanism-shaped — no repo-wide ban on the words *Pro*,
*Featured*, *verified* or *ranking*, all of which are legitimate in many places.

Asserts:

**Database** — latest `public_facilities` gates `phone` on `has_active_pro` and
does **not** gate `verified`; Featured never unlocks phone or verified; claimant
visibility and the self-visibility exception survive; `is_claimed` keeps its
canonical form; no migration ordered after the **last** anon closure re-grants
anon SELECT or adds an anon/public SELECT policy on raw `facilities`; no
migration after the **last** drop recreates `get_public_facility_data`.

**Ranking** — no `pro_boost`, no `facility_subscriptions` query, no `isPro` in
the scorer; no wholesale spread of stored settings; the allow-list exists; a
migration strips the stored key; `pro-benefits` writes no `featured`,
`calculated_ranking_score` or `verified` **and still mirrors `profiles.plan`**;
the generated webhook carries none of the retired writes.

**Frontend** — `facilityPlanSort.ts` is not resurrected; no `getPlanRank` /
`getPlanPriority` call sites; the results comparators (scoped to the `.sort`
callback, so unrelated `isPro` on the page is not a false positive) read no
payment signal; no `featured: isPro`; no `isFeaturedPaid`; Pro is not pushed into
Featured eligibility while `proFacilityIds` is still computed; the rotation's
`display_phone` Pro gate and null fall-through survive; the static generator
renders no Featured badge.

**Verified to fail on 13 injected regressions**, each reverted afterwards: verified
re-gated, phone mask removed, claimant exception removed, `pro_boost` restored,
pro-benefits writing the ranking score, `featured: facility.featured || isPro`,
`featured: isPro`, a comparator reading `isPro`, Pro pushed into eligibility, the
webhook re-adding the featured+ranking write, the static Featured badge, the
wholesale settings spread, the plan mirror dropped, the strip migration deleted,
`facilityPlanSort.ts` resurrected, and the rotation's Pro phone gate removed.

The existing guards are **not weakened**. `check:pro-phone-visibility` proves the
*positive* half of the phone contract; this guard proves the *negative* half —
which signals must not be purchasable. Both run.

---

## Two pre-existing issues found and NOT fixed here

1. **`has_active_pro()` excludes `trialing`.** It counts
   `status='active'` with a valid period, or `past_due`. A facility on a Stripe
   trial therefore has no Pro entitlement — no public phone, no media. Out of
   scope per the amendment; **unresolved entitlement issue, needs its own
   decision.**

2. **`FeaturedAnalyticsDashboard.tsx:118`** reads `proFacilityIds` into a local
   named `featuredIds` and treats the Pro pool as the homepage-Featured pool. An
   **admin analytics** surface, not public, and not part of organic ordering.
   Flagged for B3, when Featured gets its canonical representation.

Also noted: `get-featured-facilities` inspects only `subs.data[0]` — the first
active Stripe subscription — so a provider holding both Pro and Featured can be
misclassified. Pre-existing; B3.

---

## Rollout runbook — none of this has been executed

Production is currently at migration head `20260831000000`, still Pro-masks
`verified`, and still stores `pro_boost: 50`.

**Precondition (blocking).** Stripe could not be inspected from this environment
— no key, no CLI. Before rollout, confirm read-only that **zero active external
Featured Stripe subscriptions exist that are not represented in
`facility_subscriptions` / `featured_placements`.** Zero database rows is **not**
sufficient evidence: `get-featured-facilities` grants eligibility directly from a
live Stripe product lookup, so an untracked Featured customer would be invisible
to every table queried above.

1. **Deploy the neutral ranking code** — `calculate-ranking-scores`,
   `_shared/pro-benefits.ts`, `get-featured-facilities`. Do not run anything yet.
2. **Verify the deployed source/version** actually contains the neutral scorer
   (confirm `get-featured-facilities` reports `v2.1.0`). Do not infer from the
   repo.
3. **Apply `20260901000000`** (plan-independent `verified`). Confirm
   `public_facilities.verified = true` now returns **5**, and that phone is still
   NULL for non-Pro — the Tony Rice Center check
   (`3b11bad0-6d79-431c-9e39-605064080a56`) must still return no phone.
4. **Apply `20260901000100`** (strip stored `pro_boost`). Confirm the key is gone
   and every other weight is intact.
5. **Run ONE controlled recomputation** of `calculate-ranking-scores`.
   Zero current Pro subscriptions does **not** mean stored scores are clean —
   historical boosts from lapsed subscriptions can still be baked into
   `calculated_ranking_score`. The recomputation must overwrite **every** derived
   score from neutral inputs. Spot-check the two legacy Featured rows, currently
   17 and 21.
6. **Verify scores**, then **regenerate static artifacts** so the 46,674 prerendered
   pages pick up the factual `verified` values and the neutral ordering.
7. Deploy the webhook **only** after the generator blocker above is resolved.

---

## Validation

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors (baseline 0) |
| `npm run lint` | 216 problems / 180 errors / 36 warnings — identical to baseline |
| `npm test -- --run` | **917 passed, 58 files** (was 875 / 57) |
| `npm run build:vercel` | exit 0, new guard passes in position |
| `check:directory-trust-ranking` | pass; fails on all 13 injected regressions |
| `check:pro-phone-visibility` | pass (not weakened) |
| `check:directory-public-shell` | pass |
| `check:inquiry-routing-prerender` | pass |
| `check:public-navigation` | pass |
| `check:public-directory-truth` | pass |
| `check:provider-admin-directory-model` | pass |
| `validate:blocking` | pass |

**Two pre-existing assertions were updated, not weakened**, because they encoded
the behaviour B1 retires:

- `claim-facility-visibility.test.ts` required
  `case when has_active_pro(id) then verified else false end` — i.e. it asserted
  "paying for Pro is what makes a facility publicly verified" *as the contract*.
  It now asserts the phone mask survives **and** that the verified mask is gone.
- `public-phone-entitlement.test.ts` required the view migration to be the last
  file in the directory. It now requires it to be the newest migration **that
  defines the view**, so unrelated forward migrations may sort after it.

---

## Preview limitation — read this before believing the Preview

The new migration and Edge functions are **not deployed**. The Vercel Preview
talks to production's **old** backend, which still Pro-masks `verified` with zero
Pro subscribers — so the Preview will show `verified = false` everywhere.

> **Preview B1 live-data verification is deferred until the controlled migration
> rollout; source, migration and tests are green.**

That is expected and is not a B1 failure. B1 is proven here by migration-source
assertions, the migration's own fail-closed `DO` blocks, the build guard, and 41
behavioural tests — not by the Preview.

What the Preview **does** prove: the public phone contract still holds, Tony Rice
phone stays absent, navigation and homepage are intact, and the shipped client
bundle contains no payment-ranked organic ordering.

---

## Explicitly not done

- **B3 not started.** No `tier='none'`, no Featured-only checkout, row creation,
  billing migration, cancellation redesign or Stripe change. The prior
  recommendation of `tier='none' / status='inactive' / has_featured=true` is
  **contradicted by the live code**: `get-featured-rotation` INNER JOINs
  `facility_subscriptions` and requires `status='active'`, so
  `status='inactive'` would make a Featured-only paid facility vanish from its
  own paid rotation. B3 needs its own architecture prompt.
- **Bucket A broad copy cleanup not done** — only the two copy sites that
  directly contradict B1/B2 inside already-touched files.
- **Stage 4 not started.**
- No production migration, Edge deploy, Stripe write, production data write,
  ranking recomputation, or cron invocation.
