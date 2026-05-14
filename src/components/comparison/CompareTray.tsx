import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GitCompare, X, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompareList } from "@/hooks/useCompareList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListedFacility {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  logo_url: string | null;
}

/**
 * Floating bottom tray showing the seeker's current compare selection.
 * Hidden when:
 * - The list is empty
 * - We're already on /compare
 * - The user has dismissed the tray (per-session, sessionStorage)
 */
export function CompareTray() {
  const location = useLocation();
  const { compareIds, compareCount, removeFromCompare, clearCompare } = useCompareList();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("compare-tray-dismissed") === "1";
    } catch {
      return false;
    }
  });

  // Re-show the tray on every navigation so the user doesn't lose context.
  useEffect(() => {
    setDismissed(false);
    try {
      sessionStorage.removeItem("compare-tray-dismissed");
    } catch {
      /* ignore */
    }
  }, [location.pathname]);

  const onCompare = location.pathname === "/compare";
  // The facility profile already pins its own 3-button CTA bar to the
  // bottom on mobile, so the tray would visually stack on top of it.
  // Hide the tray on /center/* to keep the profile's primary CTA the
  // sole bottom affordance there. Users still get back to /compare
  // via the footer link + Resources mega-menu. (Phase 6C)
  const onFacilityProfile = location.pathname.startsWith("/center/");
  const visible = !dismissed && compareCount > 0 && !onCompare && !onFacilityProfile;

  const { data: facilities = [] } = useQuery({
    queryKey: ["compare-tray-facilities", compareIds],
    enabled: visible && compareIds.length > 0,
    queryFn: async (): Promise<ListedFacility[]> => {
      const { data, error } = await supabase
        .from("public_facilities")
        .select("id, name, city, state, logo_url")
        .in("id", compareIds)
        .eq("status", "active");
      if (error) throw error;
      // Preserve user's selection order
      const map = new Map((data ?? []).map((f) => [f.id, f as ListedFacility]));
      return compareIds.map((id) => map.get(id)).filter(Boolean) as ListedFacility[];
    },
    staleTime: 30_000,
  });

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Compare selection"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur",
        "shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]",
        "safe-area-bottom"
      )}
    >
      <div className="container px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <GitCompare className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">
                Compare ({compareCount})
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                Up to 4 facilities side-by-side
              </p>
            </div>
          </div>

          <ul className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0">
            {facilities.map((f) => (
              <li
                key={f.id}
                className="group flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 shrink-0 max-w-[200px]"
              >
                {f.logo_url ? (
                  <img
                    src={f.logo_url}
                    alt=""
                    className="h-6 w-6 rounded object-contain bg-white"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-6 w-6 rounded bg-muted" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate leading-tight">{f.name}</p>
                  {(f.city || f.state) && (
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      {[f.city, f.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCompare(f.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md opacity-60 hover:opacity-100 hover:text-rose-500 hover:bg-muted/40 transition-all"
                  aria-label={`Remove ${f.name} from compare`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/compare">
                <span className="hidden sm:inline">Compare</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => clearCompare()}
              className="text-xs text-muted-foreground hover:text-foreground hidden md:inline"
              aria-label="Clear all comparisons"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                try { sessionStorage.setItem("compare-tray-dismissed", "1"); } catch { /* ignore */ }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              aria-label="Hide compare tray"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
