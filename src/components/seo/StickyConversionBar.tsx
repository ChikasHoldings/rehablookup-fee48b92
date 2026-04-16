import { useState, useEffect, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_ROUTES = ["/concierge", "/provider", "/admin", "/lp/", "/account"];

export const StickyConversionBar = forwardRef<HTMLDivElement>(function StickyConversionBar(_props, ref) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();

  const shouldHide = HIDDEN_ROUTES.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (shouldHide || dismissed || !visible) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="container flex items-center justify-between gap-3 py-2.5 md:py-3">
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-foreground">Need help finding treatment?</p>
          <p className="text-xs text-muted-foreground">Free, confidential matching — no obligation</p>
        </div>
        <p className="sm:hidden text-sm font-semibold text-foreground">Find treatment today</p>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="gap-1.5 px-4">
            <Link to="/concierge">
              <Heart className="h-3.5 w-3.5" />
              Get Help Now
            </Link>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
