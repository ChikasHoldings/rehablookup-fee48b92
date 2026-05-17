import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useFeaturedRotation, useLogFeaturedPhoneClick, type PlacementType } from "@/hooks/useFeaturedRotation";
import { FeaturedTooltip } from "./FeaturedTooltip";

interface FeaturedRailProps {
  placement_type: PlacementType;
  /** Bucket key inside the placement type — e.g. state slug, city slug,
   *  treatment slug, "national" for homepage. Null/undefined → rail is
   *  silently skipped (used by /near-me pages while geo-IP resolves). */
  placement_value: string | null | undefined;
  /** Number of cards to render. Defaults to the bucket-typical count. */
  slot_count?: number;
  title?: string;
  /** Optional className for the section wrapper. */
  className?: string;
}

const DEFAULT_SLOT_COUNT: Record<PlacementType, number> = {
  homepage: 6,
  state: 3,
  city: 3,
  search: 3,
  near_me: 3,
  treatment: 3,
  insurance: 5,
  article: 3,
};

/**
 * Featured rail — top-of-page row of paid placements, rendered above
 * organic results on eligible pages. Hides silently when:
 *   • the bucket has zero eligible Featured subscribers
 *   • `placement_value` is null (caller hasn't resolved it yet)
 *
 * Card visual matches /rehab-centers (TreatmentCenterCard) for cross-
 * site consistency. The component is largely superseded by
 * LandingFeaturedSection; kept here so any direct callers stay valid.
 */
export function FeaturedRail({
  placement_type,
  placement_value,
  slot_count = DEFAULT_SLOT_COUNT[placement_type],
  title = "Featured facilities",
  className,
}: FeaturedRailProps) {
  const { data, isLoading } = useFeaturedRotation({
    placement_type,
    placement_value,
    slot_count,
  });
  const logClick = useLogFeaturedPhoneClick({
    placement_type,
    placement_value: placement_value ?? "",
  });

  if (isLoading || !data || data.facilities.length === 0) return null;

  return (
    <section className={className} aria-label="Featured facilities">
      <header className="mb-3 flex items-center gap-1.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {title}
        </h2>
        <FeaturedTooltip />
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.facilities.map((f) => {
          const center = {
            id: f.facility_id,
            name: f.name,
            slug: f.slug,
            city: f.city,
            state: f.state,
            zipCode: "",
            address: "",
            phone: f.display_phone ?? "",
            description: f.sponsored_tagline ?? f.description ?? "",
            programOverview: "",
            featured: true,
            rating: null,
            reviewCount: 0,
            amenities: [],
            image: null,
            isFromDatabase: true,
            logo_url: f.logo_url,
            verified: f.verified,
            facilityType: f.facility_type,
            treatmentTypes: f.top_levels_of_care ?? [],
            insuranceAccepted: f.top_insurance ?? [],
            hasFeaturedSubscription: true,
            isPro: true,
          } as Parameters<typeof TreatmentCenterCard>[0]["center"];
          return (
            <div
              key={f.facility_id}
              data-cta-location="featured_rail"
              onClickCapture={() => logClick(f.facility_id)}
            >
              <TreatmentCenterCard center={center} featured />
            </div>
          );
        })}
      </div>
    </section>
  );
}
