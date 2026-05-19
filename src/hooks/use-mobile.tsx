import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Initialize from the actual viewport. RehabLookup is a pure SPA
  // (src/main.tsx uses createRoot.render, NOT hydrateRoot) so reading
  // window here can't cause a hydration mismatch. The previous
  // `useState<undefined>` → `!!isMobile` coerced to false on initial
  // render, which made every mobile visitor briefly see the desktop
  // layout (e.g., ResponsiveListingGrid rendered the grid then snapped
  // to horizontal-scroll on the useEffect tick). Real-viewport init
  // eliminates that flicker.
  const [isMobile, setIsMobile] = React.useState<boolean>(() =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // One reconciliation pass in case the viewport changed between
    // module load and effect run (rare; mostly a defensive sync).
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
