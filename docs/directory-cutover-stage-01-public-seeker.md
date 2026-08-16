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

---

# Independent Verification Hotfix

Added after this branch's Vercel Preview was reviewed independently. The review found a
**public shell the original stage-1 audit never inspected**, so the deployed Preview was
still marketing the retired Concierge/placement product on the homepage.

## What was missed

Root **`index.html`** — the Vite SPA shell, and therefore the `<noscript>` document served to
every crawler and JS-less visitor for the homepage. The stage-1 commit rewrote ~47k prerendered
pages and left this file **byte-identical to pre-cutover `main`**.

Stale claims it was still shipping:

| Class | Verbatim text in the deployed Preview |
| --- | --- |
| Concierge product | `24/7 Concierge Support` — "Confidential help available around the clock via our **free concierge placement service** staffed by **trained recovery advocates**" |
| Matching service | "Our **directory and matching services** are completely free…" |
| Placement assistance | `Connect:` "Contact facilities directly or use our free concierge service for **personalized placement assistance**" |
| Advocate staffing | "**Our recovery advocates are standing by 24/7.** Take the first step…" |
| Retired CTA | `<a href="/concierge" class="ns-cta">Find Treatment Now →</a>` |
| Retired prefetch | `<link rel="prefetch" href="/concierge" as="document" />` |
| Over-strong verification | "Every treatment center is verified for licensing, accreditation, and **quality of care by our dedicated verification team**" |
| Over-strong insurance | "**we verify your benefits with your carrier** at no cost" |

## Why the stage-1 validation did not catch it

Two independent gaps, both structural rather than accidental:

1. **The audit's search scope was `public/**/*.html`.** That is where the prerendered corpus
   lives, so it looked exhaustive. Root `index.html` sits outside that glob — it is a Vite
   *source* file, not generated output — and was never searched.
2. **`check:prerendered-shell` is a DRIFT check, not a CONTENT check.** It asks "does this
   committed page still match what the current generator would emit?" Root `index.html` is
   hand-authored and no generator owns it, so there is nothing for a drift check to compare
   against. It passed while the artifact was wrong.

The build was green, all 505 tests passed, and the bad HTML shipped to the Preview anyway.
That is precisely the failure mode the new guard exists to close.

## What was changed

**`index.html`** — public/noscript shell rewritten to describe a directory. The non-JS journey
is now **Search → Compare → Review → Contact**:

- `24/7 Concierge Support` bullet → **`Save & Compare`** (save facilities, compare side by side,
  resume your search) — a capability the product actually has.
- `Free Service` ("directory and matching services") → **`Free to Search`**.
- `Connect` step → **`Contact:` "Call the facility, visit its website, get directions, or
  request information where available."** RehabLookup no longer promises placement assistance.
- `Compare` split into **`Compare`** (side-by-side) and **`Review`** (facility profile detail).
- Closing CTA "Our recovery advocates are standing by 24/7" → **"Search verified treatment
  centers by location, level of care, and insurance accepted. Free to browse, no account
  required."**
- `href="/concierge"` CTA → **`href="/search-results"` "Search Treatment Centers →"**.
- `prefetch /concierge` → **`prefetch /search-results`** (swap, not an addition — the existing
  `/rehab-centers` prefetch is unchanged, so the prefetch count is the same as before).
- The 24/7 helpline phone links were **kept**, consistent with `seoHeader()` in the stage-1
  public HTML shell, which also still renders `Call 24/7 · (214) 639-6420`.

**Verification copy** — reworded to the *conservative wording already established in the React
product*, not to a new trust model. `src/data/pageFaqs.ts` states facilities "go through a
verification process that checks licensing, accreditation, and operational status". The shell
now matches that and drops both `quality of care` and `our dedicated verification team`. No
clinical verification, quality-of-care certification, or medical endorsement claim was
introduced. **The full verification/Pro/ranking redesign remains a later stage.**

**Insurance copy** — the Insurance Verification *feature* is untouched and still listed. Only
the promise was weakened to match the live React homepage ("Most insurance plans cover
addiction treatment. Check your benefits in minutes.") and `pageFaqs.ts` (facilities' admissions
teams verify benefits). "We verify your benefits with your carrier at no cost" is gone.

