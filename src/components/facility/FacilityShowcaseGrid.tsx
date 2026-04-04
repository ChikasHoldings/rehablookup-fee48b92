import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, MapPin, Crown, ShieldCheck, ArrowRight, Building2, Heart } from "lucide-react";
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

function formatFacilityType(type?: string | null): string {
  if (!type) return "";
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Hero Card (first / featured) ── */
function HeroShowcaseCard({ facility }: { facility: FacilityItem }) {
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
      {/* Image — fixed height, not stretching */}
      <div className="relative w-full h-44 overflow-hidden bg-muted">
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
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Logo + Name overlay at bottom of image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end gap-2.5">
          <div className="shrink-0 h-10 w-10 rounded-lg border-2 border-white/30 bg-card/90 backdrop-blur-sm overflow-hidden flex items-center justify-center shadow-md">
            {logoImage ? (
              <img src={logoImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">{getInitials(facility.name)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm leading-tight line-clamp-1 drop-shadow-sm">
              {facility.name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-white/80 shrink-0" />
              <span className="text-[11px] text-white/80 truncate">
                {facility.city}, {facility.state}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-3.5 flex flex-col flex-1 gap-2.5">
        {/* Trust badges row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isFeatured && (
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <Crown className="h-2.5 w-2.5" />
              Featured
            </Badge>
          )}
          {facility.verified && (
            <Badge className="bg-emerald-500/90 text-white border-0 gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="h-2.5 w-2.5" />
              Verified
            </Badge>
          )}
          {facility.facility_type && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground border-border/60">
              {formatFacilityType(facility.facility_type)}
            </Badge>
          )}
        </div>

        {/* Description */}
        {facility.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {facility.description}
          </p>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* CTA Button */}
        <div className="pt-1">
          <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/15 text-primary text-xs font-semibold py-2.5 transition-colors">
            <Heart className="h-3.5 w-3.5" />
            Check Availability
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Compact Card (stacked pairs) ── */
function CompactShowcaseCard({ facility }: { facility: FacilityItem }) {
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
        "relative overflow-hidden rounded-xl bg-card border group text-left transition-all duration-300 w-full flex flex-col",
        "hover:shadow-lg hover:border-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isFeatured
          ? "border-amber-200/60 ring-1 ring-amber-100/40"
          : "border-border/60"
      )}
    >
      {/* Image */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted">
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
            <Building2 className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges on image */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {isFeatured && (
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              <Crown className="h-2 w-2" />
              Featured
            </Badge>
          )}
          {facility.verified && (
            <Badge className="bg-emerald-500/90 text-white border-0 gap-0.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              <ShieldCheck className="h-2 w-2" />
              Verified
            </Badge>
          )}
        </div>

        {/* Logo + Name overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end gap-2">
          <div className="shrink-0 h-7 w-7 rounded-md border border-white/30 bg-card/90 backdrop-blur-sm overflow-hidden flex items-center justify-center">
            {logoImage ? (
              <img src={logoImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[9px] font-bold text-muted-foreground">{getInitials(facility.name)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-[11px] leading-tight line-clamp-1 drop-shadow-sm">
              {facility.name}
            </h3>
            <div className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5 text-white/80 shrink-0" />
              <span className="text-[10px] text-white/80 truncate">
                {facility.city}, {facility.state}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal info below */}
      <div className="p-2.5 flex flex-col gap-1.5">
        {facility.description && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
            {facility.description}
          </p>
        )}
        <div className="flex items-center justify-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/15 text-primary text-[10px] font-semibold py-1.5 transition-colors">
          <Heart className="h-3 w-3" />
          Check Availability
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

  // Build stacked pairs
  const pairs: FacilityItem[][] = [];
  for (let i = 0; i < restFacilities.length; i += 2) {
    pairs.push(restFacilities.slice(i, i + 2));
  }

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
          {/* Hero card — rich details, fixed image height */}
          <div className="shrink-0 snap-start w-[280px] sm:w-[300px] md:w-[320px]">
            <HeroShowcaseCard facility={heroFacility} />
          </div>

          {/* Stacked pairs */}
          {pairs.map((pair, pairIdx) => (
            <div key={pairIdx} className="shrink-0 snap-start w-[220px] sm:w-[240px] md:w-[260px] flex flex-col gap-3">
              {pair.map((f) => (
                <CompactShowcaseCard key={f.id} facility={f} />
              ))}
            </div>
          ))}
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
