import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getNearbyStates } from "@/lib/proximitySearch";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { treatmentCenters } from "@/data/treatmentCenters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  facilityMatchesInsurer,
  getInsurerMatch,
} from "@/lib/insurerMatchKeywords";

interface InsuranceFacilitiesSectionProps {
  /** Insurer slug from INSURER_MATCH_CONFIGS (e.g. "medicare", "aetna", "bcbs"). */
  insurerSlug: string;
  /** Override the default heading (e.g. "Treatment Centers Accepting Medicare"). */
  title?: string;
  /** Max number of facility cards to display in the carousel. */
  limit?: number;
  className?: string;
}

function getProximityTier(
  facility: { state?: string; city?: string },
  userState: string,
  userCity: string,
  nearbyStates: string[],
): number {
  if (!userState) return 4;
  const fState = (facility.state || "").toUpperCase();
  const uState = userState.toUpperCase();
  const uCity = userCity.toLowerCase();
  if (fState === uState && (facility.city || "").toLowerCase() === uCity) return 0;
  if (fState === uState) return 1;
  if (nearbyStates.map((s) => s.toUpperCase()).includes(fState)) return 2;
  return 3;
}

/**
 * Renders a horizontally-scrolling list of treatment centers that accept
 * a specific insurer, plus a live count of matching facilities and a
 * deep-link to the filtered search results.
 *
 * Falls back gracefully when no matching DB facilities exist by surfacing
 * a "Verify your benefits" CTA instead of an empty section.
 */
export function InsuranceFacilitiesSection({
  insurerSlug,
  title,
  limit = 8,
  className,
}: InsuranceFacilitiesSectionProps) {
  const insurer = getInsurerMatch(insurerSlug);
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();
  const geo = useGeoLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const userState = geo.regionCode || "";
  const userCity = geo.city || "";
  const nearbyStates = useMemo(
    () => (userState ? getNearbyStates(userState) : []),
    [userState],
  );

  const { matches, totalCount } = useMemo(() => {
    if (!insurer) return { matches: [], totalCount: 0 };

    // Combine DB-approved + static fallback; dedupe by id.
    const seen = new Set<string>();
    const pool: any[] = [];
    for (const f of approvedFacilities as any[]) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        pool.push(f);
      }
    }
    for (const f of treatmentCenters) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        pool.push({
          ...f,
          slug: null,
          isFromDatabase: false,
          logo_url: null,
          gallery_urls: null,
          hasFeaturedSubscription: false,
          isPro: false,
          verified: false,
          year_established: null,
          facilityType: null,
        });
      }
    }

    const filtered = pool.filter((f: any) =>
      facilityMatchesInsurer(f.insuranceAccepted, insurer.keywords),
    );

    // Sort: Pro > verified > ranking score, then proximity tier
    filtered.sort((a: any, b: any) => {
      if (a.isPro !== b.isPro) return a.isPro ? -1 : 1;
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return (b.calculatedRankingScore || 0) - (a.calculatedRankingScore || 0);
    });

    let display = filtered;
    if (userState && !geo.isLoading) {
      const tiers = new Map<number, any[]>();
      for (const f of filtered) {
        const tier = getProximityTier(f, userState, userCity, nearbyStates);
        if (!tiers.has(tier)) tiers.set(tier, []);
        tiers.get(tier)!.push(f);
      }
      display = [];
      for (const tier of [0, 1, 2, 3, 4]) {
        const group = tiers.get(tier);
        if (group?.length) display.push(...group);
      }
    }

    return {
      matches: display.slice(0, limit),
      totalCount: filtered.length,
    };
  }, [
    approvedFacilities,
    insurer,
    userState,
    userCity,
    nearbyStates,
    geo.isLoading,
    limit,
  ]);

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
  }, [updateScrollState, matches]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth =
      el.querySelector("[data-insurance-card]")?.clientWidth || 320;
    el.scrollBy({
      left: dir === "left" ? -cardWidth - 16 : cardWidth + 16,
      behavior: "smooth",
    });
  }, []);

  if (!insurer) return null;

  const heading = title ?? `Treatment Centers Accepting ${insurer.name}`;
  const searchHref = `/rehab-centers?browseInsurance=${encodeURIComponent(
    insurer.searchParam ?? insurer.name,
  )}`;

  // Loading skeleton
  if (isLoading) {
    return (
      <section className={cn("py-10 md:py-14", className)}>
        <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 border-b border-border bg-muted/20">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-7 w-72 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-3 sm:gap-4 md:gap-5 overflow-hidden px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] rounded-xl border border-border overflow-hidden bg-card"
                >
                  <Skeleton className="aspect-[16/9]" />
                  <div className="p-3 space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-9 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Empty state — no facilities currently list this insurer.
  // Surface a useful CTA rather than rendering nothing.
  if (totalCount === 0) {
    return (
      <section className={cn("py-10 md:py-14", className)}>
        <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm p-6 md:p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  In-Network Search
                </p>
                <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {heading}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Many of our verified facilities work with {insurer.name}. Verify
                  your specific plan benefits or browse our full directory.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link to={searchHref}>
                  Search {insurer.name} Centers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/rehab-centers">Browse All Facilities</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("py-10 md:py-14", className)}>
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    In-Network
                  </p>
                  <Badge variant="secondary" className="text-[10px] sm:text-xs">
                    {totalCount} {totalCount === 1 ? "center" : "centers"}
                  </Badge>
                </div>
                <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {heading}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  Verified facilities that list {insurer.name} as an accepted insurer
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
                        : "border-border/30 text-muted-foreground/30 cursor-default",
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
                        : "border-border/30 text-muted-foreground/30 cursor-default",
                    )}
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  to={searchHref}
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  View all {totalCount}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll track */}
          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto scroll-smooth px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {matches.map((center: any) => (
              <div
                key={center.id}
                className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] snap-start"
                data-insurance-card
              >
                <TreatmentCenterCard center={center} featured={true} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="mt-4 sm:hidden">
          <Link to={searchHref}>
            <Button variant="outline" size="sm" className="w-full gap-2 font-medium">
              View all {totalCount} {insurer.name} centers
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