**Two additional stage-1 public/seeker copy misses** found by the same audit and fixed here:

- `src/pages/CountyPage.tsx` — empty-county fallback offered "get personalized placement help"
  → "search the full directory".
- `src/pages/SeekerSignup.tsx` — the "Compare Facilities" benefit was subtitled "Get
  personalized placement assistance" → "Put saved centers side by side".

**`scripts/_seo-page-shell.mjs`** — one stale header comment still described `seoCtaStrip()` as
the "Talk to a recovery advocate" CTA. Comment only; the emitted markup was already corrected in
stage 1.

## Regression guard added

**`scripts/check-directory-public-shell.mjs`** — `npm run check:directory-public-shell`.

A **content** check that complements the existing **drift** check. It validates *public
artifacts*, deliberately not the repository:

| # | Inspected | Why |
| --- | --- | --- |
| 1 | `index.html` | the exact file stage 1 missed; **hard-fails if absent** so it cannot silently no-op |
| 2 | `dist/**/*.html` (incl. `dist/index.html`) | the real build output — what Vercel actually serves |
| 3 | `public/**/*.html` | the committed prerendered corpus |
| 4 | `scripts/_seo-page-shell.mjs`, `scripts/_unique-content.mjs` | shared fragments injected into 2 and 3; guarded at source so a reintroduction fails immediately rather than one full regeneration later |

It fails on retired-route links **and** prefetches (`href="/concierge"`, `/request-help`,
`/placement-help` — one rule, since a prefetch is also an `href`), plus the verbatim marketing
phrases: `free concierge placement service`, `24/7 Concierge Support`, `personalized placement
assistance`, `trained recovery advocates`, `recovery advocates are standing by`, `talk to a
recovery advocate`, RehabLookup-operated matching/placement/advocate-staffing claims,
`placement guidance from licensed coordinators`, and `we verify your benefits`.

**Deliberate non-triggers** — a naive repo-wide grep would be useless here, because the legacy
URLs must keep resolving:

- `vercel.json` redirects, the React Router `Navigate` routes, and the tests documenting both —
  **not scanned**; they must keep naming the retired paths.
- Provider/admin/backend code, edge functions, migrations, docs — **not scanned**; later stages.
- The bare word "concierge" is **not banned**. Luxury-rehab pages legitimately describe a
  *facility's* "24/7 concierge services" as an amenity, and those must keep working.
- **Legal notices** (`notice-of-privacy-practices.html`, `privacy-policy.html`,
  `terms-of-service.html`) are exempt from the two *shape-matching* rules only. The HIPAA notice
  accurately discloses that inquiries can reach "our concierge advocates" — that is **still true
  until stage 2**, and rewriting it now would make the notice false. Retired-route links and the
  verbatim marketing phrases still fail on legal pages. **Stage 2 must revisit these files.**

Wired into both shipping build paths **after `vite build`**, so it inspects a freshly built
`dist` rather than a stale one:

- `build` → `… && vite build && … && npm run check:directory-public-shell`
- `build:vercel` → `… && vite build && npm run check:directory-public-shell && npm run validate:blocking`

No existing validation was weakened, disabled, or reordered.

**Verified both directions.** Against the stale pre-hotfix `dist/index.html` the guard flagged
all 6 rule classes and exited 1. After the fix and rebuild it exits 0 across 93,352 artifacts.
The regression was then deliberately reintroduced into root `index.html` and the guard failed
again with exit 1 — confirming it catches this exact bug at the source file, not only in `dist`.

## Confirmations for this hotfix

- **Backend coordinator routing is STILL intentionally deferred to stage 2.** Free-tier "Request
  Information" submissions can still be redirected into RehabLookup's coordinator workflow. That
  contradiction is real and unfixed. The shell copy was therefore written around the facility's
  own phone/website/directions and the existing search/compare/save functions — it does **not**
  claim that every on-platform inquiry goes directly to the facility.
