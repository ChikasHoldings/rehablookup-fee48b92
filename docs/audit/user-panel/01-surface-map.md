# User Panel — Surface Map (Phase 1)

> Inventory of every public + seeker-authenticated surface in the app. Used as the index for Phases 2–5.
> Methodology: read from `src/App.tsx` route table, `src/pages/*`, `supabase/functions/*`, and `src/hooks/*`. Counts are exact at time of capture.
> Date captured: 2026-05-01.

## 1. Public shell

| Component | File | Notes |
|---|---|---|
| Public layout | `src/components/layout/Layout.tsx` | Renders `Header`, `Footer`, `BackToTop`, `FloatingHelpButton`, `StickyConversionBar`, `InternationalBanner`. `Header` is memoized. |
| Header | `src/components/layout/Header.tsx` | |
| Footer | `src/components/layout/Footer.tsx` | |
| Sticky CTA | `src/components/seo/StickyConversionBar.tsx` | |
| Floating help | `src/components/ui/floating-help-button.tsx` | |
| Cookie consent | `src/components/CookieConsentBanner.tsx` | |
| Route boundaries | `SEORouteBoundary`, `PublicRouteGuard`, `TrailingSlashRedirect`, `ScrollToTop` | All wrapping public routes in `App.tsx`. |
| Smart catch-all | `src/components/SmartCatchAll.tsx` | Resolves dynamic SEO slugs that aren't matched by literal routes (state, city+treatment, etc.). |

## 2. Public pages — top-level (`src/pages/*.tsx`)

41 top-level pages. Notable:

| Route | Page | Data path |
|---|---|---|
| `/` | `Index.tsx` (eager) | Featured facilities (RPC), homepage hero, hub navigation. |
| `/centers` | `RehabCenters.tsx` | Public facility list. |
| `/search` | `SearchResults.tsx` | `useStaticFacilities` + `useApprovedFacilities` + proximity ranking. |
| `/locations` | `Locations.tsx` | Hub. |
| `/center/:slug` | `CenterProfile.tsx` / `TreatmentCenterProfile.tsx` | `get_public_facility_data` RPC, reviews, schema, share bar. |
| `/state/:state` | `StatePage.tsx` | |
| `/city/:state/:city` | `CityPage.tsx` | |
| `/county/:state/:county` | `CountyPage.tsx` | |
| `/insurance/*` | `Insurance.tsx` + 16 carrier pages | Aetna, BCBS, Cigna, UHC, Humana, Kaiser, Medicare, Medicaid, Anthem, Tricare, Molina, Magellan, WellCare, Ambetter, Oscar, Highmark. |
| `/treatment-types/*` | `TreatmentTypes.tsx` + 18 program pages | Drug, alcohol, dual-diagnosis, residential, outpatient, holistic, detox, luxury, etc. — each with state and city variants. |
| `/concierge`, `/concierge/intake`, `/concierge/thank-you` | `concierge/*` | Domestic placement intake (paid). |
| `/international/*` | `international/*` | International placement intake (paid). |
| `/contact` | `Contact.tsx` | `send-contact-form` edge fn. |
| `/login`, `/forgot-password`, `/reset-password` | Auth | |
| `/signup/seeker` | `SeekerSignup.tsx` | |
| `/signup/provider`, `/providers/*` | Provider entry — out of scope (Provider Panel audit). |
| `/social/:platform` | `SocialLanding.tsx` | |
| `/ad/:campaign` | `AdLanding.tsx` | |
| `/marketing/*` | `MarketingLanding.tsx` | |

## 3. SEO pages (`src/pages/seo/*`) — 25 templates

`BestInStatePage`, `CityInsurancePage`, `CityTreatmentPage`, `CoOccurringCityPage`, `CoOccurringPage`, `ComparisonPage`, `CostInsurancePage`, `CountyInsurancePage`, `CountyTreatmentPage`, `DemographicCityPage`, `DemographicStatePage`, `DemographicTreatmentPage`, `DurationCityPage`, `DurationSettingPage`, `EducationalPage`, `ExpandedTreatmentHubPage`, `InsuranceStatePage`, `PaymentStatePage`, `SeekerGuidePage`, `StateArticlePage`, `SubstanceCityPage`, `SubstanceStatePage`, `SubstanceTreatmentPage`, `TherapyModalityPage`, `TreatmentHubPage`.

Slug resolution is hybrid: literal routes hit specific templates; everything else falls through `SmartCatchAll`.

## 4. Near-Me pages (`src/pages/near-me/*`) — 35 pages

Substance/program/demographic "near me" variants (alcohol, drug, fentanyl, detox, IOP, PHP, MAT, Suboxone, methadone, sober living, luxury, executive, faith-based, christian, court-ordered, couples, teen, women, men, veterans, free, affordable, Medicaid, holistic, dual diagnosis, long-term, inpatient, outpatient, generic, plus city/county wrappers).

