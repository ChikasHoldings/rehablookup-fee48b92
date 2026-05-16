import { FacilityCard, type FacilityCardData } from "@/components/cards/FacilityCard";
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
 * Never shows an empty state — a Featured rail with "no sponsored
 * placements yet" would be noise. Better to be absent until paid
 * inventory exists.
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

  // Silent absence: don't render anything during the initial fetch or
  // when the bucket has no eligible subscribers. Page rendering is
  // unaffected.
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
          // Adapt the rotation response to the FacilityCard shape.
          const cardData: FacilityCardData = {
            id: f.facility_id,
            name: f.name,
            slug: f.slug,
            city: f.city,
            state: f.state,
            facility_type: f.facility_type,
            description: f.description,
            logo_url: f.logo_url,
            phone: f.display_phone,
            verified: f.verified,
            is_claimed: true, // featured subscribers are always claimed
          };
          return (
            <FacilityCard
              key={f.facility_id}
              facility={cardData}
              featured
              phoneOverride={f.display_phone}
              onPhoneClick={() => logClick(f.facility_id)}
            />
          );
        })}
      </div>
    </section>
  );
}
