/**
 * Centralized route constants for RehabLookup.
 *
 * Why this module exists:
 *   - Before phase Z, 268 files referenced routes via hardcoded
 *     `<Link to="/provider/dashboard">` style strings. A typo in any
 *     one of them produced a silent broken-link with no compile-time
 *     warning and no test coverage.
 *   - This module is the single source of truth for every internal
 *     route used by the app. Use the typed builders for dynamic
 *     params (facility slug, lead id, etc.) so URL shape can be
 *     refactored in one place.
 *
 * Coverage:
 *   - Every route registered in `src/App.tsx` that we link to from
 *     more than one site appears here.
 *   - Highly local / one-off links (e.g. a single admin debug page)
 *     are intentionally left as hardcoded strings — adding them to
 *     the registry just adds noise without reducing risk.
 *
 * The companion smoke test
 *   supabase/functions/_tests/internal-link-integrity_test.ts
 * checks that every value in this module resolves to an actual
 * <Route> definition (or Navigate redirect) in App.tsx.
 */

// ─── Public marketing ─────────────────────────────────────────────────
export const ROUTES_PUBLIC = {
  home: "/",
  forProviders: "/for-providers",
  providerResources: "/provider-resources",
  providerFAQ: "/provider-faq",
  providerSupport: "/provider-support",
  providerROICalculator: "/provider-roi-calculator",
  centerBySlug: (slug: string) => `/center/${slug}`,
  rehabCenters: "/rehab-centers",
  resourceById: (id: string) => `/resources/${id}`,
  account: "/account",
  medicalDisclaimer: "/medical-disclaimer",
} as const;

// ─── Auth + signup ────────────────────────────────────────────────────
//
// The provider entry pipeline lives at /provider/onboarding (unified
// wizard, phases V-W). Legacy paths are Navigate-only redirects:
//   /provider-signup → /provider/onboarding
//   /provider/signup → /provider-signup
//   /auth/signup     → /provider/onboarding (via AuthSignup.tsx)
export const ROUTES_AUTH = {
  login: "/login",
  signup: "/seeker/signup",
  providerOnboarding: "/provider/onboarding",
  providerOnboardingNewListing: "/provider/onboarding/new-listing",
  forgotPassword: "/forgot-password",
  providerResetPassword: "/provider/reset-password",
  signupComplete: "/signup/complete",
} as const;

// ─── Provider panel ───────────────────────────────────────────────────
export const ROUTES_PROVIDER = {
  dashboard: "/provider/dashboard",
  listings: "/provider/listings",
  addLocation: "/provider/add-location",
  inquiries: "/provider/inquiries",
  reviews: "/provider/reviews",
  analytics: "/provider/analytics",
  billing: "/provider/billing",
  billingCancel: "/provider/billing/cancel",
  billingPlacements: "/provider/billing/placements",
  billingConcierge: "/provider/billing/concierge",
  marketing: "/provider/marketing",
  marketingFeatured: "/provider/marketing/featured",
  marketingConcierge: "/provider/marketing/concierge",
  settings: "/provider/settings",
  notifications: "/provider/notifications",
  help: "/provider/help",
  knowledgeBase: "/provider/knowledge-base",
  imageGuidelines: "/provider/image-guidelines",
  embedBadge: "/provider/embed-badge",
  claims: "/provider/claims",
  claimWizard: (slug: string) => `/provider/claim/${slug}`,
  claimSubmitted: (slug: string) => `/provider/claim/${slug}/submitted`,
} as const;

// ─── Seeker panel ─────────────────────────────────────────────────────
export const ROUTES_SEEKER = {
  account: "/account",
  settings: "/account/settings",
  notifications: "/account/notifications",
  saved: "/account/saved",
  reviews: "/account/reviews",
  help: "/account/help",
} as const;

// ─── Admin panel ──────────────────────────────────────────────────────
export const ROUTES_ADMIN = {
  dashboard: "/admin",
  login: "/admin/login",
  providers: "/admin/providers",
  seekers: "/admin/seekers",
  reviews: "/admin/reviews",
  notifications: "/admin/notifications",
  subscriptions: "/admin/subscriptions",
  settings: "/admin/settings",
} as const;

// ─── Convenience: stable redirect/login routes for guards ─────────────
export const POST_LOGIN_DESTINATION = ROUTES_PROVIDER.dashboard;
export const ANON_LANDING = ROUTES_PUBLIC.home;
