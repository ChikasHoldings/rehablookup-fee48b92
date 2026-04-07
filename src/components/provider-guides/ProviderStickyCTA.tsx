import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";

const DISMISS_KEY = "provider_sticky_cta_dismissed";

export function ProviderStickyCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "true");

  useEffect(() => {
    if (dismissed) return;

    const handleScroll = () => {
      const scrolled = window.scrollY > 400;
      const docHeight = document.documentElement.scrollHeight;
      const isNearFooter = window.innerHeight + window.scrollY >= docHeight - 200;
      setIsVisible(scrolled && !isNearFooter);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "true");
  };

  if (dismissed || !isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 transition-transform duration-300">
      <div className="bg-primary/95 backdrop-blur-sm border-t border-primary-foreground/10">
        <div className="container flex items-center justify-between gap-3 px-4 py-2.5">
          <p className="text-sm text-primary-foreground/90 hidden sm:block">
            List your treatment center on RehabLookup — it's free
          </p>
          <p className="text-xs text-primary-foreground/90 sm:hidden">
            List your facility free
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/provider-signup">
              <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs font-semibold px-4">
                Get Started
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
