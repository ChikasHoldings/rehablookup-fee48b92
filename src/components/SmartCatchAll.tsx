import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { PublicRouteGuard } from "@/components/PublicRouteGuard";

const BestInStatePage = lazy(() => import("@/pages/seo/BestInStatePage"));
const ListYourFacilityState = lazy(() => import("@/pages/provider-guides/ListYourFacilityState"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * Smart catch-all route handler for URL patterns that use inline params
 * (e.g., /best-rehab-centers-in-california) which React Router v6 doesn't
 * support as partial segment params.
 */
export function SmartCatchAll() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/best-rehab-centers-in-")) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <BestInStatePage />
        </Suspense>
      </PublicRouteGuard>
    );
  }

  if (pathname.startsWith("/list-your-facility-in-")) {
    return (
      <PublicRouteGuard>
        <Suspense fallback={null}>
          <ListYourFacilityState />
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
