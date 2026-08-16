# Directory Cutover — Stage 1: Public Website + Seeker Experience

## Scope

RehabLookup is being converted from a directory + placement/concierge platform into a
**true addiction-treatment directory**. This document covers **Stage 1 only**.

Stage 1 is deliberately limited to the **public website and the seeker/client
experience**. After this stage a public or seeker user should understand RehabLookup as:

> "Search, compare, save, evaluate, and directly contact addiction-treatment providers."

The user-facing journey is now: **search → filter → facility profile → compare → save →
contact facility.**

### Explicitly out of scope (untouched)

- Supabase schema, data, RLS, and Edge Functions
- Stripe products, prices, webhooks, checkout, cancellation
- Pro ($99/mo) entitlements and `facility_subscriptions`
- Featured add-on monetization and labelling
- Provider panel, provider onboarding/claim/re-verification
- Admin panel (including the `/admin/concierge` placement workspace)
- Organic ranking behaviour
- Free-vs-Pro inquiry-routing backend (`submit-qualified-lead`) — **Stage 2**

## Branch

`directory-cutover-01-public-seeker`

## Starting main commit SHA

`84a0ecac18ca68cf733d6c97d97e0cfb56d99eed`
("Harden the provider signup, claim, and Pro upgrade funnels before ad launch (#78)")

---

## Audit findings

An initial sweep of `src/`, `public/`, `scripts/`, `tests/`, `index.html`,
`middleware.ts`, `vercel.json` and `supabase/` for `concierge`, `placement`, `advisor`,
`coordinator`, `matched`, `tour`, `admission` and `move-in` found the retired product
present on eight distinct surfaces:

1. **Public routes** — `/concierge`, `/concierge/intake`, `/concierge/thank-you`,
   `/concierge/create-password`, `/request-help/*`, `/placement-help`,
   `/international/apply`, `/international/intake`, `/international/thank-you`.
2. **Public navigation** — a standalone "Concierge" item in the header, an overflow
   ("More") dropdown entry, a "Treatment Placement" footer link, a footer "Get Matched
   Now" CTA band, and concierge CTA cards in all three seeker-facing mega-menus.
3. **Marketing / SEO copy** — ~100 `<Link to="/concierge">` CTAs across the homepage,
   How It Works, search results, city/county/state pages, treatment-type pages,
   near-me pages, SEO landing templates, articles, resources, FAQ, cost estimator,
   comparison, 404/center-not-found, and the entire 27-page `/us-rehab` international
   section (which was built end-to-end around an "international placement team").
4. **Seeker panel** — a `Concierge` primary nav item in both the seeker header and
   mobile bottom nav, a "Placements" KPI tile, a "Resume your placement intake" card,
   the `/account/concierge` workspace (advisor messaging, placement status stepper,
   admission/move-in/tour cards, placement confirmation), and cross-link cards in the
   inbox.
5. **Seeker notifications** — 19 `concierge_*` / `placement_intro` notification types
   deep-linking into `/account/concierge`.
6. **Public facility profile** — an "Accepts Placements" consumer trust badge driven by
   `concierge_network_opted_in`, a Concierge CTA card in the sidebar and mobile stack, a
   30-second "passive concierge rescue" strip, a RehabLookup-coordinated tour request
   modal, a "Get matched" sticky-bar label, and a helpline block promising "we'll route
   you to the right team".
7. **SEO generators + committed prerender output** — the shared page shell
   (`_seo-page-shell.mjs`, `_unique-content.mjs`) emitted a `/concierge` CTA strip and a
   "Free Concierge" footer link into **44,558 committed `public/**.html` pages**, plus
   a `/concierge` sitemap entry and a `public/concierge.html` prerender.
8. **Tests** — three source-contract tests asserted the old concierge routing/wiring.

### Public routes found

| Route | Previous behaviour |
| --- | --- |
| `/concierge` | Concierge landing page (indexed, in sitemap, prerendered) |
| `/concierge/intake` | Multi-step placement intake wizard |
| `/concierge/thank-you` | Post-submit confirmation |
| `/concierge/create-password` | 301 → `/concierge/thank-you` |
| `/request-help`, `/request-help/{intake,thank-you,create-password}` | 301 → the `/concierge` equivalents |
| `/placement-help` | 301 → `/concierge` |
| `/international/apply` | `ConciergeIntake variant="international"` |
| `/international/intake` | 301 → `/international/apply` |
| `/international/thank-you` | 301 → `/concierge/thank-you` |

