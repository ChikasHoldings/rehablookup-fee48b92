import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PublicRouteGuard } from "@/components/PublicRouteGuard";
import { ALL_ROUTABLE_NEAR_ME_SLUGS } from "@/data/nearMeTypes";
import { usStates } from "@/data/usStates";

/**
 * Map of legacy hyphenated slug prefixes to canonical /treatment-types/* paths.
 * Used to 301-redirect legacy SEO URLs (e.g. /alcohol-rehabilitation-maryland)
 * to their canonical equivalents (/treatment-types/alcohol-rehabilitation/maryland)
 * to eliminate "Duplicate without user-selected canonical" GSC errors.
 */
const LEGACY_STATE_SUFFIX_REDIRECTS: Array<{ prefix: string; canonical: string }> = [
  { prefix: "/alcohol-rehabilitation-", canonical: "/treatment-types/alcohol-rehabilitation" },
  { prefix: "/inpatient-rehabilitation-", canonical: "/treatment-types/residential-inpatient" },
  { prefix: "/outpatient-rehabilitation-", canonical: "/treatment-types/outpatient-programs" },
  { prefix: "/drug-rehabilitation-", canonical: "/treatment-types/drug-addiction-treatment" },
  { prefix: "/detox-programs-", canonical: "/treatment-types/detox-programs" },
  { prefix: "/dual-diagnosis-treatment-", canonical: "/treatment-types/dual-diagnosis-treatment" },
];

const STATE_SLUGS = new Set(usStates.map((s) => s.slug));

const BestInStatePage = lazy(() => import("@/pages/seo/BestInStatePage"));
const ListYourFacilityState = lazy(() => import("@/pages/provider-guides/ListYourFacilityState"));
const ListYourFacilityCity = lazy(() => import("@/pages/provider-guides/ListYourFacilityCity"));
const ForProvidersState = lazy(() => import("@/pages/provider-guides/ForProvidersState"));
const CityTreatmentPage = lazy(() => import("@/pages/seo/CityTreatmentPage"));
const CityProviderPage = lazy(() => import("@/pages/provider-guides/CityProviderPage"));
const CityTreatmentProviderPage = lazy(() => import("@/pages/provider-guides/CityTreatmentProviderPage"));
const CityInsuranceProviderPage = lazy(() => import("@/pages/provider-guides/CityInsuranceProviderPage"));
const NearMeCityPage = lazy(() => import("@/pages/near-me/NearMeCityPage"));
const NearMeCountyPage = lazy(() => import("@/pages/near-me/NearMeCountyPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * City+Treatment combo prefixes for seeker-facing pages.
 */
const CITY_TREATMENT_PREFIXES = [
  "/alcohol-rehab-in-",
  "/drug-rehab-in-",
  "/detox-centers-in-",
  "/detox-in-",
  "/inpatient-rehab-in-",
  "/outpatient-rehab-in-",
  "/dual-diagnosis-treatment-in-",
  "/luxury-rehab-in-",
  "/sober-living-in-",
  "/free-rehab-in-",
  "/faith-based-rehab-in-",
  "/fentanyl-rehab-in-",
  "/veterans-rehab-in-",
  "/womens-rehab-in-",
  "/mens-rehab-in-",
  "/holistic-rehab-in-",
  "/mat-clinic-in-",
  "/iop-in-",
  "/php-in-",
  // Expanded coverage - cost/affordability
  "/affordable-rehab-in-",
  "/low-cost-rehab-in-",
  // Demographics
  "/teen-rehab-in-",
  "/christian-rehab-in-",
  "/couples-rehab-in-",
  "/executive-rehab-in-",
  "/court-ordered-rehab-in-",
  "/lgbtq-rehab-in-",
  "/young-adult-rehab-in-",
  "/seniors-rehab-in-",
  "/first-responder-rehab-in-",
  // Substance-specific
  "/opioid-rehab-in-",
  "/heroin-rehab-in-",
  "/cocaine-rehab-in-",
  "/meth-rehab-in-",
  "/benzo-rehab-in-",
  "/xanax-rehab-in-",
  "/marijuana-rehab-in-",
  // Insurance
  "/medicaid-rehab-in-",
  "/medicare-rehab-in-",
  // Duration
  "/long-term-rehab-in-",
  "/short-term-rehab-in-",
  "/30-day-rehab-in-",
  "/60-day-rehab-in-",
  "/90-day-rehab-in-",
  // Urgency
  "/emergency-rehab-in-",
  "/same-day-rehab-in-",
  // MAT/Clinic
  "/suboxone-clinic-in-",
  "/methadone-clinic-in-",
];

/**
 * City+Treatment provider-facing prefixes (e.g., /get-more-detox-patients-in-los-angeles).
 */
const CITY_TREATMENT_PROVIDER_PREFIXES = [
  "/get-more-detox-patients-in-",
  "/get-more-residential-patients-in-",
  "/get-more-iop-patients-in-",
  "/get-more-php-patients-in-",
  "/get-more-sober-living-patients-in-",
  "/get-more-mat-patients-in-",
  "/get-more-luxury-patients-in-",
  "/get-more-dual-diagnosis-patients-in-",
];

/**
 * City+Insurance provider-facing prefixes (e.g., /get-more-medicaid-patients-in-miami).
 */
const CITY_INSURANCE_PROVIDER_PREFIXES = [
  "/get-more-medicaid-patients-in-",
  "/get-more-medicare-patients-in-",
  "/get-more-blue-cross-patients-in-",
  "/get-more-aetna-patients-in-",
  "/get-more-cigna-patients-in-",
  "/get-more-united-healthcare-patients-in-",
];

/**
 * Parse near-me city/county patterns:
 * /{near-me-slug}/{stateSlug}/{citySlug}
 * /{near-me-slug}/{stateSlug}/county/{countySlug}
 */
function parseNearMePath(pathname: string): {
  type: "city" | "county";
  nearMeSlug: string;
  stateSlug: string;
  cityOrCountySlug: string;
} | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 3) return null;

  const nearMeSlug = parts[0];
  if (!(ALL_ROUTABLE_NEAR_ME_SLUGS as readonly string[]).includes(nearMeSlug)) return null;

  // /{near-me-slug}/{stateSlug}/county/{countySlug}
  if (parts.length === 4 && parts[2] === "county") {
    return { type: "county", nearMeSlug, stateSlug: parts[1], cityOrCountySlug: parts[3] };
  }

  // /{near-me-slug}/{stateSlug}/{citySlug}
  if (parts.length === 3) {
    return { type: "city", nearMeSlug, stateSlug: parts[1], cityOrCountySlug: parts[2] };
  }

  return null;
}

