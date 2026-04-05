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
      // Retry failed requests twice with exponential backoff
      retry: 2,
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
 * Clear sensitive data from cache (for logout)
 */
export function clearSensitiveCache(): void {
  // Clear user-specific queries
  queryClient.removeQueries({ queryKey: ["provider-"] });
  queryClient.removeQueries({ queryKey: ["admin-"] });
  queryClient.removeQueries({ queryKey: ["seeker-"] });
  queryClient.removeQueries({ queryKey: ["user-"] });
}