### Seeker routes found

| Route | Previous behaviour |
| --- | --- |
| `/account/concierge` | Placement case workspace |
| `/account/concierge/:inquiryId` | Single placement case |
| `/account/international` | Redirect into `/account/concierge` |

---

## Files changed

169 source/config files, plus 46,671 regenerated `public/**.html` artifacts.

**Routing / registries**
`src/App.tsx`, `src/lib/routePrefetch.ts`, `src/components/PrefetchLink.tsx`,
`src/lib/ga.ts`, `src/hooks/useUserRole.ts`, `vercel.json`, `public/vercel.json`

**Public navigation**
`src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`,
`src/components/mega-menus/{FindTreatment,Resources,International}MegaMenu.tsx`

**Seeker panel**
`src/components/seeker/{SeekerHeader,SeekerMobileNav,FacilityCard,FeedbackForm}.tsx`,
`src/pages/seeker/{SeekerHome,SeekerRequests,SeekerHelp,SeekerSupport,SeekerSettings,SeekerNotifications,SeekerNotificationPreferences}.tsx`,
`src/lib/seekerNotificationRouting.tsx`

**Facility profile + inquiry surfaces**
`src/pages/CenterProfile.tsx`, `src/components/profile/{RequestInfoModal,StickyMobileCallBar}.tsx`,
`src/components/cards/SearchResultCard.tsx`, `src/components/listings/ResponsiveListingGrid.tsx`

**SEO templates + shared CTAs**
`src/components/seo/{SEOLandingTemplate,ConversionSection,SmartInternalLinks,StateFacilitiesSection,NearMeHero,TreatmentCityHero,TreatmentHubHero,TreatmentStateHero,TrustBar}.tsx`,
`src/components/home/{RecoveryJourneyCTA,TrustStrip,CommonQuestionsSection,ProvidersCTA}.tsx`,
`src/components/{SEO,InternationalBanner}.tsx`, `src/components/conversion/SocialProofBar.tsx`,
`src/components/articles/MidArticleCTA.tsx`,
`src/components/{marketing/MarketingLeadSuccess,lead-intake/LeadIntakeSuccess}.tsx`

**Public pages** (~60) — homepage, search, city/county/state, treatment types, near-me,
insurance, resources, FAQ, About, Contact, How It Works, cost estimator, comparison,
404/CenterNotFound, `/lp/*` landings, `/international`, and all 27 `/us-rehab` pages.

**Data / config**
`src/data/{pageFaqs,testimonials,seoSeekerGuidesConfig,seoComparisonConfig,seoBestInStateConfig,seoInsuranceStateConfig,seoSubstanceConfig,seoSubstanceConfigExpanded}.ts`,
`src/lib/{analytics,contactInfo,copy/stats}.ts`

**Generators / build**
`package.json`, `scripts/_seo-page-shell.mjs`, `scripts/_unique-content.mjs`,
`scripts/generate-{seo-html,missing-html,gsc-recovery-html,facility-profiles-html,resources-html,all-city-pages,missing-city-treatment-pages,missing-nearme-state-pages}.mjs`,
`scripts/check-{hub-routes,ua-routing,vercel-cutover}.mjs`, `scripts/monitor-cutover.mjs`

**Tests**
`src/__tests__/concierge-lifecycle-contracts.test.ts`,
`src/__tests__/messaging-lifecycle-contracts.test.ts`,
`src/lib/__tests__/seekerNotificationRouting.test.ts`

### Files added

| File | Purpose |
| --- | --- |
| `src/components/seo/InlineMiniSearch.tsx` | Directory search widget replacing `InlineMiniIntake` |
| `src/components/search/NoResultsDirectoryCTA.tsx` | Zero-result "widen the search" card replacing `NoResultsConciergeCTA` |
| `src/components/profile/ProfileDirectoryCTACard.tsx` | Facility-profile "keep looking" card replacing `ConciergeCTACard` |
| `src/pages/us-rehab/components/DirectorySearchCTA.tsx` | International-page directory CTA replacing `PlacementCTA` |
| `scripts/sync-prerendered-shell.mjs` | Keeps committed prerender output in sync with the SEO page shell (see below) |

## Files deleted

