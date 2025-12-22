import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSelectedFacility } from '@/contexts/SelectedFacilityContext';

export interface ProviderReview {
  id: string;
  user_id: string;
  facility_id: string;
  rating: number;
  review_text: string | null;
  status: string;
  helpful_count: number;
  disputed: boolean;
  created_at: string;
  updated_at: string;
  user_display_name?: string;
  response?: ReviewResponse | null;
  dispute?: ReviewDispute | null;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  facility_id: string;
  responder_user_id: string;
  response_text: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewDispute {
  id: string;
  review_id: string;
  facility_id: string;
  disputed_by: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number | null;
  needsResponse: number;
  disputed: number;
}

export function useProviderReviews() {
  const { selectedFacility } = useSelectedFacility();
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const facilityId = selectedFacility?.id;

  const fetchReviews = useCallback(async () => {
    if (!facilityId) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch all data in parallel for better performance
      const [reviewsResult, responsesResult, disputesResult] = await Promise.all([
        supabase
          .from('facility_reviews')
          .select('*')
          .eq('facility_id', facilityId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
        supabase
          .from('review_responses')
          .select('*')
          .eq('facility_id', facilityId),
        supabase
          .from('review_disputes')
          .select('*')
          .eq('facility_id', facilityId)
      ]);

      if (reviewsResult.error) {
        console.error('Error fetching reviews:', reviewsResult.error);
        setIsLoading(false);
        return;
      }

      const reviewsData = reviewsResult.data || [];
      const responseMap = new Map(responsesResult.data?.map(r => [r.review_id, r]) || []);
      const disputeMap = new Map(disputesResult.data?.map(d => [d.review_id, d]) || []);

      // Fetch user display names only if we have reviews
      let profileMap = new Map<string, string>();
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('seeker_profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      }

      const enrichedReviews: ProviderReview[] = reviewsData.map(review => ({
        ...review,
        disputed: review.disputed || false,
        user_display_name: profileMap.get(review.user_id) || 'Anonymous',
        response: responseMap.get(review.id) || null,
        dispute: disputeMap.get(review.id) || null
      }));

      setReviews(enrichedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Calculate stats from reviews using useMemo to prevent recalculation
  const stats = useMemo<ReviewStats>(() => {
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : null;
    const needsResponse = reviews.filter(r => !r.response).length;
    const disputed = reviews.filter(r => r.dispute && r.dispute.status === 'pending').length;

    return { totalReviews, averageRating, needsResponse, disputed };
  }, [reviews]);

  const submitResponse = useCallback(async (reviewId: string, responseText: string) => {
    if (!facilityId) return { error: new Error('No facility selected') };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('review_responses')
      .insert({
        review_id: reviewId,
        facility_id: facilityId,
        responder_user_id: user.id,
        response_text: responseText.trim()
      })
      .select()
      .single();

    if (!error) {
      fetchReviews();
    }

    return { data, error };
  }, [facilityId, fetchReviews]);

  const updateResponse = useCallback(async (responseId: string, responseText: string) => {
    const { data, error } = await supabase
      .from('review_responses')
      .update({ response_text: responseText.trim() })
      .eq('id', responseId)
      .select()
      .single();

    if (!error) {
      fetchReviews();
    }

    return { data, error };
  }, [fetchReviews]);

  const deleteResponse = useCallback(async (responseId: string) => {
    const { error } = await supabase
      .from('review_responses')
      .delete()
      .eq('id', responseId);

    if (!error) {
      fetchReviews();
    }

    return { error };
  }, [fetchReviews]);

  const flagReview = useCallback(async (reviewId: string, reason: string, details?: string) => {
    if (!facilityId) return { error: new Error('No facility selected') };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error: disputeError } = await supabase
      .from('review_disputes')
      .insert({
        review_id: reviewId,
        facility_id: facilityId,
        disputed_by: user.id,
        reason,
        details: details?.trim() || null
      });

    if (disputeError) return { error: disputeError };

    const { error: updateError } = await supabase
      .from('facility_reviews')
      .update({ disputed: true })
      .eq('id', reviewId);

    if (!updateError) {
      fetchReviews();
    }

    return { error: updateError };
  }, [facilityId, fetchReviews]);

  return {
    reviews,
    isLoading,
    stats,
    submitResponse,
    updateResponse,
    deleteResponse,
    flagReview,
    refetch: fetchReviews
  };
}
