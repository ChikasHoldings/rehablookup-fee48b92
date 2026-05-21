import { QueryClient } from "@tanstack/react-query";

/**
 * Pre-configured QueryClient with optimal settings for instant perceived loading
 * 
 * Key optimizations:
 * - Long staleTime reduces unnecessary refetches
 * - gcTime keeps data in cache for fast navigation
 * - placeholderData shows cached content instantly
 * - Disabled refetchOnWindowFocus for stability
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 5 minutes - reduces API calls
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Don't refetch on window focus - prevents jarring updates
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      // Retry failed requests twice with exponential backoff — but
      // DON'T retry 404s. Retrying a 404 just delays the not-found
      // UI by 6+ seconds (2 attempts × exponential backoff) for
      // every dead slug a user lands on. 4xx errors are by-definition
      // not transient; retrying them wastes the user's time and the
      // server's. 5xx errors and network errors DO benefit from
      // retry, so we keep retry for those.
      retry: (failureCount, error) => {
        const status = (error as { status?: number; statusCode?: number } | undefined)?.status
          ?? (error as { status?: number; statusCode?: number } | undefined)?.statusCode;
        // 4xx → don't retry. Includes 404 (not found), 401 (auth),
        // 403 (forbidden), 422 (validation), etc.
        if (typeof status === "number" && status >= 400 && status < 500) return false;
        // Otherwise retry up to 2 times.
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Use previous data as placeholder while refetching
      placeholderData: (previousData: unknown) => previousData,
      // Network-only mode when offline
      networkMode: "offlineFirst",
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Network-only mutations
      networkMode: "always",
    },
  },
});

/**
 * Prefetch critical data for a route
 * Call this on link hover/focus for instant page loads
 */
export async function prefetchRouteData(route: string): Promise<void> {
  switch (route) {
    case "/":
    case "/rehab-centers":
      // Prefetch static facilities data
      await queryClient.prefetchQuery({
        queryKey: ["static-public-facilities"],
        staleTime: 1000 * 60 * 5,
      });
      break;
    case "/admin":
    case "/admin/dashboard":
      // Admin data is fetched on-demand due to auth requirements
      break;
    case "/provider/dashboard":
      // Provider data is fetched on-demand due to auth requirements
      break;
  }
}

/**
 * Warm up the query cache with essential data
 * Call this after initial render for faster subsequent navigations
 */
export function warmQueryCache(): void {
  // Check if we have cached facilities data
  const cachedFacilities = queryClient.getQueryData(["static-public-facilities"]);
  
  if (!cachedFacilities) {
    // Prefetch in idle time
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        queryClient.prefetchQuery({
          queryKey: ["static-public-facilities"],
          staleTime: 1000 * 60 * 5,
        });
      }, { timeout: 3000 });
    }
  }
}

/**
 * Clear sensitive data from cache (for logout).
 *
 * Bug fix: previously called `removeQueries({ queryKey: ["admin-"] })`
 * which is an EXACT-array match against the QueryKey. Since real keys
 * are like `["admin-audit-log"]` (one element, a single string), the
 * array `["admin-"]` never matched anything — the function was a
 * silent no-op for every cache it intended to clear.
 *
 * React Query's queryKey filter matches partial PREFIX at the array
 * level, not by string-prefix within an element. For string-prefix
 * matching on the first element we need a `predicate` filter.
 *
 * Note: the canonical logout flow in useAdminAuth calls
 * `queryClient.clear()` which nukes everything, so this helper is
 * currently a defence-in-depth for partial-logout flows (e.g.
 * impersonation stop, role change) and any future callers.
 */
export function clearSensitiveCache(): void {
  const PREFIXES = ["admin-", "provider-", "seeker-", "user-"];
  queryClient.removeQueries({
    predicate: (query) => {
      const first = query.queryKey[0];
      if (typeof first !== "string") return false;
      return PREFIXES.some((p) => first.startsWith(p));
    },
  });
}
