import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeoLocation } from "@/hooks/useGeoLocation";

const STORAGE_KEY = "intl_banner_dismissed";
const DISMISS_DURATION_DAYS = 30;

function isDismissed(): boolean {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) return false;
    
    const dismissedDate = new Date(dismissed);
    const now = new Date();
    const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceDismissed < DISMISS_DURATION_DAYS;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    // Ignore localStorage errors
  }
}

export function InternationalBanner() {
  const location = useLocation();
  const { isUS, isLoading } = useGeoLocation();
  const [visible, setVisible] = useState(false);

  // Routes where banner should NOT appear
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isProviderRoute = location.pathname.startsWith("/provider");
  const isInternationalRoute = location.pathname.startsWith("/international");
  const shouldHideBanner = isAdminRoute || isProviderRoute || isInternationalRoute;

  useEffect(() => {
    // Only show if: not US, not loading, not dismissed, and not on excluded routes
    if (!isLoading && !isUS && !shouldHideBanner && !isDismissed()) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isUS, isLoading, shouldHideBanner]);

  const handleDismiss = () => {
    setDismissed();
    setVisible(false);
  };

  if (!visible) return null;

  // min-h-[44px] matches the actual rendered height (py-2.5 padding + ~24px
  // content row). The useGeoLocation hook now hydrates from sessionStorage
  // synchronously, so repeat-session non-US visitors get this banner on the
  // very first paint with no shift. First-visit non-US users still see a
  // one-time ~44px downward shift after the geo fetch resolves; reserving
  // the slot upfront would impose an empty-stripe regression on the much
  // larger US visitor majority, so we accept the one-time shift for the
  // smaller non-US first-visit cohort.
  return (
    <div className="bg-primary text-primary-foreground min-h-[44px]">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Globe className="h-4 w-4 shrink-0 hidden sm:block" />
          <p className="text-sm font-medium truncate">
            Outside the U.S.? Browse US treatment centers that accept international patients.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="h-9 md:h-7 text-xs font-semibold whitespace-nowrap"
          >
            <Link to="/search-results">Search US Centers</Link>
          </Button>

          <button
            onClick={handleDismiss}
            className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded hover:bg-primary-foreground/10 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
