import { useState, useEffect, forwardRef } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompareList } from "@/hooks/useCompareList";

export const BackToTop = forwardRef<HTMLButtonElement>((_, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  // When CompareTray is open (compareCount > 0) it occupies the bottom
  // strip of the viewport at the same z-40. Raise the button above the
  // tray so it doesn't overlap the "Compare" CTA inside it.
  const { compareCount } = useCompareList();
  const trayOpen = compareCount > 0;

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      ref={ref}
      onClick={scrollToTop}
      className={cn(
        "fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-all duration-300 hover:bg-accent/90 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
        trayOpen ? "bottom-32" : "bottom-20",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
      style={{ marginBottom: `env(safe-area-inset-bottom, 0px)` }}
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
});

BackToTop.displayName = "BackToTop";