**Public concierge product (frontend only)**
- `src/pages/concierge/ConciergeLanding.tsx`
- `src/pages/concierge/ConciergeIntake.tsx`
- `src/pages/concierge/ConciergeThankYou.tsx`
- `src/components/concierge/` — `ConciergeCTACard`, `IntakeProgress`, `SmsCallbackFallback`,
  `StepCareNeed`, `StepContact`, `StepEmailVerification`, `StepLogistics`, `StepName`,
  `StepPhoneVerification`, `StepReviewSubmit`, `StepWhoNeedsHelp` (11 files)
- `public/concierge.html`

**Seeker placement workspace (frontend only)**
- `src/pages/seeker/SeekerConcierge.tsx`
- `src/components/seeker/ConciergeInlineIntake.tsx`
- `src/components/seeker/placement/` — `AdmissionStatusCard`, `AdvisorMessaging`,
  `AdvisorTrustCard`, `PlacementConfirmationCard`, `PlacementHero`, `PlacementMatchCard`,
  `PlacementStatusCard`, `PlacementSupportCard`, `PlacementTabs`, `SeekerPlacementModal`,
  `SeekerProviderReviewCard`, `index.ts` (12 files)

**Orphaned CTA / intake components**
- `src/components/conversion/InlineIntakeForm.tsx`
- `src/components/seo/InlineMiniIntake.tsx`
- `src/components/search/NoResultsConciergeCTA.tsx`
- `src/components/profile/ProfileConciergeRescue.tsx`
- `src/components/forms/ContactRequestForm.tsx`
- `src/components/facility/FacilityTourRequestModal.tsx`
- `src/pages/us-rehab/components/PlacementCTA.tsx`

**Client-side concierge helpers**
- `src/lib/conciergeHref.ts`
- `src/lib/conciergeAnalytics.ts`

Every deletion was preceded by a grep for static imports and dynamic references. None of
these files had a remaining runtime consumer outside the removed surfaces.

---

## Redirects added

Redirects are implemented at **two layers**: a Vercel edge `301` (so crawlers and direct
hits get a real permanent redirect) and a React Router `<Navigate>` (so in-app navigation
and any request that bypasses the edge still resolves). No redirect chains were
introduced — `check:redirect-targets` reports `chained: 0`.

### Public (`vercel.json` 301 + `src/App.tsx`)

| Source | Destination |
| --- | --- |
| `/concierge` | `/search-results` |
| `/concierge/intake` | `/search-results` |
| `/concierge/thank-you` | `/search-results` |
| `/concierge/create-password` | `/search-results` (was → `/concierge/thank-you`) |
| `/request-help` | `/search-results` (was → `/concierge`) |
| `/request-help/intake` | `/search-results` (was → `/concierge/intake`) |
| `/request-help/thank-you` | `/search-results` (was → `/concierge/thank-you`) |
| `/request-help/create-password` | `/search-results` (was → `/concierge/thank-you`) |
| `/placement-help` | `/search-results` (was → `/concierge`) |
| `/international/apply` | `/international` |
| `/international/intake` | `/international` (was → `/international/apply`) |
| `/international/thank-you` | `/international` (was → `/concierge/thank-you`) |

`public/vercel.json` was updated to match for `/request-help` and `/placement-help`.

**Query-parameter preservation.** The SPA redirect uses a dedicated
`ConciergeToSearchRedirect` component (`src/App.tsx`). The retired intake accepted
`?location`, `?treatment` and `?insurance` — the exact params `/search-results` already
understands — so a legacy link keeps the seeker's search intent. `state` and `q` are
carried too. Funnel-only params (`?from`, `?channel`, `?id`, attribution tags) are
dropped.

### Seeker (`src/App.tsx`)

| Source | Destination |
| --- | --- |
| `/account/concierge` | `/account/saved` |
| `/account/concierge/:inquiryId` | `/account/saved` |
| `/account/placements` | `/account/saved` (added defensively) |
| `/account/placements/:inquiryId` | `/account/saved` (added defensively) |
| `/account/international` | `/account/saved` (was → `/account/concierge`) |

`/account/concierge` was **kept registered as a redirect on purpose**: the
`placement-monitor` edge function has already sent seeker reminder emails containing that
link, and Stage 1 does not modify edge functions. A source-contract test now asserts the
route stays registered so the link cannot start 404ing.

### Notification routing

