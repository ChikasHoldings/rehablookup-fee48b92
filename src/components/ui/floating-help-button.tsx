import { useState, useEffect, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Pages where the floating button should NOT appear
const HIDDEN_ROUTES = [
  "/rehab-centers",
  "/center/",
  "/account/concierge",
  "/provider",
  "/admin",
  "/lp/",
];

export const FloatingHelpButton = forwardRef<HTMLAnchorElement>((_, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  // Check if current route should hide the button
  const shouldHide = HIDDEN_ROUTES.some(route => 
    location.pathname.startsWith(route) || location.pathname === route
  );

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  // Only show on mobile, when scrolled, and not on hidden routes
  if (!isMobile || shouldHide) {
    return null;
  }

  return (
    <Link
      ref={ref}
      to="/concierge"
      className={cn(
        "fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-accent-foreground shadow-lg transition-all duration-300 hover:bg-accent/90 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
      style={{ marginBottom: `env(safe-area-inset-bottom, 0px)` }}
    >
      <Heart className="h-4 w-4" />
      <span className="text-sm font-semibold">Find Treatment</span>
    </Link>
  );
});

FloatingHelpButton.displayName = "FloatingHelpButton";
