import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MapPin, Crown, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";

interface FacilityItem {
  id: string;
  name: string;
  slug?: string | null;
  city: string;
  state: string;
  description?: string | null;
  image?: string | null;
  logo_url?: string | null;
  gallery_urls?: string[] | null;
  featured?: boolean;
  verified?: boolean | null;
  hasFeaturedSubscription?: boolean;
  facility_type?: string | null;
  isFromDatabase?: boolean;
}

interface FacilityShowcaseGridProps {
  facilities: FacilityItem[];
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  maxItems?: number;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function FacilityShowcaseCard({ 
  facility, 
  size = "small" 
}: { 
  facility: FacilityItem; 
  size?: "large" | "small";
}) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const heroImage = facility.gallery_urls?.[0] || facility.image || facility.logo_url;
  const hasImage = heroImage && !imgError;
  const isFeatured = facility.hasFeaturedSubscription || facility.featured;
  const detailUrl = facility.isFromDatabase && facility.slug
    ? `/center/${facility.slug}`
    : `/rehab-centers/${facility.id}`;

  return (
    <button
      onClick={() => navigate(detailUrl, { state: { fromSearch: true } })}
      className={cn(
        "relative overflow-hidden rounded-xl bg-card border group text-left transition-all duration-300",
        "hover:shadow-xl hover:border-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        size === "large" ? "col-span-2 row-span-2" : "",
        isFeatured
          ? "border-amber-200/60 ring-1 ring-amber-100/50"
          : "border-border/50"
      )}
    >
      {/* Image */}
      <div className={cn(
        "relative w-full overflow-hidden bg-muted",
        size === "large" ? "aspect-[4/3]" : "aspect-[16/10]"
      )}>
        {hasImage ? (
          <img
            src={heroImage!}
            alt={facility.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
            <span className="font-display text-2xl font-bold text-muted-foreground/40">
              {getInitials(facility.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {isFeatured && (
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1 px-2 py-0.5 shadow-md text-[10px] font-bold uppercase tracking-wider">
              <Crown className="h-2.5 w-2.5" />
              Featured
            </Badge>
          )}
          {facility.verified && (
            <Badge className="bg-emerald-500/90 text-white border-0 gap-1 px-2 py-0.5 shadow-md text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="h-2.5 w-2.5" />
              Verified
            </Badge>
          )}
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className={cn(
            "font-display font-bold text-white leading-tight line-clamp-2 drop-shadow-lg",
            size === "large" ? "text-lg md:text-xl" : "text-sm"
          )}>
            {facility.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3 text-white/70 shrink-0" />
            <span className={cn(
              "text-white/80 font-medium",
              size === "large" ? "text-sm" : "text-xs"
            )}>
              {facility.city}, {facility.state}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function FacilityShowcaseGrid({
  facilities,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = "View All",
  className,
  maxItems = 7,
}: FacilityShowcaseGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  if (facilities.length === 0) return null;

  // First featured facility gets the large card
  const featuredFacilities = facilities.filter(f => f.hasFeaturedSubscription || f.featured);
  const regularFacilities = facilities.filter(f => !f.hasFeaturedSubscription && !f.featured);
  
  // Arrange: featured first (large), then regular (small)
  const heroFacility = featuredFacilities[0] || facilities[0];
  const restFacilities = facilities.filter(f => f.id !== heroFacility.id).slice(0, maxItems - 1);

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      {(title || viewAllHref) && (
        <div className="flex items-end justify-between mb-5">
          <div>
            {title && (
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <Link to={viewAllHref}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                {viewAllLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Scrollable Grid Container */}
      <div className="relative group/scroll">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted transition-all opacity-0 group-hover/scroll:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted transition-all opacity-0 group-hover/scroll:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1"
        >
          {/* Hero / Featured card — larger */}
          <div className="shrink-0 snap-start w-[280px] sm:w-[340px] md:w-[400px]">
            <FacilityShowcaseCard facility={heroFacility} size="large" />
          </div>

          {/* Regular cards column pairs */}
          {restFacilities.length > 0 && (() => {
            const pairs: FacilityItem[][] = [];
            for (let i = 0; i < restFacilities.length; i += 2) {
              pairs.push(restFacilities.slice(i, i + 2));
            }
            return pairs.map((pair, pairIdx) => (
              <div key={pairIdx} className="shrink-0 snap-start w-[220px] sm:w-[260px] md:w-[300px] flex flex-col gap-3">
                {pair.map((f) => (
                  <FacilityShowcaseCard key={f.id} facility={f} size="small" />
                ))}
              </div>
            ));
          })()}
        </div>

        {/* Fade edges */}
        {canScrollRight && (
          <div className="absolute top-0 right-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        )}
        {canScrollLeft && (
          <div className="absolute top-0 left-0 bottom-2 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
