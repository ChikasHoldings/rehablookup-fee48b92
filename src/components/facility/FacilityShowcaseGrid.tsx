import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MapPin, Crown, ShieldCheck, ArrowRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const heroImage = facility.gallery_urls?.[0] || facility.image;
  const logoImage = facility.logo_url;
  const hasImage = heroImage && !imgError;
  const isFeatured = facility.hasFeaturedSubscription || facility.featured;
  const detailUrl = facility.isFromDatabase && facility.slug
    ? `/center/${facility.slug}`
    : `/rehab-centers/${facility.id}`;

  return (
    <button
      onClick={() => navigate(detailUrl, { state: { fromSearch: true } })}
      className={cn(
        "relative overflow-hidden rounded-xl bg-card border group text-left transition-all duration-300 w-full h-full flex flex-col",
        "hover:shadow-lg hover:border-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isFeatured
          ? "border-amber-200/60 ring-1 ring-amber-100/40"
          : "border-border/60"
      )}
    >
      {/* Image */}
      <div className={cn(
        "relative w-full overflow-hidden bg-muted flex-1 min-h-0",
        size === "large" ? "" : "aspect-[16/9]"
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Building2 className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
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
      </div>

      {/* Info bar below image */}
      <div className="p-3 flex items-start gap-2.5">
        {/* Logo */}
        <div className="shrink-0 h-9 w-9 rounded-lg border border-border/60 bg-muted overflow-hidden flex items-center justify-center">
          {logoImage ? (
            <img src={logoImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-muted-foreground/60">
              {getInitials(facility.name)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            "font-semibold text-foreground leading-tight line-clamp-1",
            size === "large" ? "text-sm" : "text-xs"
          )}>
            {facility.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate">
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
  maxItems = 8,
}: FacilityShowcaseGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  if (facilities.length === 0) return null;

  const sorted = [...facilities].sort((a, b) => {
    const af = a.hasFeaturedSubscription || a.featured ? 1 : 0;
    const bf = b.hasFeaturedSubscription || b.featured ? 1 : 0;
    return bf - af;
  });

  const display = sorted.slice(0, maxItems);
  const heroFacility = display[0];
  const restFacilities = display.slice(1);

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.55;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-4 md:p-6", className)}>
      {/* Header */}
      {(title || viewAllHref) && (
        <div className="flex items-end justify-between mb-4">
          <div>
            {title && (
              <h2 className="font-display text-lg md:text-xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
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

      {/* Scrollable row */}
      <div className="relative group/scroll">
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted transition-all opacity-0 group-hover/scroll:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {canScrollRight && restFacilities.length > 2 && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted transition-all opacity-0 group-hover/scroll:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x"
        >
          {/* Hero card — matches the height of a stacked pair */}
          <div className="shrink-0 snap-start w-[260px] sm:w-[300px] md:w-[340px] self-stretch flex">
            <div className="w-full flex flex-col">
              <FacilityShowcaseCard facility={heroFacility} size="large" />
            </div>
          </div>

          {/* Stacked pairs */}
          {restFacilities.length > 0 && (() => {
            const pairs: FacilityItem[][] = [];
            for (let i = 0; i < restFacilities.length; i += 2) {
              pairs.push(restFacilities.slice(i, i + 2));
            }
            return pairs.map((pair, pairIdx) => (
              <div key={pairIdx} className="shrink-0 snap-start w-[220px] sm:w-[240px] md:w-[270px] flex flex-col gap-3">
                {pair.map((f) => (
                  <FacilityShowcaseCard key={f.id} facility={f} size="small" />
                ))}
              </div>
            ));
          })()}
        </div>

        {canScrollRight && restFacilities.length > 2 && (
          <div className="absolute top-0 right-0 bottom-1 w-10 bg-gradient-to-l from-card to-transparent pointer-events-none rounded-r-2xl" />
        )}
        {canScrollLeft && (
          <div className="absolute top-0 left-0 bottom-1 w-10 bg-gradient-to-r from-card to-transparent pointer-events-none rounded-l-2xl" />
        )}
      </div>
    </div>
  );
}
