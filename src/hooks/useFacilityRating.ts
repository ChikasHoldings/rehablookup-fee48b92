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

    const fetchRating = async () => {
      const { data, error } = await supabase
        .from('facility_reviews')
        .select('rating')
        .eq('facility_id', facilityId)
        .eq('status', 'approved');

      if (error || !data || data.length === 0) {
        setRating({ averageRating: null, reviewCount: 0 });
        setIsLoading(false);
        return;
      }

      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setRating({
        averageRating: Math.round(avg * 10) / 10,
        reviewCount: data.length
      });
      setIsLoading(false);
    };

    fetchRating();
  }, [facilityId]);

  return { ...rating, isLoading };
}

// Batch fetch ratings for multiple facilities
export async function fetchFacilityRatings(facilityIds: string[]): Promise<Map<string, FacilityRating>> {
  if (facilityIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('facility_reviews')
    .select('facility_id, rating')
    .in('facility_id', facilityIds)
    .eq('status', 'approved');

  if (error || !data) return new Map();

  // Group by facility_id
  const grouped = new Map<string, number[]>();
  data.forEach(r => {
    const existing = grouped.get(r.facility_id) || [];
    existing.push(r.rating);
    grouped.set(r.facility_id, existing);
  });

  // Calculate averages
  const result = new Map<string, FacilityRating>();
  grouped.forEach((ratings, facilityId) => {
    const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    result.set(facilityId, {
      averageRating: Math.round(avg * 10) / 10,
      reviewCount: ratings.length
    });
  });

  return result;
}
