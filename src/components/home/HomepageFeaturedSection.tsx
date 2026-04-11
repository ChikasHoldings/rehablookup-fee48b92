import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Star, MapPin, Crown, ShieldCheck, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaticFacilities, type PublicFacility } from "@/hooks/useStaticFacilities";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getNearbyStates } from "@/lib/proximitySearch";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { cn } from "@/lib/utils";
import { treatmentCenters } from "@/data/treatmentCenters";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";
import { GoogleReviewsCompactBadge } from "@/components/reviews/GoogleReviewsBadge";

// Deterministic daily seed for fair rotation
function getDailySeed(): number {
  const d = new Date();
  const str = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const s = [...arr];
  let cur = seed;
  for (let i = s.length - 1; i > 0; i--) {
    cur = (cur * 1103515245 + 12345) & 0x7fffffff;
    const j = cur % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

// Location-aware sorting tiers
function getProximityTier(facility: PublicFacility, userState: string, userCity: string, nearbyStates: string[]): number {
  if (!userState) return 4; // No location — neutral
  const fState = facility.state?.toUpperCase();
  const uState = userState.toUpperCase();
  const uCity = userCity.toLowerCase();

  if (fState === uState && facility.city?.toLowerCase() === uCity) return 0; // Same city
  if (fState === uState) return 1; // Same state
  if (nearbyStates.map(s => s.toUpperCase()).includes(fState)) return 2; // Adjacent state
  return 3; // Nationwide
}

export function HomepageFeaturedSection() {
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();
  const geo = useGeoLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasTrackedImpressions = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const userState = geo.regionCode || "";
  const userCity = geo.city || "";
  const nearbyStates = useMemo(() => userState ? getNearbyStates(userState) : [], [userState]);

  // Build featured centers list with location-aware rotation
  const featuredCenters = useMemo(() => {
    // Get DB featured facilities
    const dbFeatured = approvedFacilities.filter(
      (f: any) => f.isHomepageFeatured || f.hasFeaturedSubscription
    );

    // Static fallback
    const staticFeatured = treatmentCenters
      .filter((c) => c.featured)
      .map((c) => ({
        ...c,
        slug: null,
        isFromDatabase: false,
        logo_url: null,
        gallery_urls: null,
        hasFeaturedSubscription: false,
        isPro: false,
        verified: false,
        year_established: null,
        facilityType: null,
        googleRating: null,
        googleReviewCount: null,
      }));

    let pool = dbFeatured.length > 0 ? [...dbFeatured] : [...staticFeatured as any[]];

    // Fair rotation: seeded daily shuffle within each proximity tier
    const seed = getDailySeed();
    
    if (userState && !geo.isLoading) {
      // Group by proximity tier, shuffle within each tier for fairness, then concat
      const tiers: Map<number, PublicFacility[]> = new Map();
      for (const f of pool) {
        const tier = getProximityTier(f, userState, userCity, nearbyStates);
        if (!tiers.has(tier)) tiers.set(tier, []);
        tiers.get(tier)!.push(f);
      }
      
      pool = [];
      for (const tier of [0, 1, 2, 3, 4]) {
        const group = tiers.get(tier);
        if (group && group.length > 0) {
          pool.push(...seededShuffle(group, seed + tier));
        }
      }
    } else {
      pool = seededShuffle(pool, seed);
    }

    // Fill remaining with static if needed, cap at 8 for horizontal scroll
    if (pool.length < 8) {
      const existing = new Set(pool.map(p => p.id));
      const extra = (staticFeatured as any[]).filter(s => !existing.has(s.id));
      pool.push(...extra.slice(0, 8 - pool.length));
    }

    return pool.slice(0, 8);
  }, [approvedFacilities, userState, userCity, nearbyStates, geo.isLoading]);

  // Track impressions
  const trackFeaturedImpressions = useCallback(async () => {
    if (hasTrackedImpressions.current) return;
    const dbFacilities = featuredCenters.filter(
      (c: any) => c.isFromDatabase && (c.hasFeaturedSubscription || c.isPro) && c.id
    );
    if (dbFacilities.length === 0) return;
    hasTrackedImpressions.current = true;
    for (const facility of dbFacilities) {
      try {
        await supabase.functions.invoke("track-featured-analytics", {
          body: { facility_id: facility.id, event_type: "impression" },
        });
      } catch (e) {
        console.error("Failed to track impression:", e);
      }
    }
  }, [featuredCenters]);

  useEffect(() => {
    if (featuredCenters.length > 0) trackFeaturedImpressions();
  }, [featuredCenters, trackFeaturedImpressions]);

  // Scroll state management
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, featuredCenters]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-featured-card]")?.clientWidth || 320;
    el.scrollBy({ left: dir === "left" ? -cardWidth - 16 : cardWidth + 16, behavior: "smooth" });
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 md:py-14 lg:py-16">
        <div className="container px-4 md:px-6 lg:px-8">
          <FeaturedSkeleton />
        </div>
      </section>
    );
  }

  if (featuredCenters.length === 0) return null;

  return (
    <section className="py-10 md:py-14 lg:py-16 relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/10 to-background pointer-events-none" />
      
      <div className="container px-4 md:px-6 lg:px-8 relative">
        {/* Premium container */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 md:px-7 pt-6 pb-4 md:pt-7 md:pb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-300/30 shadow-sm">
                <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
              </div>
              <div>
                <h2 className="font-display text-lg md:text-xl font-bold text-foreground leading-tight">
                  Featured Treatment Centers
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground leading-tight mt-0.5">
                  {userState && !geo.isLoading
                    ? `Top-rated facilities near ${userCity ? `${userCity}, ` : ""}${userState}`
                    : "Verified, trusted facilities across the country"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Desktop scroll arrows */}
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => scroll("left")}
                  disabled={!canScrollLeft}
                  className={cn(
                    "h-8 w-8 rounded-full border flex items-center justify-center transition-all",
                    canScrollLeft
                      ? "border-border bg-card hover:bg-muted text-foreground shadow-sm cursor-pointer"
                      : "border-border/40 bg-muted/30 text-muted-foreground/40 cursor-default"
                  )}
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  disabled={!canScrollRight}
                  className={cn(
                    "h-8 w-8 rounded-full border flex items-center justify-center transition-all",
                    canScrollRight
                      ? "border-border bg-card hover:bg-muted text-foreground shadow-sm cursor-pointer"
                      : "border-border/40 bg-muted/30 text-muted-foreground/40 cursor-default"
                  )}
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <Link
                to="/rehab-centers"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group ml-2"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Horizontal scroll track */}
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scroll-smooth px-5 md:px-7 pb-6 md:pb-7 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {featuredCenters.map((center: any, index: number) => (
                <FeaturedCard
                  key={center.id}
                  center={center}
                  index={index}
                  onClick={() => {
                    // Track click
                    if (center.isFromDatabase && center.id) {
                      supabase.functions.invoke("track-featured-analytics", {
                        body: { facility_id: center.id, event_type: "click" },
                      }).catch(() => {});
                    }
                    const url = center.isFromDatabase && center.slug
                      ? `/center/${center.slug}`
                      : `/rehab-centers/${center.id}`;
                    navigate(url, { state: { fromSearch: true } });
                  }}
                />
              ))}
            </div>

            {/* Fade edges */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card/80 to-transparent pointer-events-none z-10 hidden md:block" />
            )}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card/80 to-transparent pointer-events-none z-10 hidden md:block" />
            )}
          </div>

          {/* Mobile CTA */}
          <div className="px-5 pb-5 pt-0 sm:hidden">
            <Link to="/rehab-centers">
              <Button variant="outline" size="sm" className="w-full gap-2 h-9 text-xs font-semibold">
                View All Centers
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ Featured Card ═══════════════════ */

