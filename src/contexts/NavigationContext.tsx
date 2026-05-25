import { createContext, useTransition, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface NavigationContextType {
  isPending: boolean;
  navigateWithTransition: (to: string) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

/**
 * NavigationProvider — exposes an opt-in transition-wrapped navigate
 * helper. No global behavior, no click interceptor.
 *
 * 2026-05-23 bugfix: an earlier version of this provider installed a
 * global `document.addEventListener("click", ...)` interceptor that
 * wrapped EVERY internal anchor click in `React.startTransition`. The
 * intent was to keep the previous page visible while a lazy chunk
 * loaded — no "blank flash." The side effect: a transition keeps the
 * OLD UI on screen until the new route is "ready" (chunk loaded +
 * commit). On a 404 page, "ready" means lazy chunks for the next route
 * have to land before React reveals them — until then the 404 itself
 * stays painted, and mobile users with no concept of hard-refresh read
 * the sticky 404 as "the whole platform is broken."
 *
 * The interceptor was also doing nothing useful for the 95% of routes
 * that are NOT lazy (homepage, /search-results, /provider/*, etc.) —
 * those committed instantly anyway. Removing it makes navigation feel
 * responsive: clicks immediately move the URL, and the route-level
 * Suspense fallbacks render their loading state if a chunk is still
 * downloading.
 *
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();

  const navigateWithTransition = useCallback((to: string) => {
    startTransition(() => {
      navigate(to);
    });
  }, [navigate, startTransition]);

  return (
    <NavigationContext.Provider value={{ isPending, navigateWithTransition }}>
      {isPending && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-primary animate-pulse"
          style={{ animationDuration: "800ms" }}
          aria-hidden="true"
        />
      )}
      {children}
    </NavigationContext.Provider>
  );
}