All 19 retired notification types (`concierge_intake_received`, `concierge_matches_found`,
`concierge_introductions_sent`, `concierge_options_ready`, `concierge_provider_interested`,
`concierge_provider_confirmed`, `concierge_progress_update`, `concierge_advisor_assigned`,
`concierge_placement_complete`, `concierge_case_closed`, `concierge_message_received`,
`concierge_tour_{proposed,confirmed,completed,cancelled}`, `concierge_admission_updated`,
`concierge_move_in_scheduled`, `concierge_moved_in`, `placement_intro`) now resolve to
`/account/saved`.

**No notification rows or DB enum values were touched.** Existing rows still render with
their stored icon and title; only the destination changed, from a route that no longer
exists to one that does.

---

## User-facing copy removed or replaced

Roughly 130 CTAs and copy blocks. The consistent substitution was an *operational service
promise* → a *directory action*.

| Removed | Replaced with |
| --- | --- |
| "Get Personalized Help" / "Get Matched" / "Get Matched Free" / "Match Me Free" | "Search Treatment Centers" / "Browse Treatment Centers" / "Compare Facilities" |
| "Talk to a Placement Advisor" / "Speak to an Advisor" / "Talk to a Coordinator" | "Search Treatment Centers" / "Search US Centers" |
| "Our placement advisors will match you…" | "Filter by level of care, insurance, and location, then contact them directly" |
| "Free Concierge" / "Concierge Placement Service" / "Concierge Service" | "Compare Facilities" / "Search the Directory" |
| "Our concierge team can verify benefits with your insurer" | "Ask a facility's admissions team to verify your benefits — most do this at no cost" |
| "Start Your Placement" / "We'll place you in the perfect facility" | "Search Treatment Centers" / "Compare programs, then contact them directly" |
| "Admission coordination support" (How It Works) | "Published admissions phone numbers" |
| "Free, confidential placement help from licensed coordinators" | "Browse and compare licensed treatment providers, then contact them directly" |
| Homepage `Service` schema `serviceType: "Treatment Center Placement"` | `"Treatment Center Directory"` |
| `<SEO>` `serviceType: ["Treatment Placement Concierge", "Rehabilitation Center Referral", …]` | `["Addiction Treatment Directory", "Treatment Center Search", "Facility Comparison"]` |
| `/international` page positioned as a placement service (hero, steps, FAQ, schema) | Repositioned as an international-patients directory hub |

Two FAQ answers were rewritten rather than deleted because the old answers were actively
misleading for a directory:

- *"Does RehabLookup recommend specific facilities?"* — previously "Our concierge team
  provides personalized recommendations". Now states plainly that RehabLookup does **not**
  recommend or endorse any individual facility, that organic ranking is never sold, and
  that Featured placements are labelled advertising.
- *"Should I use a placement service?"* — previously promoted the in-house concierge. Now
  gives neutral guidance about third-party placement consultants (including the advice to
  ask how they are paid) and states that RehabLookup is a directory, not a placement
  service.

`conciergeFaqs` in `src/data/pageFaqs.ts` was removed entirely (its only consumer was the
deleted concierge landing).

### Testimonials

Four **seeker** testimonials whose quotes explicitly credited "RehabLookup's concierge
team" were **removed** from `seekerTestimonials`, not rewritten. They describe a service
the platform no longer offers, so continuing to display them would misrepresent the
product; and they are attributed quotes, so editing their words was not an option.
26 seeker testimonials remain. Provider testimonials are untouched.

### Deliberately NOT changed (with reasons)

These are the surviving user-visible mentions. Each is intentional.

| Surface | Why it stays |
| --- | --- |
| `FreeTierRoutingDisclosure.tsx` — "you'll connect with a RehabLookup care coordinator" | **This is an accurate disclosure of live backend behaviour.** `submit-qualified-lead` still routes Free-tier facility inquiries through the concierge redirect, and Stage 1 forbids changing it. Removing the disclosure while the routing persists would leave seekers surprised by a coordinator contact they were never told about. **This is the single highest-priority Stage-2 item.** |
| `InquiryConfirmation.tsx` — "A RehabLookup care coordinator will reach out" | Same reason: it is the post-submit confirmation for that same live Free-tier redirect. |
| `MedicalDisclaimer.tsx` — "Our concierge service provides referral assistance only" | A liability disclaimer scoping a service that is still operating on the backend. Removing it narrows a disclosure while the underlying activity continues. |
| `HowWeMakeMoney.tsx` — Concierge Partner pricing and salaried-advisor disclosure | A revenue-transparency page. Concierge Partner is still a live, purchasable provider product in Stage 1; deleting the disclosure would make the page less accurate, not more. |
| Facility-amenity uses of "concierge services" on luxury/executive pages | Legitimate educational description of what *treatment centers* offer (airport transfers, private chefs). Not a RehabLookup service claim. |
| `ProviderMegaMenu` benefit bullet "Concierge placement", `ProviderValueProp`, two provider testimonials, `SupportTicket*` category label "Concierge Partner" | Provider-facing descriptions of a provider add-on that is still sold. Out of Stage-1 scope. |
| `public/notice-of-privacy-practices.html` | Legal notice describing real data handling for the still-live backend. |
| `CenterProfile` SAMHSA helpline fallback | Kept, but **relabelled**: the block previously said "Call our helpline … we'll route you to the right team". It now names the number as the *SAMHSA National Helpline* and states explicitly that it is "operated by SAMHSA — not by RehabLookup". `.env.example` confirms `VITE_CONCIERGE_HELPLINE` is a SAMHSA fallback (default `+18006624357`). |

