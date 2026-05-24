import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import type { TreatmentCenter } from "@/data/treatmentCenters";
import {
  useFeaturedRotation,
  useLogFeaturedStripImpression,
  type PlacementType,
  type FeaturedRotationFacility,
} from "@/hooks/useFeaturedRotation";

interface LandingFeaturedSectionProps {
  placement_type: PlacementType;
  placement_value: string | null | undefined;
  /** Defaults: homepage=10, article=6, everything else=8. */
  slot_count?: number;
  /** Override the section title. Defaults to "Featured Treatment Facilities". */
  title?: string;
  /** Override the subtitle copy under the title. */
  subtitle?: string;
  /** Where the "View all" link points. Defaults to /rehab-centers. */
  view_all_href?: string;
  className?: string;
}

const DEFAULT_SLOTS_BY_TYPE: Record<PlacementType, number> = {
  homepage: 10,
  state: 8,
  city: 8,
  near_me: 8,
  treatment: 8,
  insurance: 8,
  search: 8,
  article: 6,
};

/**
 * Cross-site Featured rotation section. Same visual treatment as
 * HomepageFeaturedSection (bordered container + header row + horizontal
 * scroll with arrow buttons + "View all" link + TreatmentCenterCard
 * cards) but driven by the paid Featured rotation pool
 * (useFeaturedRotation → get-featured-rotation edge function) instead
 * of useStaticFacilities.
 *
 * Mounted on every main landing page right under the hero / trust bar
 * so seekers see the live paid Featured pool consistently across the
 * site. The seed cookie (`rl_rot_seed`) means a single visitor sees
 * the same rotation order across reloads; different visitors see
 * different orders — round-robin fair across all 100 seeds.
 *
 * Renders nothing when the pool is empty (silent absence).
 */
export function LandingFeaturedSection({
  placement_type,
  placement_value,
  slot_count,
  title,
  subtitle,
  view_all_href,
  className,
}: LandingFeaturedSectionProps) {
  const resolvedSlotCount = slot_count ?? DEFAULT_SLOTS_BY_TYPE[placement_type];
  const { data, isLoading } = useFeaturedRotation({
    placement_type,
    placement_value,
    slot_count: resolvedSlotCount,
    log_impressions: false,
    // 2026-05-20 policy: NEVER backfill the Featured section with
    // non-Featured organic facilities. The Featured rail is paid
    // inventory; if no paying subscriber covers the visitor's bucket
    // we hide the entire section rather than dilute the paid surface
    // with organic content. This was previously `true` to keep the
    // section visible while the paid pool grew; that behavior is
    // explicitly retired per the EKRA-aligned monetization rebuild
    // — "Featured" must always mean paid placement, never editorial.
    fallback_to_top_rated: false,
  });

  const facilities = data?.facilities ?? [];
  // `is_fallback` is now always false (fallback_to_top_rated disabled
  // above) but we keep the destructure so future re-enablement
  // doesn't silently regress the relabeling logic.
  const isFallback = data?.is_fallback ?? false;

  if (!placement_value) return null;
  if (isLoading) return <LandingFeaturedSkeleton title={title} className={className} />;
  // Empty paid pool → auto-hide the entire section. No editorial
  // backfill, no "Top-Rated" relabel, no skeleton placeholder.
  if (facilities.length === 0) return null;

  // When falling back to organic top-rated, relabel so we don't imply
  // paid placement. Caller-supplied title still wins.
  const defaultTitle = isFallback
    ? "Top-Rated Treatment Facilities"
    : "Featured Treatment Facilities";
  const defaultSubtitle = isFallback
    ? "Verified, accredited facilities ready to help"
    : "Verified, accredited facilities ready to help";

  return (
    <FeaturedScroller
      facilities={facilities}
      placement_type={placement_type}
      placement_value={placement_value}
      title={title ?? defaultTitle}
      subtitle={subtitle ?? defaultSubtitle}
      view_all_href={view_all_href ?? "/search-results"}
      className={className}
      is_fallback={isFallback}
    />
  );
}

interface ScrollerProps {
  facilities: FeaturedRotationFacility[];
  placement_type: PlacementType;
  placement_value: string;
  title: string;
  subtitle: string;
  view_all_href: string;
  className?: string;
  /** True when the rendered facilities come from the fallback top-rated
   *  pool (no paid Featured subscribers covered the bucket). Suppresses
   *  the strip-impression log + the "Featured" chip on the cards so the
   *  paid-placement signal stays accurate. */
  is_fallback?: boolean;
}

