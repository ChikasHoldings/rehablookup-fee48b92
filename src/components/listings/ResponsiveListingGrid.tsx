import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface ResponsiveListingGridProps {
  facilities: any[];
  maxItems?: number;
}

export function ResponsiveListingGrid({ facilities, maxItems = 12 }: ResponsiveListingGridProps) {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const items = facilities.slice(0, maxItems);

  // Empty state fallback
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-border bg-muted/20">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Facilities Listed Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          We're expanding our network in this area. Browse all centers nationwide or let our team find the right match for you.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/search-results">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Browse All Centers
            </Button>
          </Link>
          <Link to="/concierge">
            <Button className="gap-2">
              <Heart className="h-4 w-4" />
              Get Personalized Help
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = dir === "left" ? -320 : 320;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (!isMobile) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((facility) => (
          <TreatmentCenterCard key={facility.id || facility.name} center={facility} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((facility) => (
          <div
            key={facility.id || facility.name}
            className="flex-shrink-0 w-[85vw] max-w-[340px] snap-start"
          >
            <TreatmentCenterCard center={facility} />
          </div>
        ))}
      </div>

      {/* Scroll dots indicator */}
      <div className="flex justify-center gap-1.5 mt-2">
        {items.slice(0, Math.min(items.length, 6)).map((_, i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
        ))}
        {items.length > 6 && <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/15" />}
      </div>
    </div>
  );
}