---

## Facility profile changes

Preserved in full: name, location, services, levels of care, insurance, reviews,
accreditations, staff, gallery, directions, phone, website, structured data, SEO metadata,
related facilities, and claim/manage-listing behaviour. Featured labels are untouched.

Changed:

1. **"Accepts Placements" badge removed.** The consumer-facing trust chip driven by
   `facility.concierge_network_opted_in` no longer renders. **The `concierge_network_opted_in`
   field itself is untouched** — it is still selected and typed, just not presented as
   product positioning. The badge sat in a `flex-wrap` chip row, so removing it needed no
   layout repair.
2. **`ConciergeCTACard` → `ProfileDirectoryCTACard`.** The sidebar and mobile cards
   previously sold "personalized recommendations, insurance verification included, free
   facility tours coordination". They now offer "Search nearby centers" (seeded with the
   facility's city/state) and "Compare facilities".
3. **Passive concierge rescue strip removed.** A 30-second-delay inline band promising
   "We'll match you with vetted treatment centers … typically within an hour."
4. **RehabLookup-coordinated tour scheduling removed.** The sticky mobile bar's "Tour"
   button and `FacilityTourRequestModal` are gone. The modal had a dual path — seekers
   with an active concierge inquiry wrote to `concierge_tour_requests` (RehabLookup-run
   tour coordination). The third sticky-bar slot is now **Save** for every claim state,
   which previously only appeared for unclaimed listings. `concierge_tour_requests` and
   the admin Tours tab are untouched.
5. **"Get matched" → "Request info"** on the sticky mobile bar for unclaimed listings.
6. **Helpline block relabelled** as the SAMHSA National Helpline (see table above).
7. **At-capacity escape hatch** in `RequestInfoModal` changed from "Use Concierge Service"
   to "Browse Other Centers" + "Compare Facilities"; the post-submit panel's "Our Placement
   Service matches you…" became "Keep comparing centers".

---

## SEO / sitemap changes

### Generator source fixes

The shared shell and the page generators were the root cause, and were fixed at source:

- `scripts/_seo-page-shell.mjs` — `seoCtaStrip()` ("Talk to a recovery advocate today" →
  `/concierge`) is now "Search treatment centers" → `/search-results`; the footer
  Resources column's "Free Concierge" link is now "Compare Facilities" → `/compare`.
- `scripts/_unique-content.mjs` — `renderCta()` action links now point at
  `/search-results` and `/compare`.
- `scripts/generate-{seo-html,missing-html,gsc-recovery-html,facility-profiles-html,resources-html}.mjs`
  — concierge links and "our concierge team can…" copy replaced.
- `scripts/generate-{all-city-pages,missing-city-treatment-pages,missing-nearme-state-pages}.mjs`
  — "free placement guidance from licensed coordinators" copy replaced.
- The `/concierge` entry was removed from `generate-missing-html.mjs`'s page table.

### The committed-prerender gap, and how it was closed

Fixing the generators was **not sufficient**. `public/**.html` is generated output that is
committed to the repo, and the generators only write files that do not already exist. A
change to a shared shell fragment therefore reaches new pages only — **44,558 already
committed pages kept serving the old `/concierge` CTA strip and footer link.**

Rather than hand-editing generated pages, a new script closes the gap:

**`scripts/sync-prerendered-shell.mjs`** rewrites the shared fragments in committed
prerender output so they match what the current shell would emit. Every replacement's
*target* markup is pulled live out of `_seo-page-shell.mjs` / `_unique-content.mjs` at run
time, so the script and the generators cannot drift apart. It is wired into `build`,
`build:dev` and `build:vercel` (immediately after the page generators, before the sitemap
and prerender-manifest steps), and exposed as:

- `npm run sync:prerendered-shell` — rewrite in place
- `npm run check:prerendered-shell` — report-only, exits non-zero on drift (CI-usable)

Result: 44,558 pages synced. `public/**.html` now contains **zero** `href="/concierge"`
links and zero "placement guidance from licensed coordinators" copy. The only remaining
`concierge` mention across 46,674 prerendered pages is
`public/notice-of-privacy-practices.html` (a legal notice describing live backend
behaviour — intentionally retained).

### Sitemap

- `public/concierge.html` deleted; the `/concierge` `<loc>` removed from
  `public/sitemap.xml` (43,152 → 43,151 URLs).
- `generate-sitemaps.mjs` already strips any path that is a `vercel.json` redirect source,
  so adding the `/concierge` 301 makes the exclusion self-maintaining — the retired URLs
  cannot reappear in a future regeneration.
- Redirect compatibility is retained for backlinks and bookmarks while the URLs are
  removed from canonical sitemap discovery, exactly as required.
- **No sitemap-coverage or structured-data guard was weakened or bypassed.**

### Operational probe scripts

`check-ua-routing.mjs`, `check-vercel-cutover.mjs` and `monitor-cutover.mjs` probed
`/concierge` expecting a `200`; they now probe `/compare`. `check-hub-routes.mjs` no longer
classifies `/concierge` as a hub surface. `check-gsc-indexing.mjs`'s `MUST_BLOCK` list was
left as-is (`/concierge/intake` and `/concierge/dashboard` were already robots-blocked;
`/concierge` itself stays crawlable so Google processes the new 301).

---

## Backend dependencies deliberately left in place

**None of the following were removed, modified, or deleted.** This section is the map for
Stage 2.

### Database (untouched — no migration was created)

`concierge_inquiries`, `concierge_introductions`, `concierge_case_events`,
`concierge_messages`, `concierge_tour_requests`, `concierge_partner_facilities`,
`placement_review_requests`, `seeker_notifications` (rows **and** enum values), all
placement/advisor RLS policies, triggers, and the `seeker_confirm_placement` /
`get_seeker_introductions` RPCs.

### Supabase Edge Functions (untouched — none removed or redeployed)

`submit-qualified-lead`, `submit-concierge-intake`, `match-concierge-intake`,
`send-concierge-intake`, `send-concierge-notifications`, `send-concierge-introduction`,
`request-concierge-sms-callback`, `record-introduction-decision`,
`auto-decline-stale-introductions`, `auto-status-transition`, `placement-monitor`,
`save-placement-draft`, `send-placement-review-requests`, `send-tour-notifications`,
`verify-admission`, `get-inquiry-match-candidates`, `get-advisor-partner-distribution`,
`notify-free-tier-inquiry-redirect`, `link-inquiry-to-user`,
`admin-bulk-{update-concierge-status,reassign-concierge-advisor}`,
`audit-review-mark-resolved`, and every cron scheduled against them.

### Surviving frontend references (public/seeker scope)

| File | Dependency |
| --- | --- |
| `src/components/lead-intake/FreeTierRoutingDisclosure.tsx` | Reads facility tier; discloses `submit-qualified-lead` Free-tier concierge redirect |
| `src/components/lead-intake/useLeadIntakeForm.ts` | Handles the `submit-qualified-lead` concierge-redirect response shape |
| `src/components/lead-intake/SingleQuestionFlow.tsx` | Renders the disclosure; comments reference the concierge confirmation page |
| `src/pages/InquiryConfirmation.tsx` | Reads `concierge_inquiries`; renders the coordinator confirmation |
| `src/pages/CenterProfile.tsx` | Selects `concierge_network_opted_in` (no longer displayed) |
| `src/components/profile/RequestInfoModal.tsx` | `handleConciergeFallbackSubmit` → `submit-marketing-lead` when no facility record loaded |
| `src/pages/SeekerSignup.tsx` | Calls `link-inquiry-to-user` to bulk-link pre-signup concierge/VOB rows |
| `src/lib/seekerNotificationRouting.tsx` | Retains all 19 retired types (now routed to `/account/saved`) |
| `src/lib/contactInfo.ts` | `CONCIERGE_PHONE_*` exports still consumed by `InquiryConfirmation` |
| `src/hooks/useFacilitySubscriptionTier.ts` | Powers the Free-tier disclosure gate |

