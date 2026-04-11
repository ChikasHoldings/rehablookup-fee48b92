import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Star, MapPin, ShieldCheck, Phone, ChevronLeft, ChevronRight, Globe, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaticFacilities, type PublicFacility } from "@/hooks/useStaticFacilities";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getNearbyStates } from "@/lib/proximitySearch";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { cn } from "@/lib/utils";
import { treatmentCenters } from "@/data/treatmentCenters";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";

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
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasTrackedImpressions = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const userState = geo.regionCode || "";
  const userCity = geo.city || "";
  const nearbyStates = useMemo(() => userState ? getNearbyStates(userState) : [], [userState]);

  const featuredCenters = useMemo(() => {
    const dbFeatured = approvedFacilities.filter(
      (f: any) => f.isHomepageFeatured || f.hasFeaturedSubscription
    );
    const staticFeatured = treatmentCenters
      .filter((c) => c.featured)
      .map((c) => ({
        ...c, slug: null, isFromDatabase: false, logo_url: null, gallery_urls: null,
        hasFeaturedSubscription: false, isPro: false, verified: false,
        year_established: null, facilityType: null, googleRating: null, googleReviewCount: null,
      }));

    let pool = dbFeatured.length > 0 ? [...dbFeatured] : [...staticFeatured as any[]];
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

    if (pool.length < 8) {
      const existing = new Set(pool.map(p => p.id));
      const extra = (staticFeatured as any[]).filter(s => !existing.has(s.id));
      pool.push(...extra.slice(0, 8 - pool.length));
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
    <section className="py-14 md:py-20 bg-muted/30">
      <div className="container px-4 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Featured Centers
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Top-Rated Treatment Facilities
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {locationLabel}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={cn(
                  "h-10 w-10 rounded-full border flex items-center justify-center transition-colors",
                  canScrollLeft
                    ? "border-border bg-card hover:bg-accent text-foreground cursor-pointer"
                    : "border-border/40 text-muted-foreground/30 cursor-default"
                )}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={cn(
                  "h-10 w-10 rounded-full border flex items-center justify-center transition-colors",
                  canScrollRight
                    ? "border-border bg-card hover:bg-accent text-foreground cursor-pointer"
                    : "border-border/40 text-muted-foreground/30 cursor-default"
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
              View all centers
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Scroll track */}
        <div className="relative -mx-4 md:-mx-6 lg:-mx-8">
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-[linear-gradient(to_right,hsl(var(--muted)/0.3),transparent)] pointer-events-none z-10 hidden md:block" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-[linear-gradient(to_left,hsl(var(--muted)/0.3),transparent)] pointer-events-none z-10 hidden md:block" />
          )}

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scroll-smooth px-4 md:px-6 lg:px-8 pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {featuredCenters.map((center: any, index: number) => (
              <FeaturedCard
                key={center.id}
                center={center}
                index={index}
                onClick={() => {
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
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 sm:hidden">
          <Link to="/rehab-centers">
            <Button variant="outline" className="w-full gap-2 font-medium">
              View All Centers
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
  const yearsInBusiness = center.year_established ? new Date().getFullYear() - center.year_established : null;

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
        "group relative flex-shrink-0 w-[320px] sm:w-[340px] md:w-[360px] snap-start",
        "rounded-xl overflow-hidden bg-card cursor-pointer",
        "border border-border",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      )}
    >
      {/* Hero */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <img
          src={hasHero ? heroImage : facilityPlaceholder}
          alt={`${center.name} facility`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
          onError={() => setImgErr(true)}
        />

        {/* Top bar: Featured + Verified */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </span>
          {center.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card/95 backdrop-blur-sm text-[10px] font-semibold text-foreground border border-border/50">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Verified
            </span>
          )}
        </div>

        {/* Rating pill */}
        {center.googleRating && center.googleReviewCount ? (
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card/95 backdrop-blur-sm text-xs font-semibold border border-border/50">
              <Star className="h-3 w-3 text-primary fill-primary" />
              {center.googleRating.toFixed(1)}
              <span className="text-muted-foreground font-normal text-[11px]">({center.googleReviewCount})</span>
            </span>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Identity */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {hasLogo ? (
              <img src={center.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setLogoErr(true)} />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-display text-sm font-bold text-muted-foreground">{initials}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-semibold text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {center.name}
            </h3>
            <p className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{center.city}, {center.state}</span>
            </p>
          </div>
        </div>

        {/* Details row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3 pb-3 border-b border-border">
          {center.facilityType && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {center.facilityType}
            </span>
          )}
          {yearsInBusiness && yearsInBusiness > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Est. {center.year_established}
            </span>
          )}
          {!center.facilityType && !yearsInBusiness && center.treatmentTypes?.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {center.treatmentTypes[0]}
            </span>
          )}
        </div>

        {/* Treatment types */}
        {center.treatmentTypes?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {center.treatmentTypes.slice(0, 3).map((t: string) => (
              <span
                key={t}
                className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-[11px] font-medium text-muted-foreground"
              >
                {t}
              </span>
            ))}
            {center.treatmentTypes.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-[11px] text-muted-foreground/60">
                +{center.treatmentTypes.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex-1 h-9 text-xs font-medium rounded-lg"
          >
            View Profile
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
          {center.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `tel:${center.phone}`;
              }}
              className="h-9 w-9 p-0 rounded-lg shrink-0"
              aria-label={`Call ${center.name}`}
            >
              <Phone className="h-3.5 w-3.5" />
            </Button>
          )}
          {center.website && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(center.website, "_blank", "noopener,noreferrer");
              }}
              className="h-9 w-9 p-0 rounded-lg shrink-0"
              aria-label={`Visit ${center.name} website`}
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ Skeleton ═══════════════════ */

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