Data: `useNearMeFacilities`, `useGeoLocation`, `useZipcodeLookup`, proximity ranking via `src/utils/proximityRanking.ts`.

## 5. Provider-guides (`src/pages/provider-guides/*`)

~70 SEO-only marketing pages for providers. Public-facing (anyone can read) but the user (seeker) panel does not interact with their data flows. Treated as out-of-scope for *flow* tracing in Phase 3, but included in Phase 2 SEO/static checks.

## 6. Seeker-authenticated panel (`src/pages/seeker/*`)

| Route | Page | Notes |
|---|---|---|
| `/account` | `SeekerHome.tsx` | Dashboard summary. |
| `/account/saved` | `SeekerSaved.tsx` | Favorites. |
| `/account/search` | `SeekerSearch.tsx` | Saved searches. |
| `/account/notifications` | `SeekerNotifications.tsx` | In-app notifications list. |
| `/account/notification-preferences` | `SeekerNotificationPreferences.tsx` | Channel toggles. |
| `/account/requests` | `SeekerRequests.tsx` | User's submitted leads. |
| `/account/concierge` | `SeekerConcierge.tsx` | Concierge case status. |
| `/account/international` | `SeekerInternationalCase.tsx` | International case status. |
| `/account/reviews` | `SeekerReviews.tsx` | User-submitted reviews. |
| `/account/facility/:id` | `SeekerFacilityProfile.tsx` | Logged-in facility view. |
| `/account/help` | `SeekerHelp.tsx` | |
| `/account/settings` | `SeekerSettings.tsx` | Profile + account deletion. |

Shell: `src/components/seeker/SeekerShell.tsx` (with `SeekerHeader`, `SeekerMobileNav`, `SeekerErrorBoundary`, `EmailVerificationBanner`).

Auth gating: `useAuthReady` → unauthenticated users are redirected to `/login?redirect=…`; admins/providers are redirected to their respective shells.

## 7. Forms & flow components

| Form | Component | Submit target | Validation |
|---|---|---|---|
| Lead intake (qualified) | `src/components/lead-intake/LeadIntakeForm.tsx` + `useLeadIntakeForm` | `submit-qualified-lead` | Inline (regex + length); idempotency key generated client-side. Email verification required. |
| Exit-intent lead | `src/components/seo/ExitIntentLead*` (TBD in Phase 3) | `submit-exit-intent-lead` | Lighter intake. |
| Marketing lead | `MarketingLanding.tsx` | `submit-marketing-lead` | |
| Concierge intake (domestic) | `concierge/ConciergeIntake.tsx` | `submit-concierge-intake` → Stripe checkout via `create-concierge-checkout` → `stripe-webhook` | Multi-step with draft persistence (`save-placement-draft`). |
| International intake | `international/InternationalApplication.tsx`, `InternationalIntake.tsx` | `submit-international-intake` → `create-international-checkout` | Multi-step with `save-international-placement-draft`. |
| Contact form | `Contact.tsx` | `send-contact-form` | Per-field `*_required` errors (recently standardized). |
| Provider support form | `ProviderSupport.tsx` | `send-provider-support` | Per-field errors. |
| Email verification | inline in lead-intake | `send-verification-code` + `verify-code` | 6-digit OTP. |

## 8. User-panel hooks (selected — `src/hooks/*`)

User-panel-relevant hooks (provider/admin-only hooks excluded):

- `useAuthReady`, `useAuthSync`, `useSeekerSession`, `useSeekerNotifications`
- `useApprovedFacilities`, `useStaticFacilities`, `useNearMeFacilities`, `useFacilityRating`, `useFacilityReviews`, `useFacilityStaff`, `useFacilityBadges`
- `useFavorites`, `useGeoLocation`, `useZipcodeLookup`, `useTreatmentCityValidation`
- `useRelatedArticles`
- `useScrollToTop`, `useDebounce`, `use-mobile`

Note: `useStaticFacilities` returns the static publishable snapshot (`src/lib/publicFacilitiesSnapshot.ts`); `useApprovedFacilities` queries the DB live. Both are used to support pre-rendered + live hybrid pages.

## 9. Edge functions reachable from user panel

From `supabase/functions/*` (116 total). User-panel-reachable subset:

**Lead intake & verification:**
- `submit-qualified-lead`, `submit-exit-intent-lead`, `submit-marketing-lead`
- `submit-page-issue-report`
- `send-verification-code`, `verify-code`
- `check-email-verified`
- `send-lead-confirmation`, `send-lead-email`