function FeaturedScroller({
  facilities,
  placement_type,
  placement_value,
  title,
  subtitle,
  view_all_href,
  className,
  is_fallback,
}: ScrollerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const logImpression = useLogFeaturedStripImpression({ placement_type, placement_value });
  const loggedRef = useRef<Set<string>>(new Set());

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
  }, [updateScrollState, facilities.length]);

  // Viewport-debounced impression logging shared across all cards in
  // the scroller. A single IntersectionObserver attached to the
  // scroll container catches each card as it crosses 50% visible,
  // dwells 500ms, then fires once per (facility_id, page view).
  //
  // Skipped entirely when is_fallback is true — those rows aren't
  // paid Featured slots, so logging them would inflate the
  // featured_impressions analytics and conflate organic with paid.
  useEffect(() => {
    if (is_fallback) return;
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-featured-card]");
    if (cards.length === 0) return;

    const dwellTimers = new Map<string, number>();

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const node = e.target as HTMLElement;
          const id = node.dataset.facilityId ?? "";
          const posStr = node.dataset.position ?? "0";
          if (!id) continue;
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            if (loggedRef.current.has(id)) continue;
            if (dwellTimers.has(id)) continue;
            const t = window.setTimeout(() => {
              if (loggedRef.current.has(id)) return;
              loggedRef.current.add(id);
              logImpression(id, parseInt(posStr, 10) || 0);
              dwellTimers.delete(id);
            }, 500);
            dwellTimers.set(id, t);
          } else if (dwellTimers.has(id)) {
            window.clearTimeout(dwellTimers.get(id)!);
            dwellTimers.delete(id);
          }
        }
      },
      { root: null, threshold: [0, 0.5, 1] },
    );
    cards.forEach((c) => obs.observe(c));
    return () => {
      obs.disconnect();
      for (const t of dwellTimers.values()) window.clearTimeout(t);
      dwellTimers.clear();
    };
  }, [facilities, logImpression, is_fallback]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector("[data-featured-card]")?.clientWidth || 360;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir === "left" ? -cardWidth - 20 : cardWidth + 20,
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  return (
    <section className={cn("py-6 md:py-10", className)}>
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  {title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                  {subtitle}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden md:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scroll("left")}
                    disabled={!canScrollLeft}
                    aria-label="Scroll Featured facilities left"
                    className={cn(
                      "h-9 w-9 rounded-lg border flex items-center justify-center transition-all",
                      canScrollLeft
                        ? "border-border bg-card hover:bg-muted text-foreground hover:border-primary/30"
                        : "border-border/30 text-muted-foreground/30 cursor-default",
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scroll("right")}
                    disabled={!canScrollRight}
                    aria-label="Scroll Featured facilities right"
                    className={cn(
                      "h-9 w-9 rounded-lg border flex items-center justify-center transition-all",
                      canScrollRight
                        ? "border-border bg-card hover:bg-muted text-foreground hover:border-primary/30"
                        : "border-border/30 text-muted-foreground/30 cursor-default",
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  to={view_all_href}
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto scroll-smooth px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {facilities.map((f) => (
              <div
                key={f.facility_id}
                data-featured-card
                data-facility-id={f.facility_id}
                data-position={f.position_in_rail}
                data-cta-location="featured_landing_section"
                className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] snap-start"
              >
                <TreatmentCenterCard
                  center={facilityFromRotation(f, !is_fallback)}
                  featured={!is_fallback}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Adapter: shape a FeaturedRotationFacility into the TreatmentCenter
 * shape TreatmentCenterCard expects. Most fields the card uses are
 * already there; the rest are filled with sensible defaults so the
 * card renders cleanly without optional-chaining throughout.
 */
function facilityFromRotation(
  f: FeaturedRotationFacility,
  isPaidFeatured: boolean,
): TreatmentCenter & {
  slug: string | null;
  isFromDatabase: boolean;
  logo_url: string | null;
  hasFeaturedSubscription: boolean;
  isPro: boolean;
  verified: boolean | null;
} {
  return {
    id: f.facility_id,
    name: f.name,
    city: f.city,
    state: f.state,
    zipCode: "",
    address: "",
    phone: f.display_phone ?? "",
    treatmentTypes: f.top_levels_of_care ?? [],
    insuranceAccepted: f.top_insurance ?? [],
    description: f.sponsored_tagline ?? f.description ?? "",
    programOverview: "",
    featured: isPaidFeatured,
    rating: null,
    reviewCount: 0,
    amenities: [],
    image: null,
    slug: f.slug,
    isFromDatabase: true,
    logo_url: f.logo_url,
    hasFeaturedSubscription: isPaidFeatured,
    isPro: isPaidFeatured,
    verified: f.verified,
  };
}

function LandingFeaturedSkeleton({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <section className={cn("py-6 md:py-10", className)} aria-hidden>
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 border-b border-border bg-muted/20">
            <Skeleton className="h-6 w-64" />
          </div>
          <div className="flex gap-3 sm:gap-4 md:gap-5 overflow-hidden px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] h-[320px] rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