Provider/admin frontend (`src/pages/{provider,admin}`, `src/components/{provider,admin}`)
and `supabase/` are **byte-identical to `origin/main`** — verified with
`git diff --name-only origin/main` returning empty for those paths.

---

## Stage-2 dependencies discovered

Ordered by priority.

1. **Free-tier inquiry routing (`submit-qualified-lead`).** The whole reason
   `FreeTierRoutingDisclosure` and `InquiryConfirmation` still say "care coordinator". Until
   Free-tier inquiries are delivered to the facility (or the facility is told to upgrade),
   the public site cannot honestly claim there is no coordinator. **This is the blocking
   item for a clean directory story.**
2. **`InquiryConfirmation.tsx`** — rewrite once (1) lands; it reads `concierge_inquiries`
   directly and shows a coordinator SLA.
3. **`RequestInfoModal.handleConciergeFallbackSubmit`** — the no-facility-record path
   routes through `submit-marketing-lead`; needs a directory-native fallback.
4. **`placement-monitor` reminder emails** still link `/account/concierge`. Once the cron is
   retired, the `/account/concierge` → `/account/saved` redirect and its guarding test can go.
5. **`send-concierge-notifications` / `send-tour-notifications`** still write the 19 retired
   seeker notification types. Retire the producers before removing the enum values.
6. **`concierge_tour_requests`** now has no frontend writer (the tour modal is deleted) but
   the table, the admin Tours tab, and `send-tour-notifications` remain.
7. **`MedicalDisclaimer` and `notice-of-privacy-practices.html`** — update the concierge
   clauses once the service genuinely stops running.
8. **`HowWeMakeMoney`** — rewrite when Concierge Partner is retired as a provider product.
9. **`CONCIERGE_PHONE_*` in `src/lib/contactInfo.ts`** — rename once `InquiryConfirmation` is
   rewritten.
10. **`concierge_network_opted_in`** — the column is now unread by any public surface and can
    be dropped once provider/admin usage is cleared.
11. **Provider surfaces** — `ProviderMegaMenu` benefit bullet, `ProviderValueProp`, two
    provider testimonials, `SupportTicket*` "Concierge Partner" category label,
    provider-guide pages advertising the "concierge placement network".
12. **`src/assets/images/concierge-matching.jpg`** — still used (imported as
    `directorySearchImg`); rename or replace when convenient.

---

## Testing results

All commands run on the branch.

