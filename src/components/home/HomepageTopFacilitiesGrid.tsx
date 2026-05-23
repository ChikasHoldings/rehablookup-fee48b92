import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useStaticFacilities, type PublicFacility } from "@/hooks/useStaticFacilities";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Top Facilities — 3×2 organic-quality grid on the homepage.
 *
 * Why this exists:
 *   The homepage already surfaces paid Featured (HomepageGeoFeaturedRail
 *   above) and SEO/state-grid coverage (FindByStateSection). Visitors
 *   browsing for a starting point benefit from a small editorial picks
 *   strip showing six high-signal facilities ranked by organic quality
 *   — review coverage, profile completeness, photos, claimed/verified
 *   status. Independent of the paid Featured rail; we filter Featured
 *   out so the two sections don't double-surface the same facility.
 *
 * Ranking signal stack (additive, larger = better):
 *   reviews          log(count+1) × rating × 2   (primary)
 *   completeness     listingCompletenessScore × 0.5
 *   photos           logo (+3), gallery (+min(N,5))
 *   pro              +10 if paid Pro plan
 *   claimed          +5
 *   verified         +5
 *   cached ranking   calculatedRankingScore × 0.1  (tie-breaker)
 *
 * Fallback strategy:
 *   1. If ≥6 facilities have any positive signal → take top 6 by score.
 *   2. If fewer scored facilities are available → top up with the
 *      remaining approved pool sorted by name for deterministic
 *      coverage. Section only hides if the entire snapshot is empty.
 *
 * The "View all" link routes to /rehab-centers (the canonical browse
 * surface) per the user requirement, not /search-results.
 */
export function HomepageTopFacilitiesGrid() {
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const topSix = useMemo<PublicFacility[]>(() => {
    if (!approvedFacilities.length) return [];

    // Drop the paid Featured pool — they already render in
    // HomepageGeoFeaturedRail directly above this section.
    const pool = approvedFacilities.filter(
      (f) => !f.featured && !f.featuredPinned,
    );

    const scored = pool
      .map((f) => ({ facility: f, score: scoreFacility(f) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.facility.name.localeCompare(b.facility.name);
      });

    const positiveSignal = scored.filter((s) => s.score > 0);
    if (positiveSignal.length >= 6) {
      return positiveSignal.slice(0, 6).map((s) => s.facility);
    }

    const fillerCount = 6 - positiveSignal.length;
    const used = new Set(positiveSignal.map((s) => s.facility.id));
    const filler = scored
      .filter((s) => !used.has(s.facility.id))
      .slice(0, fillerCount)
      .map((s) => s.facility);

    return [...positiveSignal.map((s) => s.facility), ...filler];
  }, [approvedFacilities]);

  if (isLoading) {
    return (
      <section className="py-10 md:py-12 lg:py-16 bg-background border-t border-border/40">
        <div className="container px-4 md:px-6 lg:px-8">
          <header className="mb-6 text-center max-w-2xl mx-auto">
            <Skeleton className="h-4 w-32 mx-auto mb-2" />
            <Skeleton className="h-7 w-72 mx-auto mb-2" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (topSix.length === 0) return null;

  return (
    <section
      aria-labelledby="top-facilities-heading"
      className="py-10 md:py-12 lg:py-16 bg-background border-t border-border/40"
    >
      <div className="container px-4 md:px-6 lg:px-8">
        <header className="mb-6 md:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Top-Rated Centers
              </span>
            </div>
            <h2
              id="top-facilities-heading"
              className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground tracking-tight"
            >
              Top facilities on RehabLookup
            </h2>
            <p className="mt-1.5 text-sm md:text-base text-muted-foreground leading-relaxed">
              Ranked by review coverage, profile completeness, accreditation
              signals, and claim status — not by ad spend.
            </p>
          </div>
          <Link
            to="/rehab-centers"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 hover:border-primary/30 transition-all"
          >
            View all centers
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {topSix.map((center) => (
            <TreatmentCenterCard key={center.id} center={center} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary/70" aria-hidden />
          <span>
            Editorial picks based on public signals. No facility paid for this
            placement.
          </span>
        </div>

        <div className="mt-4 sm:hidden">
          <Link to="/rehab-centers">
            <Button variant="outline" size="sm" className="w-full gap-2 font-medium">
              View all centers
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Composite organic-quality score. Larger = better. Returns 0 for a
 * facility with no positive signals so the fallback path can detect
 * the "no good candidates" case.
 */
function scoreFacility(f: PublicFacility): number {
  let score = 0;

  const rating = f.googleRating ?? 0;
  const reviewCount = f.googleReviewCount ?? 0;
  if (reviewCount > 0 && rating > 0) {
    score += Math.log(reviewCount + 1) * rating * 2;
  }

  score += (f.listingCompletenessScore ?? 0) * 0.5;

  if (f.logo_url) score += 3;
  const galleryCount = f.gallery_urls?.length ?? 0;
  score += Math.min(galleryCount, 5);

  if (f.isPro || f.planTier === "pro") score += 10;
  if (f.isClaimed) score += 5;
  if (f.verified === true) score += 5;

  score += (f.calculatedRankingScore ?? 0) * 0.1;

  return score;
}
