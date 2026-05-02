
# RehabLookup vs. Rehab.com vs. Rehabs.com — What to fix, ranked by impact

## How the comparison was done
- Pulled live homepage, a state hub, and a sample facility profile from rehab.com.
- Pulled the live homepage and California state hub from rehablookup.com.
- Rehabs.com is currently DNS-down (Cloudflare 1016) on its origin, so I used the most recent Wayback capture (Jan 2026) for its layout and content.

```text
                        rehablookup.com   rehab.com         rehabs.com
Listings shown          Featured (3-6)    2,510 in CA       1,231 in CA
Filters on state hub    None visible      14 categories     Multiple
Facility profile depth  Basic card        Long-form +       Long-form
                                          score + reviews + 
                                          insurance grid +
                                          methodology page
Reviews surfaced        No                Google + on-site  Yes
Geo default             Broken (Balikesir Auto by city      State-first
                        showing as default)
News / fresh content    Resources/blog    Weekly podcast +  E-E-A-T
                                          news posts        articles
Trust badges            Verified pill     Joint Commission, Joint Commission,
                                          CARF, NAATP,      CARF, NCQA
                                          LegitScript
Insurance pathway       Logo strip        Per-insurance     Per-insurance +
                                          landing pages     deep-link to
                                                            recovery.com
Phone CTA               No persistent     "Get Help Now"    Helpline + 3-pick
                        helpline          sticky bar +      "compare" widget
                                          phone number
For-providers pitch     "Free listing"    Stats + claim     "100k+ visitors,
                                          flow              dedicated AM"
```

## Critical bugs to fix first (P0 — visible to every visitor)

1. **State hubs render zero listings**
   `https://rehablookup.com/rehab-centers/california` shows the literal text "0 Verified Facilities" and "0 verified facilities available" in two places, with no list below. This is the single most damaging issue: the page that ranks for "rehab in California" looks empty. Rehab.com shows 2,510 facilities on the same page. Verify the query in `BestInStatePage` / state hub component, fix the data fetch, and add an honest "X facilities listed" count fed by the same query that renders the cards.

2. **Geo default looks broken on the home hero**
   Hero shows "Showing results near Balikesir, 10" for a non-US visitor. For a US-focused directory, the empty/non-US fallback should be "Top-rated centers across the U.S." with a state grid, not a Turkish province name. Fix: detect non-US IP (or no consent) → show a curated "Top-rated nationwide" set instead of using raw geolocation.

## High-impact improvements (P1 — ship in next 2 weeks)

3. **Add filter sidebar to every state, city, county and treatment-type hub**
   Rehab.com's state page is dominated by a left rail with: Levels of Care, Programs (LGBTQ, Veterans, Teens, Women, Men, Young Adult), Payment Options (incl. Sliding Scale, Free, Financial Aid), Accreditations (SAMHSA, CARF, Joint Commission, NAATP, LegitScript), Amenities, and Insurance. RehabLookup currently has accordion filters on `/search-results` but not on the SEO state/city pages — those are the pages that get the organic traffic. Re-use the existing search filter component on every hub.

4. **Show real listings on every hub page (not just featured)**
   Even before adding new content, render the actual approved facilities for that state/city/county/treatment-type, paginated or virtualized. Mirror rehab.com's "Name / Address / Rating / Description / Insurance / Contact" row layout so the page has substance for both users and Google.

5. **Add a "Rehab Score" or trust score on every facility profile**
   Rehab.com's "8.2 / 10" score with a linked methodology page is their #1 differentiator and the thing they monetize editorially. A simple, transparent composite (verification, years in business, accreditations, response rate, review average) shown as `/transparency` (or `/methodology`) page is high-trust, high-SEO. You already have all the inputs — `provider_events`, ratings, claims, accreditations.

6. **Per-insurance landing pages with facility lists**
   Rehab.com has `/insurance/aetna`, `/insurance/blue-cross-blue-shield`, etc. — each is a real page with facilities accepting that plan. RehabLookup's `/insurance/aetna-rehab`, `/insurance/bcbs-treatment` exist but should each render a filtered facility list, FAQ, and a "Verify benefits" inline form (not a logo strip pointing to a generic check page).

7. **Sticky helpline / "Get help now" bar on facility and hub pages**
   Both competitors run a persistent helpline ("Get Help Now · 800-784-1361" with "Sponsored Helpline" disclosure on rehab.com). For an unauthenticated user on a facility profile, RehabLookup currently has only "Check Availability". Add a sticky bottom bar (mobile) / right rail (desktop) with three actions: Call advisor · Verify insurance · Save & compare. Aligns with your existing "One-Click CTA Bar" memory.

8. **"Compare 3 facilities" widget**
   The Wayback rehabs.com capture ends with "You've added 0 of 3 facilities" — a side-by-side compare drawer. Useful, easy to build on top of your existing `useFavorites` hook, and a strong intent signal that justifies asking for an email at step 3.

