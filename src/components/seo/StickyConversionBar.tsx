import { useState, useEffect, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollDirection } from "@/hooks/useScrollDirection";

// Routes with their own sticky bottom CTA (or where this bar would stack
// awkwardly on mobile). Phase 6C added /center and /compare to avoid the
// triple-stack with CenterProfile's mobile CTA bar + the global CompareTray.
const HIDDEN_ROUTES = ["/concierge", "/provider", "/admin", "/lp/", "/account", "/center", "/compare"];

// RehabLookup concierge number — direct line to our matching team.
// Used here as a tap-to-call shortcut on mobile bottom bar.
const CONCIERGE_TEL_DISPLAY = "214-639-6420";
const CONCIERGE_TEL_HREF = "+12146396420";

export const StickyConversionBar = forwardRef<HTMLDivElement>(function StickyConversionBar(_props, ref) {
  const [shownOnce, setShownOnce] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();
  const scrollDir = useScrollDirection({ threshold: 12 });

  const shouldHide = HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r));

  // First-show gate: only appear after the user has scrolled past the
  // hero (≥ 150px). After that, visibility is driven by scroll direction
  // — hide while scrolling down, reveal while scrolling up — so the bar
  // never blocks content the user is actively reading toward.
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 150) setShownOnce(true);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (shouldHide || dismissed || !shownOnce) return null;

  // Hide while scrolling down (after the first reveal); show while
  // scrolling up or when scroll direction is settled (null).
  const hidden = scrollDir === "down";

  return (
    <div
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300",
        hidden ? "translate-y-full" : "translate-y-0",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-hidden={hidden}
    >
      <div className="container flex items-center justify-between gap-2 py-2.5 md:py-3 min-h-[56px]">
        <div className="hidden sm:block min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">Need help finding treatment?</p>
          <p className="text-xs text-muted-foreground truncate">Free, confidential matching — no obligation</p>
        </div>
        <p className="sm:hidden text-sm font-semibold text-foreground min-w-0 truncate">Find treatment today</p>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="gap-1.5 px-2.5 sm:hidden">
            <a
              href={`tel:${CONCIERGE_TEL_HREF}`}
              aria-label={`Call RehabLookup at ${CONCIERGE_TEL_DISPLAY}`}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Call</span>
            </a>
          </Button>
          <Button asChild size="sm" className="gap-1.5 px-3 sm:px-4">
            <Link to="/concierge">
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Get help</span>
            </Link>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