- **Legacy redirects remain**, verified at both layers. All nine paths (`/concierge`,
  `/concierge/{intake,thank-you,create-password}`, `/request-help`,
  `/request-help/{intake,thank-you,create-password}`, `/placement-help`) still 301 to
  `/search-results` in `vercel.json` and still resolve through `ConciergeToSearchRedirect` in
  `src/App.tsx`. `check:redirect-targets` reports 0 dead and 0 chained.
- **No provider, admin, or backend surface was changed.** The diff is 5 files plus 1 new script.
- **No Supabase change. No DB migration. No Edge Function change. No Stripe change. No Pro
  change. No Featured change.**
- **Nothing promoted to production.**

## Noted for a later dedicated review

1. `scripts/generate-missing-html.mjs` still carries `/placement-help` and `/request-help` page
   definitions whose descriptions market "placement specialists" and "personalized help". They
   are **inert today** — the generator refuses to emit any path that `vercel.json` redirects, and
   it deletes stale conflicting files. Left in place to keep this diff narrow. If that
   redirect-conflict guard ever regresses, the emitted files land in `public/` and `dist/`, where
   rules 2–3 of the new guard catch them.
2. The **HIPAA Notice of Privacy Practices** describes the concierge intake and "our concierge
   advocates" under Communications and Service delivery. Accurate today; must be revised in
   stage 2 alongside the backend, with legal review.
3. `src/pages/us-rehab/{LuxuryRehabAmerica,CelebrityRehabUSA}.tsx` mention "24/7 concierge
   services" as a **facility amenity**. Correct as written and intentionally left alone.

---

# Independent Verification Hotfix #2 — live resource content