## Content & E-E-A-T (P2 — ship within 4-6 weeks)

9. **Medically-reviewed bylines on every editorial page**
   Rehab.com profiles end with "Fact checked and written by: Susan Bertram, BA · Edited by: Courtney Myers, MS". You already have an Editorial Policy page (`mem://seo/medical-trust-and-eeat-signals`) — actually surface the reviewer + writer name, credentials, and date on each article and on the long-form sections of facility profiles. This is what Google's Helpful Content Update rewards in YMYL.

10. **Reviews on facility profiles (with owner replies)**
    Rehab.com pulls Google reviews and shows owner responses inline. RehabLookup has the data model (`useFacilityReviews`) — exposing them publicly with structured `Review` JSON-LD plus your existing `AggregateRating` audit will land rich-results stars in SERPs.

11. **Weekly editorial cadence — even one piece**
    Rehab.com publishes a weekly podcast/news segment ("Addiction News Weekly Ep 1"). One short, dated, expert-bylined news post per week — even auto-summarized from SAMHSA / Nature Mental Health releases — signals freshness to Google and gives social/email something to link to.

12. **Free + low-cost rehab cluster**
    Both competitors invest in "Free Rehab Centers", "Going to Rehab Without Insurance", "Sliding Scale Programs". Your near-me cluster has `AffordableRehabNearMe` and `FreeRehabNearMe` already — link them prominently from every state hub and from the homepage Resources nav. This is high-volume, high-intent traffic competitors dominate.

## Provider acquisition (P3 — supports the business model)

13. **Rebuild the "List Your Facility" pitch around stats**
    Rehab.com's claim flow is bare; rehabs.com leads with "100k+ Monthly Visitors · 10k+ Listings · Dedicated account manager · Various pricing packages". RehabLookup's `/provider-signup` says only "Free listing • Verified leads". Lead with: monthly visitors, leads delivered last 30 days, average response-to-unlock time, and a transparent "Free vs. Pro vs. Featured" comparison table. You already track all of this in `provider_events`.

## Technical details (for the engineering pass)

- **Bug #1 (state hub empty):** check the data hook used in `BestInStatePage` / `src/pages/seo/*StatePage.tsx`. The `0 Verified Facilities` literal suggests the count comes through but the list query is filtered too tightly (likely `status = 'approved' AND verified = true AND featured = true` instead of just `status = 'approved'`). Fix the query and add a Vitest snapshot that asserts at least N>0 cards render for `california`.
- **Bug #2 (geo):** the homepage `Top-Rated Treatment Facilities` block calls a "near me" query against the user's IP city. For non-US IPs, fall back to a hand-curated "Top picks across the U.S." list. This also helps Core Web Vitals because the fallback can be SSG'd into the prerender.
- **Filters on hubs (#3):** lift the existing `<SearchFilters>` from `/search-results` into a shared component and mount it on `BestInStatePage`, `CityTreatmentPage`, `CountyTreatmentPage`, `*NearMe*` pages. Filter state lives in the URL so each filtered combo gets a unique canonical (and the existing `check:unique-meta` audit will keep titles distinct).
- **Sticky CTA (#7):** reuse the existing `OneClickCTABar` pattern from leads. Hide it for authenticated providers/admins (you already detect role instantly per `mem://design/responsive-shell-architecture`).
- **Compare widget (#8):** persist selection in `localStorage`; cap at 3 (matches rehabs.com convention); render a `/compare?ids=a,b,c` page with `noindex` so it doesn't dilute the index.
- **Reviews JSON-LD (#10):** ensure each facility profile emits `Review` array nested under `MedicalClinic`, gated by your existing `check:aggregate-rating` audit thresholds (≥1 review with numeric rating).

## What I'm explicitly NOT recommending

- **Don't add a sponsored helpline that swaps recipients dynamically** the way rehab.com / rehabs.com do — they're funnels for `recovery.com` / AAC. Your business model (`mem://business-model/placement-brokerage-deal-desk`) is direct provider relationships, so the helpline should route to your in-house Advisors, not a third-party.
- **Don't copy rehab.com's emoji icon set or rehabs.com's Anthem/Carelon-heavy insurance grid** — your design system memory enforces semantic tokens and your own brand palette.
- **Don't add intrusive lead-capture popups** — your core memory explicitly forbids this, and it's the right call. The compare widget + sticky helpline give you the same conversion lift without violating the discovery-first promise.

---

If you approve, I'd start with P0 (#1, #2) the same day — those are the only two issues a first-time visitor will actually notice — then move to P1 in priority order. Reply **"start with P0"** to fix the two critical bugs, **"do P0 + P1"** to ship the first two-week wave, or tell me which numbered items to pick.
