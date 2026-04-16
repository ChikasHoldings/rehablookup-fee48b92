import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { PublicRouteGuard } from "@/components/PublicRouteGuard";

const BestInStatePage = lazy(() => import("@/pages/seo/BestInStatePage"));
const ListYourFacilityState = lazy(() => import("@/pages/provider-guides/ListYourFacilityState"));
const ListYourFacilityCity = lazy(() => import("@/pages/provider-guides/ListYourFacilityCity"));
const ForProvidersState = lazy(() => import("@/pages/provider-guides/ForProvidersState"));
const CityTreatmentPage = lazy(() => import("@/pages/seo/CityTreatmentPage"));
const CityProviderPage = lazy(() => import("@/pages/provider-guides/CityProviderPage"));
const CityTreatmentProviderPage = lazy(() => import("@/pages/provider-guides/CityTreatmentProviderPage"));
const CityInsuranceProviderPage = lazy(() => import("@/pages/provider-guides/CityInsuranceProviderPage"));
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

export function SmartCatchAll() {
  const { pathname } = useLocation();

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

  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
