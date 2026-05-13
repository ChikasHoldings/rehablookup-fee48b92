import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FacilityRating {
  averageRating: number | null;
  reviewCount: number;
}

export function useFacilityRating(facilityId: string | undefined) {
  const [rating, setRating] = useState<FacilityRating>({ averageRating: null, reviewCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!facilityId) {
      setRating({ averageRating: null, reviewCount: 0 });
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const fetchRating = async () => {
      // Server-side aggregate. Previously fetched every approved review row
      // into the client and averaged in JS — slow + wasteful for popular
      // facilities with hundreds of reviews. The RPC returns just two
      // numbers regardless of review volume.
      const { data, error } = await supabase
        .rpc('get_facility_rating', { p_facility_id: facilityId });
      if (cancelled) return;
      if (error || !data || data.length === 0 || (data[0]?.review_count ?? 0) === 0) {
        setRating({ averageRating: null, reviewCount: 0 });
        setIsLoading(false);
        return;
      }
      const row = data[0] as { average_rating: number | null; review_count: number };
      setRating({
        averageRating: row.average_rating ?? null,
        reviewCount: row.review_count ?? 0,
      });
      setIsLoading(false);
    };

    void fetchRating();
    return () => { cancelled = true; };
  }, [facilityId]);

  return { ...rating, isLoading };
}

// Batch fetch ratings for multiple facilities (used by lists/grids).
// Server-side aggregate via get_facility_ratings_batch RPC keeps the wire
// payload tiny regardless of how many reviews any single facility has.
export async function fetchFacilityRatings(facilityIds: string[]): Promise<Map<string, FacilityRating>> {
  if (facilityIds.length === 0) return new Map();

  const { data, error } = await supabase
    .rpc('get_facility_ratings_batch', { p_facility_ids: facilityIds });

  if (error || !data) return new Map();

  const result = new Map<string, FacilityRating>();
  for (const row of data as Array<{ facility_id: string; average_rating: number | null; review_count: number }>) {
    result.set(row.facility_id, {
      averageRating: row.average_rating ?? null,
      reviewCount: row.review_count ?? 0,
    });
  }
  return result;
}