| Command | Result |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit`) | **PASS** — clean |
| `npm run lint` | 216 problems (180 errors, 36 warnings) — **exactly equal to `origin/main`**; all pre-existing |
| `npm run test` | **PASS** — 45 files, 505 tests |
| `npm run check:internal-links` | **PASS** — 149 links, 0 unmatched, 0 suspicious |
| `npm run check:redirect-targets` | **PASS** — 232 redirects, 164 resolved, 0 dead, **0 chained** |
| `npm run check:no-internal-404` | **PASS** — 46,688 internal paths, all resolve |
| `npm run check:sitemap-coverage` | **PASS** |
| `npm run check:facility-sitemap-sync` | **PASS** |
| `npm run validate:sitemap-robots` | **PASS** — 0 errors |
| `npm run check:structured-data` | **PASS** — 0 errors, 46,666 pages scanned, all JSON-LD valid |
| `npm run check:seo-meta` | **PASS** — 14,321 pages, 0 errors |
| `npm run check:prerendered-shell` (new) | **PASS** — no drift |
| `npm run build:vercel` | **PASS** — full pipeline including `validate:blocking` |

No test or validation script was disabled, skipped, or weakened.

### Test changes made

Three source-contract tests asserted the old concierge wiring. Each was **updated to
preserve its original intent** under the new architecture, never deleted or loosened:

1. `concierge-lifecycle-contracts.test.ts` — the C1/C2 assertion checked that
   `SeekerProviderReviewCard` used the security-definer RPCs instead of blocked direct
   table access. That file is deleted, so the assertion was replaced with a **stronger**
   one: the seeker placement workspace files must not exist, **and** no frontend source
   outside admin/provider may call `seeker_confirm_placement` or `get_seeker_introductions`.
   The C8 assertion was extended to also verify `/account/concierge` is still a registered
   route, so `placement-monitor`'s already-sent emails cannot dead-end.
2. `messaging-lifecycle-contracts.test.ts` (MSG-9) — asserted all 9 concierge types route to
   `/account/concierge`. Its intent was "no emitted type falls through to the generic
   inbox"; it now asserts the explicit `/account/saved` fallback **plus** that no route table
   entry points at a retired route.
3. `seekerNotificationRouting.test.ts` — updated to the new destination and given an
   additional guard that no notification type resolves to `/account/concierge` or
   `/account/placements`.

### Pre-existing failures

- **`npm run lint`: 216 problems (180 errors, 36 warnings).** Proven pre-existing by running
  `eslint` in a clean `git worktree` at `origin/main` (`84a0ecac`), which produced the
  identical count. Almost all are `@typescript-eslint/no-explicit-any` in `supabase/functions/**`.
  During this work `eslint --fix` incidentally repaired 3 of these in
  `ProMultiFacilityOverview.tsx`, `ConciergeAnalyticsWidget.tsx` and `OwnersTab.test.tsx`;
  **those three files were reverted to `origin/main`** to keep the branch's provider/admin
  surface byte-identical, so the count matches main exactly.
- **`validate:sitemap-robots`: 1 warning** — 3,249 prerendered pages not in `sitemap.xml`
  and not robots-blocked. Identical warning and identical count on `origin/main`.
- **`check:sitemap-coverage`: 1 warning** — `/best-rehab-centers-in-` dropped 51 → 50 URLs.
  Identical on `origin/main`.
- **`check:structured-data`: 1 warning** — missing `public/rehab-centers.html`. Pre-existing.
- **`check:spa-titles`** skips without `BASE_URL` (needs a running server) — unchanged behaviour.
- `npm run check:gsc-indexing`, `check:broken-links` and `test:visual` require network/live-host
  access and were not run in this sandbox.

---

## Risks / open questions

1. **The Free-tier coordinator disclosure is the one surviving contradiction.** The public
   site now presents a pure directory, but a seeker who submits an inquiry on a Free-tier
   listing is still told a RehabLookup care coordinator will contact them — because that is
   still what happens. This was retained deliberately (removing accurate disclosure while the
   behaviour persists would be worse than the terminology inconsistency), but it means Stage 1
   does **not** fully deliver "no statement promising a coordinator will call". **Stage 2 item
   #1 resolves it.**
2. **44,558 prerendered pages were rewritten.** The diff is enormous but mechanically uniform:
   two shell fragments plus one CTA copy string, all derived from the generators. Verify by
   running `npm run check:prerendered-shell` (exits 0) and spot-checking any page.
3. **`/concierge` loses accumulated ranking signal.** It was indexed and in the sitemap. The
   301 to `/search-results` passes signal, but a directory search page will not rank for the
   same queries. Expect an impressions dip on concierge-intent terms.
4. **Redirect-target choice for `/international/*`.** `/international/apply` goes to
   `/international` rather than `/search-results`, because `/international` remains a real
   informational hub (rewritten as a directory page). If the international hub is later
   retired, these need re-pointing.
5. **`InternationalLanding` was rewritten, not deleted.** It is an indexed page with many
   inbound internal links, so preserving the URL was the lower-risk choice. Its content is now
   directory-oriented and it no longer sells a placement service.
6. **Four seeker testimonials were removed**, reducing seeker social proof from 30 to 26. This
   was preferred over rewriting attributed quotes.
7. **Sticky mobile bar third slot** is now always "Save". Previously claimed listings showed
   "Tour". No layout regression (same three-column grid), but it is a behaviour change on the
   most-used mobile affordance.
8. **`is_concierge_partner` / `concierge_network_opted_in` remain in the schema and in
   `CenterProfile`'s select.** Intentional per the brief, but they are now dead weight on the
   public read path.

---

## Confirmations

- **No production Supabase changes.** `supabase/` is byte-identical to `origin/main`.
- **No DB migration created.** No compile-time dependency required one.
- **No Edge Function removed, modified, or redeployed.**
- **No Stripe change.** No product, price, webhook, checkout, or cancellation code touched.
- **No Pro ($99/mo) change.** Entitlements, `facility_subscriptions`, and gating untouched.
- **No Featured change.** Featured labels, rotation, and monetization untouched.
- **No Vercel/production deployment performed.**
- **No verification semantics changed.** No new "verified treatment center" claims introduced;
  Pro verification badges untouched.
- **No organic ranking behaviour changed.**
- **No test or validation script disabled or weakened.**