export function SmartCatchAll() {
  const { pathname, search, hash } = useLocation();

  // 1) Trailing-slash 301 (root excepted) — eliminates "/foo/" vs "/foo" duplicates in GSC.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const trimmed = pathname.replace(/\/+$/, "") || "/";
    return <Navigate to={`${trimmed}${search}${hash}`} replace />;
  }

  // 2) Legacy hyphenated state-suffix slugs → canonical /treatment-types/* path.
  // Eliminates "Duplicate without user-selected canonical" for legacy URLs like
  // /alcohol-rehabilitation-maryland, /inpatient-rehabilitation-rhode-island, etc.
  for (const { prefix, canonical } of LEGACY_STATE_SUFFIX_REDIRECTS) {
    if (pathname.startsWith(prefix)) {
      const stateSlug = pathname.slice(prefix.length).replace(/\/.*$/, "");
      if (STATE_SLUGS.has(stateSlug)) {
        return <Navigate to={`${canonical}/${stateSlug}`} replace />;
      }
      return <Navigate to={canonical} replace />;
    }
  }

  // Best Rehab Centers in [State]
  if (pathname.startsWith("/best-rehab-centers-in-")) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <BestInStatePage />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  // List Your Facility in [City-State] or [State]
  if (pathname.startsWith("/list-your-facility-in-")) {
    const slug = pathname.replace("/list-your-facility-in-", "");
    // City slugs contain the state slug (e.g., "los-angeles-california"), state slugs are standalone (e.g., "california")
    // If slug has more segments than a typical state, try city first
    const isLikelyCity = slug.includes("-") && slug.split("-").length > 2;
    if (isLikelyCity) {
      return (
        <PublicRouteGuard>
          <Suspense fallback={null}>
            <ListYourFacilityCity />
          </Suspense>
        </PublicRouteGuard>
      );
    }
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <ListYourFacilityState />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  // For Providers in [State]
  if (pathname.startsWith("/for-providers-in-")) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <ForProvidersState />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  // City+Treatment provider pages (e.g., /get-more-detox-patients-in-los-angeles)
  if (CITY_TREATMENT_PROVIDER_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <CityTreatmentProviderPage />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  // City+Insurance provider pages (e.g., /get-more-medicaid-patients-in-miami)
  if (CITY_INSURANCE_PROVIDER_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <CityInsuranceProviderPage />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  // City+Treatment combo pages (e.g., /alcohol-rehab-in-los-angeles)
  if (CITY_TREATMENT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <CityTreatmentPage />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  // City Provider Pages (e.g., /get-more-patients-in-los-angeles-california)
  if (pathname.startsWith("/get-more-patients-in-")) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <CityProviderPage />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  // Near Me + City/County pages (e.g., /drug-rehab-near-me/california/los-angeles)
  const nearMeParsed = parseNearMePath(pathname);
  if (nearMeParsed) {
    if (nearMeParsed.type === "county") {
      return (
        <PublicRouteGuard>
          <Suspense fallback={null}>
            <NearMeCountyPage />
          </Suspense>
        </PublicRouteGuard>
      );
    }
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <NearMeCityPage />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
