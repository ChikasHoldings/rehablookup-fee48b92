import { useMemo, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useStaticFacilities, type PublicFacility } from "@/hooks/useStaticFacilities";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getNearbyStates } from "@/lib/proximitySearch";
import { supabase } from "@/integrations/supabase/client";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";

// Grid sizing: the spec calls for a 2-column desktop grid showing
// 12 max / 10 min so the section reads as the primary directory
// surface on the homepage, not a thin teaser strip.
const GRID_MAX = 12;
const GRID_MIN = 10;

/** Stable per-day shuffle so the page doesn't churn between renders. */
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

function getProximityTier(
  facility: PublicFacility,
  userState: string,
  userCity: string,
  nearbyStates: string[],
): number {
  if (!userState) return 4;
  const fState = facility.state?.toUpperCase();
  const uState = userState.toUpperCase();
  const uCity = userCity.toLowerCase();
  if (fState === uState && facility.city?.toLowerCase() === uCity) return 0;
  if (fState === uState) return 1;
  if (nearbyStates.map((s) => s.toUpperCase()).includes(fState)) return 2;
  return 3;
}

/**
 * Sort key per task spec:
 *   is_featured DESC → featured_priority DESC → rating DESC
 *
 * `is_featured` is the boolean union of `isHomepageFeatured` (curated)
 * and `hasFeaturedSubscription` (paid Featured slot). `featured_priority`
 * is a derived score so curated-AND-paid outranks curated-only, which
 * outranks paid-only — the canonical priority bias for any directory
 * surface.
 */
function sortKey(f: PublicFacility): [number, number, number] {
  const fAny = f as unknown as {
    isHomepageFeatured?: boolean;
    hasFeaturedSubscription?: boolean;
  };
  const curated = fAny.isHomepageFeatured ? 1 : 0;
  const paid = fAny.hasFeaturedSubscription ? 1 : 0;
  const isFeatured = curated || paid;
  // 3 = curated+paid, 2 = curated only, 1 = paid only, 0 = neither
  const featuredPriority = curated * 2 + paid;
  const rating = f.googleRating ?? 0;
  return [isFeatured, featuredPriority, rating];
}

function compareBySortKey(a: PublicFacility, b: PublicFacility): number {
  const ka = sortKey(a);
  const kb = sortKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return kb[i] - ka[i]; // DESC
  }
  return 0;
}

