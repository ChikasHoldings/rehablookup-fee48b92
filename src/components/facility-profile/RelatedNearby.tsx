import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MapPin, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FacilityCard, type FacilityCardData } from "@/components/cards/FacilityCard";
import { useFacilityChildData } from "@/hooks/useFacilityChildData";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RelatedRow {
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
}

const SELECT = [
  "id",
  "name",
  "slug",
  "city",
  "state",
  "facility_type",
  "description",
  "logo_url",
  "phone",
  "verified",
  "is_claimed",
].join(",");

export interface RelatedNearbyProps {
  facility: {
    id: string;
    state: string;
    facility_type: string | null;
  };
  limit?: number;
  className?: string;
}

export function RelatedNearby({ facility, limit = 3, className }: RelatedNearbyProps) {
  const { data: rows = [] } = useQuery({
    queryKey: [
      "related-nearby",
      facility.state,
      facility.facility_type,
      facility.id,
      limit,
    ],
    enabled: !!facility.state && !!facility.id,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<RelatedRow[]> => {
      let query = supabase
        .from("public_facilities")
        .select(SELECT)
        .eq("state", facility.state)
        .neq("id", facility.id)
        .order("calculated_ranking_score", { ascending: false, nullsFirst: false })
        .order("listing_completeness_score", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (facility.facility_type) {
        query = query.eq("facility_type", facility.facility_type);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as RelatedRow[]) ?? [];
    },
  });

  const ids = rows.map((r) => r.id);
  const { data: kids } = useFacilityChildData(ids);

  if (rows.length === 0) return null;

  const stateSlug = facility.state.toLowerCase().replace(/\s+/g, "-");

  return (
    <section
      className={cn("mt-10 border-t border-slate-200 pt-8", className)}
      aria-labelledby="related-nearby-heading"
    >
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          <MapPin className="h-4 w-4 text-[#1B365D]" />
        </div>
        <h2
          id="related-nearby-heading"
          className="font-display text-lg font-bold tracking-tight text-slate-900"
        >
          More {facility.facility_type ?? "Facilities"} in {facility.state}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const card: FacilityCardData = {
            id: r.id,
            name: r.name,
            slug: r.slug,
            city: r.city,
            state: r.state,
            facility_type: r.facility_type,
            description: r.description,
            logo_url: r.logo_url,
            phone: r.phone,
            verified: r.verified,
            is_claimed: r.is_claimed ?? undefined,
          };
          return (
            <FacilityCard
              key={r.id}
              facility={card}
              services={kids?.services.get(r.id) ?? []}
              insurance={kids?.insurance.get(r.id) ?? []}
              ageGroups={kids?.ageGroups.get(r.id) ?? []}
              accreditations={kids?.accreditations.get(r.id) ?? []}
            />
          );
        })}
      </div>
      <div className="mt-6 text-center">
        <Link to={`/rehab-centers/${stateSlug}`}>
          <Button variant="outline" className="gap-2">
            View All in {facility.state}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
