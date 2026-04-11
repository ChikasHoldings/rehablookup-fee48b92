import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useIsMobile } from "@/hooks/use-mobile";

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