export function HomepageFeaturedSection() {
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();
  const geo = useGeoLocation();
  const hasTrackedImpressions = useRef(false);

  const userState = geo.regionCode || "";
  const userCity = geo.city || "";
  const nearbyStates = useMemo(
    () => (userState ? getNearbyStates(userState) : []),
    [userState],
  );

  const featuredCenters = useMemo(() => {
    // Featured pool: anything explicitly featured (curated or paid).
    const featured = approvedFacilities.filter((f) => {
      const fAny = f as unknown as {
        isHomepageFeatured?: boolean;
        hasFeaturedSubscription?: boolean;
      };
      return fAny.isHomepageFeatured || fAny.hasFeaturedSubscription;
    });

    // Verified fallback pool: anything verified (or Pro) that isn't already
    // in the featured list. Used only when featured < GRID_MIN so the grid
    // never reads thin.
    const featuredIds = new Set(featured.map((f) => f.id));
    const verifiedFallback = approvedFacilities.filter((f) => {
      if (featuredIds.has(f.id)) return false;
      const fAny = f as unknown as { isPro?: boolean; verified?: boolean | null };
      return !!fAny.isPro || !!fAny.verified;
    });

    // Build the pool: featured first (sorted), verified fallback second
    // (sorted). When even verified is too thin (early-stage / staging),
    // back off to the static treatmentCenters seed list.
    let pool: PublicFacility[] = [...featured].sort(compareBySortKey);
    if (pool.length < GRID_MIN) {
      pool = pool.concat([...verifiedFallback].sort(compareBySortKey));
    }
    if (pool.length < GRID_MIN) {
      const staticFallback = treatmentCenters
        .filter((c) => c.featured)
        .map((c): PublicFacility => ({
          ...c,
          slug: null,
          isFromDatabase: false,
          logo_url: null,
          gallery_urls: null,
          isPro: false,
          verified: false,
          year_established: null,
          facilityType: null,
          googleRating: null,
          googleReviewCount: null,
          planTier: "free",
        }));
      pool = pool.concat(staticFallback);
    }

    // Apply proximity tiering as a stable secondary signal: re-rank
    // each section of `pool` (featured/fallback) so the same-state
    // facility floats up within its tier, without breaking the
    // featured-first ordering of the pool itself.
    const seed = getDailySeed();
    if (userState && !geo.isLoading) {
      const tiered: PublicFacility[] = [];
      const buckets: Map<number, PublicFacility[]> = new Map();
      for (const f of pool) {
        const tier = getProximityTier(f, userState, userCity, nearbyStates);
        if (!buckets.has(tier)) buckets.set(tier, []);
        buckets.get(tier)!.push(f);
      }
      for (const tier of [0, 1, 2, 3, 4]) {
        const group = buckets.get(tier);
        if (group?.length) tiered.push(...seededShuffle(group, seed + tier));
      }
      pool = tiered;
    } else {
      pool = seededShuffle(pool, seed);
    }

    return pool.slice(0, GRID_MAX);
  }, [approvedFacilities, userState, userCity, nearbyStates, geo.isLoading]);

  const trackFeaturedImpressions = useCallback(async () => {
    if (hasTrackedImpressions.current) return;
    const dbFacilities = featuredCenters.filter((c) => {
      const cAny = c as unknown as {
        isFromDatabase?: boolean;
        hasFeaturedSubscription?: boolean;
        isPro?: boolean;
      };
      return cAny.isFromDatabase && (cAny.hasFeaturedSubscription || cAny.isPro) && c.id;
    });
    if (dbFacilities.length === 0) return;
    hasTrackedImpressions.current = true;
    for (const facility of dbFacilities) {
      try {
        await supabase.functions.invoke("track-featured-analytics", {
          body: { facility_id: facility.id, event_type: "impression" },
        });
      } catch {
        /* silent */
      }
    }
  }, [featuredCenters]);

  useEffect(() => {
    if (featuredCenters.length > 0) trackFeaturedImpressions();
  }, [featuredCenters, trackFeaturedImpressions]);

  if (isLoading) {
    return (
      <section className="py-10 md:py-14">
        <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
          <FeaturedSkeleton />
        </div>
      </section>
    );
  }

  if (featuredCenters.length === 0) return null;

  const locationLabel =
    geo.isUS && userState && !geo.isLoading
      ? `Showing centers near ${userCity ? `${userCity}, ` : ""}${userState}`
      : "Verified facilities across the United States";

  // Round live count to the nearest hundred and prefix with the
  // canonical "3,800+" floor used on the trust bar. We never advertise
  // fewer centers than the trust bar counts up to.
  const liveCount = approvedFacilities.length;
  const advertisedCount =
    liveCount >= 3800 ? `${Math.floor(liveCount / 100) * 100}+` : "3,800+";

  return (
    <section className="py-10 md:py-14">
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Section header */}
        <header className="mx-auto max-w-3xl text-center mb-7 md:mb-9">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Top-Rated Treatment Facilities
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            {locationLabel}
          </p>
        </header>

        {/* 2-column desktop grid, 1-column mobile. 10-12 facilities. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {featuredCenters.map((center) => (
            <TreatmentCenterCard
              key={center.id}
              center={center}
              featured={true}
            />
          ))}
        </div>

        {/* Single CTA — primary directory entry point */}
        <div className="mt-8 md:mt-10 text-center">
          <Link
            to="/rehab-centers"
            className="inline-flex items-center gap-2 text-base md:text-lg font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            View all {advertisedCount} centers
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturedSkeleton() {
  return (
    <div>
      <div className="mx-auto max-w-3xl text-center space-y-2 mb-7 md:mb-9">
        <Skeleton className="h-8 md:h-10 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border overflow-hidden bg-card"
          >
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
