/**
 * SimilarCenters
 * ──────────────
 * 3-card row of similar facilities in the same state + facility_type,
 * ordered by ranking + completeness score. Reuses the existing
 * FacilityCard component. Queries public_facilities so the same
 * pending-claim / suspended / unapproved filters apply.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FacilityCard, type FacilityCardData } from "@/components/cards/FacilityCard";
import { useFacilityChildData } from "@/hooks/useFacilityChildData";

interface SimilarCentersProps {
  /** Current facility id — excluded from results. */
  excludeId: string;
  state: string;
  facilityType: string | null;
}

const SIMILAR_LIMIT = 3;

export function SimilarCenters({ excludeId, state, facilityType }: SimilarCentersProps) {
  const { data: similar = [] } = useQuery({
    queryKey: ["similar-centers", state, facilityType, excludeId],
    enabled: !!state,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let query = supabase
        .from("public_facilities")
        .select(
          "id, name, slug, city, state, facility_type, description, logo_url, phone, verified, is_claimed",
        )
        .eq("state", state)
        .neq("id", excludeId)
        .order("calculated_ranking_score", { ascending: false, nullsFirst: false })
        .order("listing_completeness_score", { ascending: false, nullsFirst: false })
        .limit(SIMILAR_LIMIT);
      if (facilityType) query = query.eq("facility_type", facilityType);
      const { data } = await query;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        slug: string | null;
        city: string;
        state: string;
        facility_type: string | null;
        description: string | null;
        logo_url: string | null;
        phone: string | null;
        verified: boolean | null;
        is_claimed: boolean | null;
      }>;
    },
  });

  const ids = similar.map((s) => s.id);
  const { data: childData } = useFacilityChildData(ids);

  if (similar.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8 md:py-12 border-t border-slate-200">
      <h2 className="text-xl font-semibold text-slate-900 mb-5">Similar Centers Nearby</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {similar.map((row) => {
          const card: FacilityCardData = {
            id: row.id,
            name: row.name,
            slug: row.slug,
            city: row.city,
            state: row.state,
            facility_type: row.facility_type,
            description: row.description,
            logo_url: row.logo_url,
            phone: row.phone,
            verified: row.verified,
            is_claimed: row.is_claimed ?? undefined,
          };
          return (
            <FacilityCard
              key={row.id}
              facility={card}
              services={childData?.services.get(row.id) ?? []}
              insurance={childData?.insurance.get(row.id) ?? []}
              ageGroups={childData?.ageGroups.get(row.id) ?? []}
              accreditations={childData?.accreditations.get(row.id) ?? []}
            />
          );
        })}
      </div>
    </section>
  );
}
