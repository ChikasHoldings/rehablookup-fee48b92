import { Navigate, useLocation } from "react-router-dom";

/**
 * Synchronous trailing-slash normalizer.
 *
 * IMPORTANT: This component MUST render BEFORE <Routes> so it intercepts
 * trailing-slash URLs (e.g. /rehab-centers/maryland/towson/) before any
 * route is matched. The previous useEffect-based version was async and
 * caused the page to render with the trailing slash — Google then flagged
 * the URL as a duplicate of the no-slash canonical.
 *
 * Returns null when the path is already canonical, otherwise returns a
 * client-side <Navigate replace /> which swaps the URL synchronously.
 *
 * Children render only when the path is canonical, ensuring no SEO content
 * is rendered under a duplicate URL.
 */
export function TrailingSlashRedirect({ children }: { children: React.ReactNode }) {
  const { pathname, search, hash } = useLocation();

  // Root "/" is always canonical
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const trimmed = pathname.replace(/\/+$/, "") || "/";
    return <Navigate to={`${trimmed}${search}${hash}`} replace />;
  }

  return <>{children}</>;
}