**Concierge / placement:**
- `submit-concierge-intake`, `match-concierge-intake`, `link-inquiry-to-user`
- `submit-international-intake`, `submit-placement-case`
- `save-placement-draft`, `save-international-placement-draft`
- `create-concierge-checkout`, `create-international-checkout`, `verify-concierge-payment`
- `stripe-webhook` (also handles concierge completion)
- `send-abandoned-placement-email`, `send-concierge-introduction`, `send-concierge-notifications`

**Public read APIs:**
- `get-public-facilities`, `get-featured-facilities`, `get-facility-plan`
- `sitemap-facilities`, `og-share`, `prerender-for-bots`, `detect-and-prerender`, `submit-indexnow`

**Notifications & support:**
- `send-contact-form`, `send-provider-support`, `send-support-request`
- `send-password-reset`, `send-sms-verification-code`, `verify-sms-code`
- `send-seeker-emails`, `process-seeker-drip`, `send-marketing-followup`
- `track-view`, `track-interaction`

**Auth-adjacent:**
- `assess-login-risk`, `log-login-attempt`, `lookup-ip-location`
- `delete-seeker-account`

**Out of user-panel scope** (provider/admin/billing internals): `unlock-lead`, `purchase-credits`, `auto-reload-credits`, `subscribe-pro`, `confirm-placement`, `charge-placement-fee`, all `admin-*`, all `manage-*`, all `provider*` welcome/drip/digest functions.

## 10. Database surface (user-panel-reachable)

**Tables (read via RLS or RPC):**
- `facilities` (anon SELECT restricted by RLS — see `mem://security/rls-anonymous-directory-access`)
- `facility_reviews`, `facility_review_helpful`
- `seeker_profiles`, `email_verification_codes`, `user_sessions`
- `concierge_inquiries`, `concierge_introductions`, `placement_drafts`, `international_drafts`
- `leads` (write-only via edge fn), `lead_unlocks` (read-only via RPC for users)
- `blocked_identifiers` (read via `is_identifier_blocked`)
- `platform_settings`

**RPCs:** `get_public_facility_data`, `is_email_verified`, `is_identifier_blocked`, `is_email_seeker`, `is_email_provider`, `is_email_admin`, `current_user_email`, `user_has_seeker_profile`, `link-inquiry-to-user` related.

**Triggers relevant to user panel:** `prevent_seeker_double_account`, `handle_new_seeker`, `review_anti_spam_check` (3 reviews/day rate limit), `validate_seeker_rating`.

## 11. Notification touchpoints

Triggered by user actions:

- Lead submitted → seeker confirmation email (`submit-qualified-lead` inline) + facility notification (masked) + `send-sms-notification` to facility (where configured).
- Exit-intent / marketing / concierge — same pattern, separate templates.
- Concierge payment success → `stripe-webhook` → `send-concierge-introduction` to matched providers.
- Account events → `send-password-reset`, email-verification-code emails.
- Abandoned cart → `send-abandoned-placement-email` (cron, 2.0.0 — confirmed running in logs).

## 12. Known guardrails already in place (won't re-test)

These pre-build validators currently pass and are **not** re-audited unless a flow trace surfaces a regression:

- `validate:seo-schema`, `validate:sitemap-robots`, `check:gsc-indexing`
- `check:structured-data`, `check:faq-jsonld`, `check:aggregate-rating`
- `check:internal-links`, `check:responsive-guards`, `check:seo-meta`
- `check:provider-leads-masking` (PII contract)
- `check-leads-view-rls` script + `verify_leads_provider_view_rls()` RPC

Each will be re-run in Phase 2 to confirm green status at audit start.

## 13. Phase 1 risks already visible from surface

Logged here so Phase 3 traces can confirm/refute:

1. **Concierge intake idempotency** — already memorialized as a triple-creation bug fixed by checkout linking + draft upsert + webhook fallback (`mem://features/placement-intake-idempotency`). Phase 3 must verify all three paths still hold.
2. **Lead-intake email verification gate** — `handleSubmit` honors `skipVerificationCheck` flag; we will verify the flag is only ever set after `verify-code` returns 200.
3. **`SeekerShell` redirect hierarchy** — checks role, then auth, with `hasRedirected.current` guard. Phase 4 will hit `/account/*` as admin/provider/anon to confirm no flicker or loop.
4. **Static vs live facility data divergence** — `useStaticFacilities` and `useApprovedFacilities` can disagree post-publish. Phase 3 will trace which pages depend on which.
5. **`SmartCatchAll` slug coverage** — any slug mismatch produces soft-404. Phase 4 will hit known-bad slugs to confirm `CenterNotFound` / `NotFound` fallbacks render.
6. **`window.confirm` ban** — memory says it's banned; Phase 2 grep will catch any user-panel violation.
7. **Email rejection metrics** — recently added; Phase 3 should confirm the user-panel UX for `email_rejected` 400 still surfaces friendly copy via `friendly-error-messages.ts`.

End of Phase 1.
