import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { PublicRouteGuard } from "@/components/PublicRouteGuard";

const BestInStatePage = lazy(() => import("@/pages/seo/BestInStatePage"));
const ListYourFacilityState = lazy(() => import("@/pages/provider-guides/ListYourFacilityState"));
const ForProvidersState = lazy(() => import("@/pages/provider-guides/ForProvidersState"));
const CityTreatmentPage = lazy(() => import("@/pages/seo/CityTreatmentPage"));
const CityProviderPage = lazy(() => import("@/pages/provider-guides/CityProviderPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * City+Treatment combo prefixes that use inline params (e.g., /alcohol-rehab-in-los-angeles).
 * React Router v6 can't handle partial-segment params, so we match these manually.
 */
const CITY_TREATMENT_PREFIXES = [
  "/alcohol-rehab-in-",
  "/drug-rehab-in-",
  "/detox-centers-in-",
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
];

/**
 * Smart catch-all route handler for URL patterns that use inline params
 * (e.g., /best-rehab-centers-in-california, /alcohol-rehab-in-los-angeles)
 * which React Router v6 doesn't support as partial segment params.
 */
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

  // List Your Facility in [State]
  if (pathname.startsWith("/list-your-facility-in-")) {
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

  return (
    <Suspense fallback={null}>
      <NotFound />
    </Suspense>
  );
}
