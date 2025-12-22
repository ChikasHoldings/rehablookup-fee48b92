import { useState, useEffect, useCallback } from 'react';
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
  // Joined data
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
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: null,
    needsResponse: 0,
    disputed: 0
  });

  const fetchReviews = useCallback(async () => {
    if (!selectedFacility?.id) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch approved reviews for this facility
    const { data: reviewsData, error } = await supabase
      .from('facility_reviews')
      .select('*')
      .eq('facility_id', selectedFacility.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      setIsLoading(false);
      return;
    }

    // Fetch responses
    const { data: responsesData } = await supabase
      .from('review_responses')
      .select('*')
      .eq('facility_id', selectedFacility.id);

    const responseMap = new Map(responsesData?.map(r => [r.review_id, r]) || []);

    // Fetch disputes
    const { data: disputesData } = await supabase
      .from('review_disputes')
      .select('*')
      .eq('facility_id', selectedFacility.id);

    const disputeMap = new Map(disputesData?.map(d => [d.review_id, d]) || []);

    // Fetch user display names
    const userIds = [...new Set(reviewsData?.map(r => r.user_id) || [])];
    const { data: profiles } = await supabase
      .from('seeker_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

    const enrichedReviews: ProviderReview[] = (reviewsData || []).map(review => ({
      ...review,
      disputed: review.disputed || false,
      user_display_name: profileMap.get(review.user_id) || 'Anonymous',
      response: responseMap.get(review.id) || null,
      dispute: disputeMap.get(review.id) || null
    }));

    setReviews(enrichedReviews);

    // Calculate stats
    const totalReviews = enrichedReviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((enrichedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : null;
    const needsResponse = enrichedReviews.filter(r => !r.response).length;
    const disputed = enrichedReviews.filter(r => r.dispute && r.dispute.status === 'pending').length;

    setStats({ totalReviews, averageRating, needsResponse, disputed });
    setIsLoading(false);
  }, [selectedFacility?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const submitResponse = async (reviewId: string, responseText: string) => {
    if (!selectedFacility?.id) return { error: new Error('No facility selected') };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('review_responses')
      .insert({
        review_id: reviewId,
        facility_id: selectedFacility.id,
        responder_user_id: user.id,
        response_text: responseText.trim()
      })
      .select()
      .single();

    if (!error) {
      fetchReviews();
    }

    return { data, error };
  };

  const updateResponse = async (responseId: string, responseText: string) => {
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
  };

  const deleteResponse = async (responseId: string) => {
    const { error } = await supabase
      .from('review_responses')
      .delete()
      .eq('id', responseId);

    if (!error) {
      fetchReviews();
    }

    return { error };
  };

  const flagReview = async (reviewId: string, reason: string, details?: string) => {
    if (!selectedFacility?.id) return { error: new Error('No facility selected') };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    // Create dispute
    const { error: disputeError } = await supabase
      .from('review_disputes')
      .insert({
        review_id: reviewId,
        facility_id: selectedFacility.id,
        disputed_by: user.id,
        reason,
        details: details?.trim() || null
      });

    if (disputeError) return { error: disputeError };

    // Update review disputed flag
    const { error: updateError } = await supabase
      .from('facility_reviews')
      .update({ disputed: true })
      .eq('id', reviewId);

    if (!updateError) {
      fetchReviews();
    }

    return { error: updateError };
  };

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