function FeaturedCard({ center, index, onClick }: {
  center: any;
  index: number;
  onClick: () => void;
}) {
  const [logoErr, setLogoErr] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const { trackImpression } = useProviderEventTracking();
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTracked = useRef(false);

  const heroImage = center.gallery_urls?.[0] || center.image;
  const hasHero = heroImage && !imgErr;
  const hasLogo = center.logo_url && !logoErr;
  const initials = center.name?.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() || "?";
  const detailsUrl = center.isFromDatabase && center.slug ? `/center/${center.slug}` : `/rehab-centers/${center.id}`;
  const yearsInBusiness = center.year_established ? new Date().getFullYear() - center.year_established : null;

  // Intersection observer for impression tracking
  useEffect(() => {
    if (!center.isFromDatabase || !center.id || hasTracked.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasTracked.current) {
          hasTracked.current = true;
          trackImpression(center.id, "search");
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [center.isFromDatabase, center.id, trackImpression]);

  return (
    <div
      ref={cardRef}
      data-featured-card
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      role="button"
      aria-label={`View ${center.name} in ${center.city}, ${center.state}`}
      className={cn(
        "group relative flex-shrink-0 w-[280px] sm:w-[300px] md:w-[310px] snap-start",
        "rounded-xl border overflow-hidden bg-card cursor-pointer",
        "transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "border-amber-200/60 ring-1 ring-amber-100/40",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Hero image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {hasHero ? (
          <img
            src={heroImage}
            alt={`${center.name} facility in ${center.city}, ${center.state}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setImgErr(true)}
          />
        ) : (
          <img
            src={facilityPlaceholder}
            alt={`${center.name} facility`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Featured badge */}
        <div className="absolute top-2.5 right-2.5">
          <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Crown className="h-2.5 w-2.5" />
            Featured
          </Badge>
        </div>

        {/* Logo + name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-white/80 bg-card shadow-md">
              {hasLogo ? (
                <img src={center.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setLogoErr(true)} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50">
                  <span className="font-display text-xs font-bold text-amber-600">{initials}</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-sm font-bold text-white leading-tight line-clamp-1 drop-shadow-md">
                {center.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-white/70 shrink-0" />
                <span className="text-[11px] text-white/85 font-medium truncate">{center.city}, {center.state}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Credential badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {center.googleRating && center.googleReviewCount && (
            <GoogleReviewsCompactBadge rating={center.googleRating} reviewCount={center.googleReviewCount} />
          )}
          {center.verified && (
            <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-0 rounded-full">
              <ShieldCheck className="h-2.5 w-2.5" />
              Verified
            </Badge>
          )}
          {yearsInBusiness && yearsInBusiness > 0 && (
            <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px] font-semibold bg-blue-100 text-blue-700 border-0 rounded-full">
              {yearsInBusiness}+ Yrs
            </Badge>
          )}
        </div>

        {/* Treatment tags */}
        {center.treatmentTypes?.length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-[22px] overflow-hidden">
            {center.treatmentTypes.slice(0, 3).map((t: string) => (
              <Badge key={t} variant="outline" className="text-[10px] font-medium px-1.5 py-0 rounded-full border-amber-200/80 text-amber-700/80">
                {t}
              </Badge>
            ))}
            {center.treatmentTypes.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground/60 border-dashed rounded-full">
                +{center.treatmentTypes.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* CTA */}
        <Button
          variant="default"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="w-full h-8 text-xs font-semibold gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-sm"
        >
          <Heart className="h-3 w-3" />
          Check Availability
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════ Skeleton ═══════════════════ */

function FeaturedSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden">
      <div className="px-5 md:px-7 pt-6 pb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <div className="flex gap-4 px-5 md:px-7 pb-6 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-[300px] rounded-xl border overflow-hidden">
            <Skeleton className="aspect-[16/10]" />
            <div className="p-3 space-y-2">
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
