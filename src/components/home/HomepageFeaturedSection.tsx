import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaticFacilities, type PublicFacility } from "@/hooks/useStaticFacilities";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getNearbyStates } from "@/lib/proximitySearch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";

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

function getProximityTier(facility: PublicFacility, userState: string, userCity: string, nearbyStates: string[]): number {
  if (!userState) return 4;
  const fState = facility.state?.toUpperCase();
  const uState = userState.toUpperCase();
  const uCity = userCity.toLowerCase();
  if (fState === uState && facility.city?.toLowerCase() === uCity) return 0;
  if (fState === uState) return 1;
  if (nearbyStates.map(s => s.toUpperCase()).includes(fState)) return 2;
  return 3;
}

export function HomepageFeaturedSection() {
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();
  const geo = useGeoLocation();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasTrackedImpressions = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const userState = geo.regionCode || "";
  const userCity = geo.city || "";
  const nearbyStates = useMemo(() => userState ? getNearbyStates(userState) : [], [userState]);

  const featuredCenters = useMemo(() => {
    // Priority 1: explicitly featured facilities
    const dbFeatured = approvedFacilities.filter(
      (f: any) => f.isHomepageFeatured || f.hasFeaturedSubscription
    );

    // Priority 2: all approved facilities as fallback (sorted by pro > verified > rating)
    let pool: any[];
    if (dbFeatured.length > 0) {
      pool = [...dbFeatured];
    } else if (approvedFacilities.length > 0) {
      pool = [...approvedFacilities].sort((a: any, b: any) => {
        if (a.isPro !== b.isPro) return a.isPro ? -1 : 1;
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        return (b.googleRating || 0) - (a.googleRating || 0);
      });
    } else {
      // Priority 3: static data
      pool = treatmentCenters
        .filter((c) => c.featured)
        .map((c) => ({
          ...c, slug: null, isFromDatabase: false, logo_url: null, gallery_urls: null,
          hasFeaturedSubscription: false, isPro: false, verified: false,
          year_established: null, facilityType: null, googleRating: null, googleReviewCount: null,
        }));
    }

    const seed = getDailySeed();

    if (userState && !geo.isLoading) {
      const tiers: Map<number, PublicFacility[]> = new Map();
      for (const f of pool) {
        const tier = getProximityTier(f, userState, userCity, nearbyStates);
        if (!tiers.has(tier)) tiers.set(tier, []);
        tiers.get(tier)!.push(f);
      }
      pool = [];
      for (const tier of [0, 1, 2, 3, 4]) {
        const group = tiers.get(tier);
        if (group?.length) pool.push(...seededShuffle(group, seed + tier));
      }
    } else {
      pool = seededShuffle(pool, seed);
    }

    return pool.slice(0, 8);
  }, [approvedFacilities, userState, userCity, nearbyStates, geo.isLoading]);

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
      } catch (e) { /* silent */ }
    }
  }, [featuredCenters]);

  useEffect(() => {
    if (featuredCenters.length > 0) trackFeaturedImpressions();
  }, [featuredCenters, trackFeaturedImpressions]);

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
    const cardWidth = el.querySelector("[data-featured-card]")?.clientWidth || 360;
    el.scrollBy({ left: dir === "left" ? -cardWidth - 20 : cardWidth + 20, behavior: "smooth" });
  }, []);

  if (isLoading) {
    return (
      <section className="py-14 md:py-20">
        <div className="container px-4 md:px-6 lg:px-8"><FeaturedSkeleton /></div>
      </section>
    );
  }

  if (featuredCenters.length === 0) return null;

  const locationLabel = userState && !geo.isLoading
    ? `Showing results near ${userCity ? `${userCity}, ` : ""}${userState}`
    : "Verified facilities across the United States";

  return (
    <section className="py-10 md:py-16">
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Section Container with Refined Border */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  Featured Centers
                </p>
                <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  Top-Rated Treatment Facilities
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {locationLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden md:flex items-center gap-1.5">
                  <button
                    onClick={() => scroll("left")}
                    disabled={!canScrollLeft}
                    className={cn(
                      "h-9 w-9 rounded-lg border flex items-center justify-center transition-all",
                      canScrollLeft
                        ? "border-border bg-card hover:bg-muted text-foreground hover:border-primary/30"
                        : "border-border/30 text-muted-foreground/30 cursor-default"
                    )}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => scroll("right")}
                    disabled={!canScrollRight}
                    className={cn(
                      "h-9 w-9 rounded-lg border flex items-center justify-center transition-all",
                      canScrollRight
                        ? "border-border bg-card hover:bg-muted text-foreground hover:border-primary/30"
                        : "border-border/30 text-muted-foreground/30 cursor-default"
                    )}
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  to="/rehab-centers"
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll track */}
          <div className="relative">
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
            )}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
            )}

            <div
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto scroll-smooth px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {featuredCenters.map((center: any) => (
                <div key={center.id} className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] snap-start" data-featured-card>
                  <TreatmentCenterCard
                    center={center}
                    featured={true}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-4 sm:hidden">
          <Link to="/rehab-centers">
            <Button variant="outline" size="sm" className="w-full gap-2 font-medium">
              View All Centers
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}


function FeaturedSkeleton() {
  return (
    <div>
      <div className="space-y-2 mb-10">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-5 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-[360px] rounded-xl border border-border overflow-hidden bg-card">
            <Skeleton className="aspect-[16/9]" />
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
