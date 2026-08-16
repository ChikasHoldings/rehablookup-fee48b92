# Pre-merge public navigation + footer cutover

**Branch:** `directory-cutover-02-inquiry-routing`
**Base commit:** `405b91c26f7c7e2c3c0e36013dcc61cd6aa6bae9` (Stage 2 verification hotfix #1)
**Scope:** GLOBAL PUBLIC information architecture only. Not Stage 3. No provider/admin
application navigation was touched, no Supabase source changed, nothing deployed or merged.

RehabLookup is a trusted data and discovery layer for addiction treatment. The consumer
journey is **search → filter → compare → inspect → save → contact the facility directly**.
Monetization stays free listing / claim, $99/mo Pro, and the Featured add-on. Providers can
pay for visibility and tools; they can never pay for trust.

The global navigation shell had not caught up with that. It still carried a dedicated
international *product* category, a duplicate search entry point, a RehabLookup-operated
insurance-verification offer, a "matching process" label, a lead-broker provider menu, and a
footer advertising 24/7 and international support. It also contained one route that resolves
to the wrong component and several links that only worked via 301.

---

## 1. Link classification

Every clickable internal destination in the global shell was classified before editing:

| Class | Meaning | Count (before) | Disposition |
|---|---|---|---|
| **A** | Canonical direct public destination | 96 | kept (some relocated) |
| **B** | Valid public/SEO content, not global-nav material | 31 | removed from global nav, pages retained |
| **C** | Redirect source / legacy alias | 7 | replaced with the canonical route |
| **D** | 404 / soft-404 | 0 | — |
| **E** | Retired placement / concierge / advisor / VOB positioning | 4 | removed |
| **F** | Intentional auth / provider action | 3 | kept (`/login`, `/account`, `/provider/onboarding`) |

After the cutover the global shell contains **91 distinct internal destinations**, all class A
or F. Verified mechanically — see §11.

### Class C found (redirect sources linked from global nav)

| Linked from | Was | 301 → | Now links |
|---|---|---|---|
| Static crawler header | `/rehab-centers` | `/search-results` | `/search-results` |
| Static crawler footer | `/rehab-centers` | `/search-results` | `/search-results` |
| Static crawler footer | `/resources/signs-of-addiction` | `/resources/youth-addiction-warning-signs` | canonical slug |
| Static crawler footer | `/resources/insurance-coverage-guide` | `/resources/insurance-appeal-rehab-denial` | canonical slug |
| `index.html` noscript | `/resources/signs-of-addiction` | (as above) | canonical slug |
| `index.html` noscript | `/resources/insurance-coverage-guide` | (as above) | canonical slug |
| `index.html` noscript | `/outpatient-near-me`, `/dual-diagnosis-rehab-near-me` | canonical near-me pages | duplicates removed (canonical entries already present) |
| `index.html` `<head>` | `<link rel="prefetch" href="/rehab-centers">` | `/search-results` | prefetch removed (`/search-results` prefetch retained) |

### Class E found (retired positioning)

- `/insurance-verification` — "Verify Insurance (Free) · Free VOB by our care team"
  (Resources mega-menu) and "Verify My Insurance" (footer).
- `/how-it-works` — labelled "Our matching process".
- Provider mega-menu benefit list: "Verified patient leads", "Concierge placement".
- Provider mobile CTA: "Free listing • Verified leads".
- Footer trust badges: "International Support", "24/7 Support".

### Bad route corrected

`/providers/resources` → **`/provider-resources`**.

This one is not a redirect. **Both paths render, and they render different components** —
`/providers/resources` mounts `ProviderResourceHub` while the canonical public provider
resource page `/provider-resources` mounts `ProviderResources`. A redirect checker cannot
catch it, which is why it survived earlier passes. It appeared in the provider mega-menu
(desktop quick-links and the mobile "All resources" link) and in the footer. All occurrences
now use `/provider-resources`. Neither route was deleted.

---

## 2. Primary navigation: before → after

### Desktop

| Before | After |
|---|---|
| Find Rehab *(mega-menu)* | **Find Treatment** *(mega-menu)* |
| Search Centers *(standalone → `/search-results`)* | — *removed, duplicate of Find Treatment* |
| Resources *(mega-menu)* | **Insurance** *(direct → `/insurance`)* |
| US Treatment *(international mega-menu)* | **Resources** *(mega-menu)* |
| For Providers *(mega-menu)* | **Compare** *(direct → `/compare`)* |
| | **For Providers** *(mega-menu)* |

Right-side actions are unchanged: List Your Facility → `/provider/onboarding`, Sign In →
`/login`, and the seeker account pill when authenticated.

### Tablet (`md`, below `lg`)

Before: `Find Rehab` + `Search Centers` visible; "More" contained Resources, **US Treatment**,
For Providers, Search Centers.

After: `Find Treatment` visible; "More" contains **Insurance, Resources, Compare, For
Providers** — the same items in the same order as desktop. A mega-menu degrades to its
canonical hub page (`/resources`, `/for-providers`) rather than disappearing.

### Mobile

Before: four accordions (Find Rehab, Resources, **US Treatment**, For Providers), a divider,
then a standalone "Search Centers" row.

After: the same five items in the same order as desktop — mega-menus render as accordions,
direct links (Insurance, Compare) render as rows with a chevron.

### How parity is now structural, not maintained by hand

Header.tsx previously kept two separate lists (`megaMenuItems`, `standaloneLinks`) plus a
third hard-coded `linkMap` inside the tablet dropdown. That is how the viewports drifted.
There is now a single ordered `primaryNav` array; desktop, the tablet "More" dropdown, and the
mobile panel all render from it, and the navigation contract test asserts that they do.

---

## 3. Find Treatment mega-menu

Kept as-is — it was already directory-first: search box, 8 treatment types, 6 popular states,
4 Near Me pages, "All treatment types", "All states", and a "Search the full directory" CTA.
Every destination was re-verified as canonical; the primary search target is `/search-results`
(never bare `/rehab-centers`), and `/rehab-centers/<state>` SEO paths remain because they are
real pages.

One change: the CTA's background image was imported from
`@/assets/images/concierge-matching.jpg`. The file was renamed to `directory-search.jpg` (the
image itself is unchanged) so no global-nav source references the retired product by name.

## 4. Insurance

New top-level item linking `/insurance` directly. Previously the only global path to the
insurance hub was inside the Resources mega-menu, and the static crawler header pointed
"Insurance" at a single carrier page (`/insurance/aetna-rehab`) rather than the hub.

## 5. Resources mega-menu

Removed:
- `/insurance-verification` — "Verify Insurance (Free)" / "Free VOB by our care team".
- `/how-it-works` — "Our matching process".

Kept: 6 verified published guides, all 8 topic-hub category pages, Cost Estimator, Insurance
Hub, FAQ, and the "search and compare" CTA. Section relabelled "Tools & Answers" and the count
is now derived from the list rather than hard-coded. Compare is **not** duplicated here — it is
a top-level nav item.

The `/insurance-verification` page and its function were **not** deleted. It is simply no
longer marketed from global navigation.

## 6. International mega-menu — disposition

**Deleted.** `src/components/mega-menus/InternationalMegaMenu.tsx` was orphaned once the
"US Treatment" top-level item was removed (verified: no remaining importer anywhere in `src/`,
`scripts/`, or `tests/`). Removed consistently from the desktop nav, the tablet More dropdown,
the mobile menu, the icon map, the active-state logic, the lazy imports, the mega-menu width
map, and both mega-menu switch statements.

**No international content was deleted.** `/international`, `/us-rehab/*`,
`/travel-to-usa-for-rehab`, `/cost-of-rehab-in-usa-for-international-patients` and
`/can-foreigners-go-to-rehab-in-usa` all remain live, routed, prerendered and in the sitemap.
This removed the old international *product category* from global IA, not the SEO content.

`/international` is retained in the footer Resources section as a **secondary informational
link only**. The page was re-read and verified directory-safe: its placement/application funnel
was retired in stage 1 and it now tells visitors to contact facilities' admissions teams
directly. There is no global link to `/international/apply`, `/international/intake`, or
`/international/thank-you` (all three are `<Navigate>` routes back to `/international`).

## 7. For Providers mega-menu

Rebuilt around directory participation:

- Why List With Us → `/for-providers`
- Provider Resources → `/provider-resources` *(was `/providers/resources`)*
- Provider FAQ → `/provider-faq`
- Provider Support → `/provider-support`
- List Your Facility → `/provider/onboarding`

Removed: the 8-card "Growth Guides" catalogue. Those `/provider-guides/*` pages remain live SEO
content and are still reachable from `/provider-resources`; they no longer occupy a global
mega-menu.

CTA card claims changed from *Free listing / Verified patient leads / Concierge placement /
Analytics dashboard* to **Free listing / Claim and update your profile / Optional Pro tools /
Optional Featured add-on**. Card headline "Grow Your Census" → "List Your Facility". Mobile CTA
subtitle "Free listing • Verified leads" → "Free listing • Update your profile anytime".

No provider or admin application navigation was changed.

## 8. Footer: before → after

**Before — 8 sections:** Find by State · Treatment Types · Insurance Coverage · **Featured
Programs** · **International Rehab** · Resources & Guides · For Providers · Company

**After — 5 sections:**

| Section | Contents |
|---|---|
| **Find Treatment** | Search Treatment Centers, Compare Facilities, 3 Near Me pages, 4 high-value states, Browse All States |
| **Treatment & Insurance** | 4 levels of care + All Treatment Types, 5 canonical carriers + Insurance Hub |
| **Resources** | Guides & Articles, 5 verified published articles, Cost Estimator, General FAQ, International Patients |
| **For Providers** | Why List With Us, Provider Resources, Provider FAQ, Provider Support, List Your Facility |
| **Company** | About, How We Make Money, Contact, Editorial Team, Editorial Policy, Medical Disclaimer |

Removed from global footer IA:

- **Featured Programs** section (8 links) — `/us-rehab/*`, `/affordable-rehab-in-usa`,
  `/fast-admission-rehab-usa`, `/same-day-detox-usa`, `/top-detox-centers-usa`. Pages retained.
- **International Rehab** section (9 links). Pages retained.
- **Verify My Insurance** → `/insurance-verification`.
- **Saved Searches** → `/account/saved-searches` — an authenticated seeker feature, which
  belongs in the account experience, not the public site map.
- **How It Works** → `/how-it-works` (see §14, deferred content debt).

Desktop grid went from `grid-cols-2 lg:grid-cols-4` (8 sections over 2 rows) to
`grid-cols-3 lg:grid-cols-5`. Desktop columns and mobile accordions now both render from the
single `allSections` array rather than a duplicated hand-written list.

Legal links stay in the bottom bar: Privacy Policy · Terms of Service · Editorial Policy ·
Medical Disclaimer · Contact · Sitemap.

### Footer CTA strip

| | Before | After |
|---|---|---|
| Primary | Search Treatment Centers → `/search-results` | *unchanged* |
| Secondary | International Patients → `/international` | **Compare Facilities → `/compare`** |

## 9. Popular Cities strip

Retained — it is genuinely useful directory navigation. All 20 cities were verified against
the real content model rather than against the router: each was resolved through
`getCityBySlug(state, city)`, the exact lookup `CityPage` performs before it falls back to
`<NotFound />`. All 20 resolve; none replaced. The new `check:public-navigation` guard now
performs this same lookup on every build, so a future city addition cannot ship a soft 404.

## 10. Trust / support claim cleanup

The footer trust-badge strip (`HIPAA Compliant · Verified Facilities · International Support ·
24/7 Support`) was **removed entirely** rather than trimmed:

- *International Support* and *24/7 Support* described a global treatment-navigation service
  RehabLookup no longer operates.
- *Verified Facilities* and *HIPAA Compliant* read as blanket guarantees about every listing
  and every interaction. The data contract does not support either as a **global** statement,
  and a footer badge is exactly where a reader takes it as one.

Nothing was invented to fill the space. It is replaced by a plain description:

> Search and compare addiction treatment centers across the United States, then contact the
> facilities you choose directly.

Also changed: brand line "Find trusted, accredited addiction treatment centers across the
United States" → the neutral copy above; footer logo alt text "RehabLookup — Find Trusted
Addiction Treatment Centers" → "RehabLookup — Addiction Treatment Directory". A single
low-emphasis "How we make money" link now sits where the badges were.

Crisis references (911, 988, SAMHSA) are untouched. The RehabLookup 214 number is not
described as a helpline, 24/7 help, admissions help, treatment navigation, or placement
support anywhere in the shell.

## 11. Static / crawler shell (`scripts/_seo-page-shell.mjs`)

**Header nav**

| Before | After |
|---|---|
| Find Treatment → `/rehab-centers` *(301)* | Find Treatment → `/search-results` |
| Treatment Types → `/treatment-types/drug-addiction-treatment` | Treatment Types → `/treatment-types` |
| Insurance → `/insurance/aetna-rehab` | Insurance → `/insurance` |
| Resources → `/resources` | Resources → `/resources` |
| — | **Compare → `/compare`** |
| For Providers → `/for-providers` | For Providers → `/for-providers` |

**Footer** — Find Treatment column now leads with Search Treatment Centers → `/search-results`
and Browse All States → `/locations`; the Insurance column leads with the `/insurance` hub; the
Resources column's two 301-source article links were replaced with their canonical slugs.
Company column unchanged. The `Support · (214) 639-6420` anchor is untouched and stays neutral
platform support.

**No generated page was hand-edited.** The generator was changed and the ~46.7k committed
prerendered pages were brought forward through the repo's existing mechanism:
`scripts/sync-prerendered-shell.mjs` gained two whole-block replacements (header nav, footer
grid) whose replacement markup is derived from `_seo-page-shell.mjs` at run time, so the two
can never drift. `npm run sync:prerendered-shell` rewrote **46,670** pages;
`npm run check:prerendered-shell` now reports zero stale pages.

## 12. Root `index.html` / noscript

Audited in full (139 distinct internal hrefs). It contained **no** concierge, placement,
request-help, `/providers/resources`, `/insurance-verification`, or international
application/intake link. Fixed:

- `<link rel="prefetch" href="/rehab-centers">` removed (301 source); the `/search-results`
  prefetch is retained.
- `/resources/signs-of-addiction` → `/resources/youth-addiction-warning-signs`.
- `/resources/insurance-coverage-guide` → `/resources/insurance-appeal-rehab-denial`
  (label updated to "Insurance Appeals").
- `/outpatient-near-me` and `/dual-diagnosis-rehab-near-me` list entries removed — both are
  301 sources and both canonical targets were already listed one line away.

The noscript footer nav (About · Contact · For Providers · Privacy · HIPAA Notice · Terms) was
verified canonical and left as-is.

## 13. Guards added

### `src/__tests__/public-navigation-contract.test.tsx` (34 assertions)

Scoped to the seven global-nav sources only. Asserts:

- no link to `/concierge*`, `/request-help`, `/placement-help`, `/international/apply|intake|thank-you`, `/providers/resources`, `/insurance-verification`, `/account/saved-searches`
- no link to a redirect source (`/rehab-centers`, `/provider-guides`, `/outpatient-near-me`, `/dual-diagnosis-rehab-near-me`, and the two legacy article slugs)
- no copy promising *Concierge placement*, *Verified patient leads*, *Free VOB by our care team*, *Our matching process*, *24/7 Support*, *International Support*, *Verified leads*, *Verify Insurance (Free)*
- `InternationalMegaMenu.tsx` does not exist and is not imported
- the positive IA: five nav ids in order, "Find Treatment" label, no "Search Centers"/"Find Rehab"/"US Treatment", Insurance and Compare as direct links, all three viewports rendering from `primaryNav`, the five footer sections, no `trustBadges`, and the new CTA strip

Two deliberate design points:

- **Comments are stripped** before scanning, so the explanatory notes left in the code about
  what was removed do not read as reintroductions.
- **Destinations are extracted, not grepped.** `Header.tsx` legitimately tests
  `p.startsWith("/rehab-centers")` in its active-state predicates — that is a matcher, not a
  link. Only values in destination position (`to=`, `href=`, `href:`, `path:`, object values)
  count. A naive literal grep produced two false positives here.
- Bare words (`lead`, `placement`, `matching`, `international`) are **never** banned, and no
  file outside global navigation is scanned.

### `scripts/check-public-navigation.mjs` → `npm run check:public-navigation`

`check:internal-links` proves a URL matches a *registered route*. That is not enough for global
navigation, in three specific ways this script covers:

1. **A dynamic-route match is not a page.** `/rehab-centers/:state/:city` matches any two
   segments, so a bad city passes a route check while `CityPage` renders `<NotFound />` — a
   soft 404 in the site-wide footer on every page. This script performs the same
   `getStateBySlug` / `getCityBySlug` lookup the page itself performs, and validates article
   links against the prerendered mirror and category links against `blogCategories`.
2. **A 301 is not a failure to a link checker.** Any destination that is a `vercel.json`
   redirect source or an SPA `<Route element={<Navigate>}>` fails here.
3. **A non-canonical duplicate is neither.** `/providers/resources` renders fine and is not a
   redirect; it is explicitly flagged with its canonical replacement.

Result: **91 destinations across 7 sources, all resolving.** Wired into `build:vercel` after
`check:inquiry-routing-prerender` (i.e. after the generated artifacts it reads exist). No
existing checker was weakened.

Both guards were negative-tested: five deliberate regressions
(`/providers/resources`, `/rehab-centers`, a nonexistent city, a nonexistent article,
`/international/apply`) were injected into `Footer.tsx` — the checker caught 5/5 and the
contract test caught 4/5 (it does not model city/article content, which is the checker's job).

## 14. Deferred public-content debt

These were discovered during the audit, are **outside** global-navigation scope, and were
deliberately not expanded into. None is a regression introduced here.

1. **`/how-it-works` still carries retired operational copy.** The page contains "24/7
   Availability", "Our team … provides judgment-free guidance", "speak with our specialists who
   can help guide you to the right program" (also baked into its FAQ structured data), and
   "Search our directory or speak with a specialist". Per the task's preferred safe path, the
   page has been **removed from the Resources mega-menu and from the global footer** rather
   than partially cleaned. The route still works and nothing links to it globally. It needs a
   tightly scoped content + structured-data pass before it is re-linked.

2. **Homepage hero trust strip** shows "3,800+ Verified Facilities" and "HIPAA Compliant".
   That is homepage body content, not global navigation, so it was left alone — but it makes
   the same category of blanket claim that was just removed from the footer, and should be
   reviewed in the same spirit.

3. **`/insurance-verification` page and function still exist** and are still routed. Removing
   them is a product decision, not a navigation one. Only the global marketing of it was
   removed.

4. **`validate:sitemap-robots` reports 3,249 prerendered pages** not in `sitemap.xml` and not
   blocked by `robots.txt` (pre-existing warning, unchanged by this work).

5. **`check:structured-data` warns** that `public/rehab-centers.html` is missing. Expected —
   `/rehab-centers` is a redirect, not a page. Pre-existing.

## 15. Files changed

| File | Change |
|---|---|
| `src/components/layout/Header.tsx` | single `primaryNav` model; International removed; Find Treatment label; Insurance + Compare direct links; tablet/mobile render from the shared list |
| `src/components/layout/Footer.tsx` | 8 → 5 sections; trust badges removed; CTA strip secondary → Compare; canonical provider route; Saved Searches / VOB / How It Works removed |
| `src/components/mega-menus/FindTreatmentMegaMenu.tsx` | asset import renamed (no functional change) |
| `src/components/mega-menus/ResourcesMegaMenu.tsx` | VOB and "Our matching process" entries removed; section relabelled; count derived |
| `src/components/mega-menus/InternationalMegaMenu.tsx` | **deleted** (orphaned) |
| `src/components/provider-guides/ProviderMegaMenu.tsx` | rebuilt around canonical provider jobs; growth-guide wall and lead claims removed; `/provider-resources` |
| `src/assets/images/concierge-matching.jpg` | renamed → `directory-search.jpg` |
| `scripts/_seo-page-shell.mjs` | crawler header + footer aligned to canonical IA |
| `scripts/sync-prerendered-shell.mjs` | two new whole-block replacements so the committed corpus follows the shell |
| `scripts/check-public-navigation.mjs` | **new** global-nav resolution guard |
| `src/__tests__/public-navigation-contract.test.tsx` | **new** navigation contract test |
| `index.html` | prefetch + noscript redirect-source fixes |
| `package.json` | `check:public-navigation` added and wired into `build:vercel` |
| `public/**/*.html` | 46,670 pages re-synced to the new shell (generated, via the sync script) |
| `docs/directory-cutover-premerge-public-navigation.md` | this document |

**`supabase/` is byte-for-byte unchanged from `405b91c2`** (`git diff 405b91c2 -- supabase`
returns nothing).

## 16. Preserved (Stage 1 + Stage 2)

Retired Concierge routes still redirect; Free/non-Pro direct-contact behaviour, Pro-only
on-platform inquiry sourcing, the `DIRECT_CONTACT_REQUIRED` contract, entitlement-before-PII
ordering, the inquiry-routing prerender marker and its guard, the Stage-1 public-shell guard,
article compatibility overrides, claim/onboarding hardening, Pro checkout/webhook hardening,
Featured behaviour, the public SEO generators, sitemaps, and reviews are all untouched.
`check:directory-public-shell` and `check:inquiry-routing-prerender` both pass.
