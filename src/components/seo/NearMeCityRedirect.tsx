import { Navigate, useLocation } from "react-router-dom";

/**
 * Redirects /:nearMeSlug/:stateSlug/:citySlug → /:nearMeSlug/:stateSlug.
 *
 * Background: the sitemap generator emitted 3-segment URLs (state +
 * city) for every near-me pattern, but the React Router routes only
 * support 2-segment URLs (state only). 21,000+ sitemap URLs were
 * 404-ing. This component is mounted on a parametric 3-segment route
 * for each near-me prefix and uses location.pathname to compute the
 * correct 2-segment target by dropping the last segment.
 *
 * The redirect is a `replace` so back-button doesn't bounce into the
 * 404'd URL.
 */
export function NearMeCityRedirect() {
  const location = useLocation();
  const segs = location.pathname.split("/").filter(Boolean);
  // Expecting exactly 3 segments: [nearMeSlug, stateSlug, citySlug].
  // If for any reason we landed here with a different shape, fall
  // back to the prefix only.
  if (segs.length < 2) {
    return <Navigate to="/" replace />;
  }
  const stateLevel = `/${segs[0]}/${segs[1]}`;
  return <Navigate to={stateLevel} replace />;
}