Added after the **actual Vercel Preview** for `2cc21e17` ("fix: remove retired concierge copy
from the public SPA shell") was inspected. Where hotfix #1 was found by reading the deployed
HTML, this one was found by reading the deployment *state*: the Preview never became `READY`.

| | |
| --- | --- |
| Deployment | `dpl_HTmaBGNENkdentN8A3boRHkUQoDA` |
| State | **ERROR** |
| Failing step | `npm run build:vercel` exited 1 |
| Failing check | `check:directory-public-shell` |

The guard flagged `dist/resources/rehablookup-april-2026-analytics-milestone.html` and
`public/resources/rehablookup-april-2026-analytics-milestone.html` for `href="/concierge…"`.

**The guard was right and is not being weakened.** It caught a real regression that the
committed repository did not contain.

## The two misses, in order

1. **Hotfix #1 — root `index.html`.** The stage-1 audit globbed `public/**/*.html`; the
   hand-authored Vite SPA shell sits outside that glob and shipped unchanged. Content-checked
   now by `check:directory-public-shell`.
2. **Hotfix #2 — live database content.** Both prior passes only ever inspected *committed*
   files. Two `public.blog_articles` rows still describe the retired product, and those rows are
   injected into the public site **during the build**, not from the repository.

## Why the local build passed and the real Vercel build failed

`build:vercel` runs `generate:resources-html` **before** `check:directory-public-shell`:

```
… generate:resources-html … → vite build → check:directory-public-shell → validate:blocking
```

`scripts/generate-resources-html.mjs` fetches every published row from `public.blog_articles`
over the Supabase REST API and **overwrites** `public/resources/<slug>.html` for each one.

- **Locally**, Supabase is unreachable (this sandbox's egress policy answers `403 Host not in
  allowlist` for `mldbxpntzcjalgjmwnqa.supabase.co`). The generator catches the fetch failure and
  — by design, so a transient REST blip cannot break a deploy — logs *"Skipping resources
  prerender for this build"* and returns 0. The committed mirrors were therefore never
  regenerated, the guard scanned the clean committed copies, and the local build went green.
- **On Vercel**, the fetch succeeds. Both pages were rebuilt from live production content,
  reintroducing the retired copy including a Markdown CTA to `/concierge/intake`, and the guard
  correctly failed the deploy.

This is the important structural lesson: **a green local `build:vercel` is not evidence about
any build step that reads live data.** The two are not the same build.

Compounding it, the committed `public/resources/*.html` files are generic stubs emitted by
`generate-missing-html.mjs` — **none of the 194 contains a real article body**. Grepping them
for retired copy could never have surfaced this; the article HTML only exists at deploy time.

## The two affected Platform News slugs

Both are RehabLookup-authored articles about RehabLookup itself, so the copy is
*self-description of the operating model* — not editorial writing about third parties.

**`rehablookup-april-2026-analytics-milestone`** — users "connect with advisors"; "The Concierge
Placement Network — free domestic placement support for clients"; "expanding our international
placement network"; thanks addressed to advisors; "our advisors are available 24/7"; and a
Markdown link to `/concierge/intake`.

**`ceo-chiedu-kabakwu-scaling-rehablookup`** — "our 24/7 placement advisors"; "human advisors
when you need them"; "The Concierge Placement Network — a free domestic, refundable
international placement service"; "24/7 advisor coverage"; "real advisors"; "Deepening the
placement network"; thanks addressed to advisors; and a `meta_description` advertising "the
placement network, and a 24/7 advisor team". It also asserted **"We are not building a
directory."** — flatly contradictory now that the product is explicitly becoming one.

## The shared compatibility override

**`src/lib/directoryArticleOverride.ts`** — one dependency-free module, one pure function:

```
applyDirectoryArticleOverride(article) → article
```

- **Exact-slug allowlist.** Any other slug is returned by *identity* (same object reference).
- **Not a keyword sanitizer.** "placement", "advisor" and "concierge" stay legal English:
  interventionists arrange placement, states run placement programs, EAPs assign advisors, and
  luxury facilities advertise their own concierge amenities. A generic replace would corrupt all
  of it. A control fixture asserts exactly those four usages survive untouched.
- **Whole-field replacement, not find-and-replace.** A targeted patch would silently stop
  covering an article the moment someone edited the row in the CMS.
- **Historically honest.** It removes *present-tense* claims that RehabLookup still operates a
  placement/advisor service and removes CTAs to retired routes. Verifiable history — the April
  2026 analytics, the growth figures, the mission, the engineering work — is preserved verbatim.
  Retired CTAs become `/search-results`; the CEO pull quote becomes the directory-first framing.

## Both rendering paths are protected

Fixing only the generator would have left a JS-enabled visitor navigating inside the SPA seeing
the old narrative straight from the database.

| Path | File | Where the override is applied |
| --- | --- | --- |
| **A — static / crawler** | `scripts/generate-resources-html.mjs` | first statement of `renderArticleHtml()`, **before** meta title/description, JSON-LD, body rendering and Markdown link rendering |
| **B — React / human** | `src/pages/ArticleDetail.tsx` | in the `useQuery` `queryFn`, at the data boundary — so SEO tags, structured data, word count, internal-link extraction, the article body and the share bar all consume the same object |

Both call the same function, so the prerender and the hydrated page cannot contradict each
other. A test asserts `renderArticleHtml(rawRow) === renderArticleHtml(override(rawRow))`.

`generate:resources-html` now runs as `node --experimental-strip-types` so the `.mjs` generator
can import the shared `.ts` module (`.nvmrc` pins Node 22; the flag is already used by
`generate:county-pages`). `renderArticleHtml` is exported and `main()` only auto-runs when the
script is invoked directly, so tests can drive the real renderer offline.

## Regression coverage that does not need the network

The previous pass's tests could not reproduce Vercel because Supabase was unavailable. Now:

- **`src/lib/__fixtures__/legacyPlatformArticles.ts`** — verbatim snapshots of both live rows
  (captured with a **read-only** production query), plus a control editorial article seeded with
  the third-party placement/advisor/concierge vocabulary a naive sanitizer would destroy.
- **`src/lib/__tests__/directoryArticleOverride.test.ts`** — 29 tests, no network. They assert
  the fixtures *still contain* the retired copy (so the suite cannot go vacuously green), then
  that both slugs are rewritten, an unrelated article is returned untouched, `/concierge/intake`
  is replaced, the Concierge Placement Network and placement-advisor claims are gone, the
  metadata is directory-compatible and within the 160-char budget, and the static renderer emits
  the same clean output the React path receives.
- **`check:directory-public-shell` strengthened**, not weakened: 12 new phrase-specific rules
  (`the concierge placement network`, `24/7 placement advisor(s)`, `24/7 advisor coverage`,
  `24/7 advisor team`, `free domestic placement support`, `free domestic … placement service`,
  RehabLookup-owned placement network, `our advisors are available 24/7`, `connect with
  advisors`, `reach out to our advisors`, `we are not building a directory`). **Every rule was
  first probed against all 46,675 committed HTML artifacts and returned zero matches**, so none
  can false-positive on existing editorial content. Bare `placement` / `advisor` / `concierge`
  remain legal. The two slugs are **not exempted** — they are named in the guard's output so CI
  states explicitly that they were in scope.

## Production database is deliberately untouched

**No `UPDATE`/`INSERT`/`DELETE` was run. No migration was created.** The two `blog_articles`
rows remain stale on purpose: the public site had to become correct **without** requiring a
production data write, because the Vercel build was already failing.

**Dependency for a later stage:** normalize these two rows in the backend/data cleanup stage.

| Row | `id` |
| --- | --- |
| `rehablookup-april-2026-analytics-milestone` | `df1cb689-3926-4888-a77a-f35513661d69` |
| `ceo-chiedu-kabakwu-scaling-rehablookup` | `ab2cb34a-2e7b-4178-809e-e781cb9b50db` |

Once rewritten upstream, `src/lib/directoryArticleOverride.ts`, its fixtures and the
`LEGACY_ARTICLE_MIRRORS` list can all be deleted. Until then the override is the source of
truth for what the public actually sees, and the CMS cannot regress these two pages.

## Scope

**No Stage 2 inquiry-routing work has started.** Backend coordinator routing, the
`submit-*`/`match-concierge-intake`/`placement-*` edge functions, Stripe, Pro, Featured,
`facility_subscriptions`, and all provider/admin surfaces are untouched by this hotfix.

---

# Independent Verification Hotfix #3 — public positioning (matching CTA + support line)

**Starting SHA:** `6eb235277519d4639c427c4f1c4e14107a3a1bfa` (tip of
`directory-cutover-01-public-seeker` after hotfix #2)

This is still Stage 1. No Stage-2 inquiry-routing work was started.

## The Preview was healthy — and still wrong

Independent verification confirmed everything hotfix #2 claimed:

- Vercel Preview `dpl_6i72VRWkT2F7KZjoWtBM9XxPPYtf` reached **READY** on
  `6eb2352`.
- `generate:resources-html` ran against **live** Supabase inside that build and
  regenerated the resource mirrors from production rows.
- Both stale Platform News articles were correctly overridden; no `/concierge`
  or `/concierge/intake` CTA survived on either.
- No production Supabase write occurred.

Then the verifier fetched the **actual HTML from the READY deployment** rather
than trusting the local build, and found two public-positioning contradictions
that every prior check had passed over.

### Miss 1 — a matching-service CTA on every resource article

`scripts/generate-resources-html.mjs` called:

```js
seoCtaStrip({
  blurb: "Free, confidential matching to verified treatment centers that fit your needs."
})
```

So every generated `/resources/<slug>` page told the reader RehabLookup would
match them to treatment centers. Stage 1's target is a **directory** — search →
filter → compare → inspect → save → contact the facility — not
*submit information → RehabLookup matches you*.

### Miss 2 — the support number sold as a treatment helpline

`scripts/_seo-page-shell.mjs` rendered RehabLookup's own number as:

```html
<a href="tel:+12146396420" aria-label="Call our 24/7 helpline">Call 24/7 · (214) 639-6420</a>
```

on all ~46k prerendered pages, and root `index.html` paired the same number with
a "Confidential, 24/7" promise. The homepage description (from
`src/lib/seo/titles.ts`) additionally advertised "Free insurance verification.
24/7 confidential help." — two services RehabLookup does not perform: carrier
verification is done by facility admissions teams, and there is no
non-placement support policy in this repository establishing a 24/7 service
level.

## Why the existing guard allowed both

Every rule in `check-directory-public-shell.mjs` required either a **first-person
possessive** (`our…`, `RehabLookup's…`) or a **retired product name** (`the
concierge placement network`, `24/7 placement advisors`, …). That was the right
shape for the copy hotfixes #1 and #2 chased, and it is why those rules could be
added without a single false positive across 46k artifacts.

Both of these claims market by **context** instead. "Free, confidential matching
to verified treatment centers" has no possessive and names no product — it is
RehabLookup's own site chrome, sitting directly above RehabLookup's own CTA
button, and that placement is what makes it a first-person claim. Same for the
phone: the words "Call 24/7 · helpline" are only a RehabLookup claim because the
number beside them is RehabLookup's.

Two structural gaps compounded it:

1. **Caller-supplied blurbs were invisible to the guard.** It scanned the shared
   `_seo-page-shell.mjs`, whose *default* blurb was already directory-safe. The
   offending copy lived in a **caller**, and the pages it fed are regenerated
   from live Supabase during `build:vercel` — so no committed artifact carried
   it either. Exactly the hotfix-#2 failure mode, one layer up.
2. **`check:prerendered-shell` is a drift check, not a content check.** It only
   knows fragments it has been told about.

## What changed

### Resource CTA (Task 1)

`generate-resources-html.mjs` now calls `seoCtaStrip()` with **no blurb**, so it
inherits the shared directory-safe default:

> **Search treatment centers**
> Free to browse, no account required. Filter licensed treatment centers by
> location, level of care, and insurance accepted.
> **[Search Treatment Centers →]** → `/search-results`

No substitute phrasing was introduced — not "personalized matching", "find your
best match", "we match you", "care navigation" or "placement guidance".

### SEO CTA call-site audit (Task 2)

Every caller of `seoCtaStrip()` was inspected:

| Call site | Blurb | Verdict |
| --- | --- | --- |
| `generate-resources-html.mjs:461` | custom — "Free, confidential matching to verified treatment centers that fit your needs." | **FIXED** — custom blurb removed, now uses the shared default |
| `generate-county-pages.mjs:175` | custom — "We'll help you find verified treatment in `<State>`." | **FIXED** — "we'll help you find" casts RehabLookup as the intermediary; now "Filter verified treatment centers in `<State>` by location, level of care, and insurance accepted." |
| `generate-seo-html.mjs:315` | none (shared default) | already directory-safe |
| `generate-missing-html.mjs:87` | none | already directory-safe |
| `generate-gsc-recovery-html.mjs:222` | none | already directory-safe |
| `generate-all-missing-html.mjs:171` | none | already directory-safe |
| `generate-remaining-nearme.mjs:116` | none | already directory-safe |
| `generate-missing-nearme-html.mjs:115` | none | already directory-safe |
| `generate-final-missing.mjs:128` | none | already directory-safe |
| `sync-prerendered-shell.mjs:48` | none — reads the helper to derive current markup | not a page emitter |

The equivalent static CTA helper `renderCta()` in `_unique-content.mjs` and its
three callers were audited on the same criteria:

| Call site | Copy | Verdict |
| --- | --- | --- |
| `_unique-content.mjs:292` `renderCta()` | actions are `Search Treatment Centers` → `/search-results` and `Compare Facilities` → `/compare` | already directory-safe |
| `generate-all-city-pages.mjs:221` | "Verified `<City>`, `<ST>` treatment options — compare programs, insurance accepted, and levels of care." | already directory-safe (body copy fixed in hotfix #1) |
| `generate-missing-city-treatment-pages.mjs:462` | "…compare programs, insurance accepted, and levels of care." | already directory-safe |
| `generate-missing-nearme-state-pages.mjs:230` | "Browse and compare licensed `<State>` treatment providers, then contact them directly." | already directory-safe |

`generate-facility-profiles-html.mjs` builds its own CTA rather than using either
helper; its copy ("Get verified program details, insurance verification, and
admissions information **directly from this facility**") attributes the work to
the facility, not to RehabLookup, so it is directory-safe as written.

**All other call sites were already directory-safe.** Only the two custom
`seoCtaStrip()` blurbs described RehabLookup as an intermediary.

One phrase was audited and deliberately left alone: `generate-all-city-pages.mjs`
uses the headline "Get confidential help in `<City>`" above buttons that read
*Search Treatment Centers* and *Compare Facilities*. It describes the reader's
goal, not a service RehabLookup performs, and its body copy already lists
directory actions — changing it would be removing legitimate vocabulary rather
than an intermediary claim.

### Support-phone semantics (Task 3)

`214-639-6420` / `tel:+12146396420` **stays**. It is RehabLookup's real general
support number and it is not being hidden. What changed is how it is *labelled*:

| Surface | Before | After |
| --- | --- | --- |
| `_seo-page-shell.mjs` header (~46k pages) | `Call 24/7 · (214) 639-6420`, `aria-label="Call our 24/7 helpline"` | `Support · (214) 639-6420`, `aria-label="RehabLookup support — (214) 639-6420"` |
| `index.html` noscript hero | `📞 Call Now: 214-639-6420 — Confidential, 24/7` | `Need help using RehabLookup? Support: 214-639-6420` |
| `index.html` noscript closing CTA | `📞 214-639-6420` (unlabelled) | `Questions about the directory? RehabLookup Support: 214-639-6420` |
| `index.html` footer | `… \| 214-639-6420` | unchanged — already neutral |

No promise of treatment recommendations, placement assistance, matching,
admission coordination, clinical guidance or crisis counselling is attached to
it, and no "24/7" claim is made about it.

**Genuine crisis resources are untouched and stay clearly distinct:** 911, 988
(Suicide & Crisis Lifeline) and SAMHSA's National Helpline (1-800-662-4357)
continue to appear, correctly attributed, in the shared footer disclaimer on
every page and in the homepage FAQ. Nothing implies the 214 number is SAMHSA.

The CSS class `.rl-helpline` is deliberately **not** renamed: it is a styling
hook inlined into ~46k committed pages whose `<style>` blocks
`sync-prerendered-shell.mjs` does not rewrite, so renaming it would unstyle the
whole corpus for no reader-visible benefit.

### Root meta copy (Task 4)

`DESCRIPTIONS.home` in `src/lib/seo/titles.ts` — which `vite.config.ts`
substitutes into `index.html`'s `description`, `og:description` and
`twitter:description` at build time, and which `src/pages/Index.tsx` feeds to
`<SEO />` — changed from:

> Search 3,800+ verified addiction treatment centers. Compare drug rehab, alcohol treatment, detox programs. **Free insurance verification. 24/7 confidential help.**

to:

> Search 3,800+ verified addiction treatment centers. Compare drug rehab, alcohol treatment and detox programs **by location, level of care and insurance.**

150 characters, inside the SERP budget. The static values in `index.html` were
set to the same string so source and build agree. Search intent is preserved —
treatment-center search, comparison, drug rehab, alcohol treatment, detox,
levels of care, insurance — expressed as directory *actions the visitor takes*
rather than services RehabLookup performs. Canonical, `og:*`, `twitter:*`,
structured data and indexing directives are unchanged.

### Public-directory guard (Task 5)

`check-directory-public-shell.mjs` gained two rule families. **No existing rule
or exemption was weakened.**

**Matching-offer rules (5 new).** They name the *offer shape* rather than
requiring a possessive:

- `confidential matching to … treatment centers` (the exact shipped string and
  close variants)
- `matching to … that fit your needs`
- free / personalized / instant matching to centers, facilities, providers or
  programs
- `we'll match you` / `find your best match`
- `we'll (help you) find <treatment|rehab|centers|facilities|programs>`

The bare word **`matching` is not banned** — editorial content legitimately
matches patients to a level of care and insurers run network matching, and a
test asserts that prose survives.

**Support-number semantics (9 new claims).** These are anchored to
RehabLookup's number: the document is split into block-level segments and a
claim only counts if it appears in the **same block** as the 214 number.
Character-distance windows were tried first and produced a false positive —
the shared footer carries "free, confidential, 24/7" for SAMHSA on every page —
so block scoping is what makes SAMHSA / 988 / 911 and third-party helplines
structurally unreachable by these rules. `class=` / `id=` attributes are
stripped before matching so the `.rl-helpline` styling hook is not read as copy;
`aria-label` is **not** stripped, because screen-reader users hear it.

Scope additions: the guard now also scans `generate-resources-html.mjs` and
`generate-county-pages.mjs` — the only two generators that pass caller-supplied
CTA blurbs — so a reintroduced blurb fails at the source instead of one full
regeneration later. `index.html`, `public/**/*.html`, `dist/**/*.html`,
`_seo-page-shell.mjs` and `_unique-content.mjs` remain in scope exactly as
before.

The guard's CLI half now runs behind an `invokedDirectly` check and its rule
tables plus `scanText()` / `phoneSemanticViolations()` are exported, so the test
suite drives **the same rules CI enforces** rather than a copy that could drift.

### Committed-corpus sync

`sync-prerendered-shell.mjs` gained the header-anchor replacement (derived live
from `seoHeader()`, never hand-written) and a `REGEX_FIXES` mechanism for
templated copy, used for the per-state county blurb. Applying it rewrote
**46,670** committed pages; the entire `public/` diff is exactly those two
substitutions and nothing else.

## Regression tests (Task 7)

New: `src/lib/__tests__/directoryPublicPositioning.test.ts` — 50 tests, no
network.

- **Resource CTA** — the real `renderArticleHtml()` over committed fixtures
  asserts the matching blurb is absent (and `confidential matching`,
  `matching to treatment centers`, `that fit your needs` with it), the
  directory-safe CTA is present, the button targets `/search-results`, and the
  emitted strip equals `seoCtaStrip()` verbatim so any reintroduced caller blurb
  fails whatever its wording.
- **Support-number semantics** — root `index.html`, the shared header and a
  generated article each assert the number is still present and dialable, then
  that it carries no placement / matching / advisor / "24/7 confidential help" /
  "our 24/7 helpline" coupling.
- **Root meta** — the three description tags stay in sync, the copy keeps its
  search terms, stays ≤160 chars, and canonical/OG/Twitter/indexing are intact.
- **The guard catches what shipped** — the exact READY-Preview CTA markup and the
  exact header anchor are asserted to *fail* the guard, alongside seven close
  variants, plus narrowness tests proving editorial "matching", "you'll find",
  facility concierge amenities, and SAMHSA/988/911 copy (including a SAMHSA line
  sitting beside the RehabLookup support line) are **not** flagged.

All prior coverage is untouched: `directoryArticleOverride.test.ts` and the rest
of the suite still pass — 584 tests across 47 files.

## Deliberately deferred

- **`CONCIERGE_PHONE_DISPLAY` / `CONCIERGE_PHONE_TEL` in
  `src/lib/contactInfo.ts` are NOT renamed.** Stage-2/backend code still
  consumes them; renaming is later cleanup. Only their *public presentation*
  changed, and the values are unchanged.
- **The two stale `blog_articles` rows are still not normalized.** Still a
  backend/data-cleanup dependency (see hotfix #2).
- **Provider/admin concierge surfaces** remain later-stage scope.
- **`supabase/functions/prerender-for-bots/index.ts`** carries its own
  homepage description including "24/7 confidential help". It is an Edge
  Function, and this hotfix deploys none — flagged here as a Stage-2 item.
- The cosmetic `"4 min read min read"` duplication on article pages was left
  alone; it is not part of this cutover.

## Confirmations for this hotfix

- No Supabase writes. No migrations. No Edge Function changes.
- No Stripe, Pro, Featured, `facility_subscriptions`, checkout, webhook or
  entitlement changes.
- No changes under `supabase/`, `src/pages/provider/`, `src/pages/admin/`,
  `src/components/provider/` or `src/components/admin/`.
- No inquiry-routing work; `submit-qualified-lead`, `submit-marketing-lead`,
  `submit-concierge-intake`, `match-concierge-intake`,
  `notify-free-tier-inquiry-redirect`, `placement-monitor` and `placement-cron`
  are untouched.
- No validator disabled or weakened. Baseline lint is unchanged (216 problems
  before and after); no baseline lint was "fixed".
- Preview not promoted to production; `main` not merged.
