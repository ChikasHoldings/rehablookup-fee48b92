import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProviderFacilities } from './useProviderFacilities';

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
  reviewer_first_name?: string;
  reviewer_last_initial?: string;
  reviewer_city?: string;
  reviewer_state?: string;
  response?: ReviewResponse | null;
  dispute?: ReviewDispute | null;
  // Facility info for centralized view
  facility_name?: string;
  facility_city?: string;
  facility_state?: string;
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
  const { facilities } = useProviderFacilities();
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get all facility IDs
  const facilityIds = useMemo(() => facilities.map(f => f.id), [facilities]);
  
  // Create facility lookup map
  const facilityMap = useMemo(() => {
    const map = new Map<string, { name: string; city: string; state: string }>();
    facilities.forEach(f => {
      map.set(f.id, { name: f.name, city: f.city, state: f.state });
    });
    return map;
  }, [facilities]);

  const fetchReviews = useCallback(async () => {
    if (facilityIds.length === 0) {
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
          .select('id, user_id, facility_id, rating, review_text, status, helpful_count, disputed, created_at, updated_at')
          .in('facility_id', facilityIds)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase
          .from('review_responses')
          .select('id, review_id, facility_id, responder_user_id, response_text, status, created_at, updated_at')
          .in('facility_id', facilityIds),
        supabase
          .from('review_disputes')
          .select('id, review_id, facility_id, disputed_by, reason, details, status, admin_notes, resolved_by, resolved_at, created_at')
          .in('facility_id', facilityIds)
      ]);

      if (reviewsResult.error) {
        console.error('Error fetching reviews:', reviewsResult.error);
        setIsLoading(false);
        return;
      }

      const reviewsData = reviewsResult.data || [];
      const responseMap = new Map(responsesResult.data?.map(r => [r.review_id, r]) || []);
      const disputeMap = new Map(disputesResult.data?.map(d => [d.review_id, d]) || []);

      // Fetch user profile info only if we have reviews
      let profileMap = new Map<string, { display_name: string | null; first_name: string | null; last_name: string | null; city: string | null; state: string | null }>();
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('seeker_profiles')
          .select('user_id, display_name, first_name, last_name, city, state')
          .in('user_id', userIds);
        
        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      const enrichedReviews: ProviderReview[] = reviewsData.map(review => {
        const profile = profileMap.get(review.user_id);
        const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
        const lastInitial = profile?.last_name?.charAt(0) || profile?.display_name?.split(' ')[1]?.charAt(0) || '';
        const displayName = firstName
          ? firstName + (lastInitial ? ` ${lastInitial}.` : '')
          : 'Verified User';
        const facilityInfo = facilityMap.get(review.facility_id);
        
        return {
          ...review,
          disputed: review.disputed || false,
          user_display_name: displayName,
          reviewer_first_name: firstName || 'V',
          reviewer_last_initial: lastInitial || 'U',
          reviewer_city: profile?.city || null,
          reviewer_state: profile?.state || null,
          response: responseMap.get(review.id) || null,
          dispute: disputeMap.get(review.id) || null,
          facility_name: facilityInfo?.name,
          facility_city: facilityInfo?.city,
          facility_state: facilityInfo?.state,
        };
      });

      setReviews(enrichedReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [facilityIds, facilityMap]);

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
    const review = reviews.find(r => r.id === reviewId);
    if (!review) {
      console.error('[submitResponse] Review not found:', reviewId);
      return { error: new Error('Review not found') };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[submitResponse] Auth error:', authError);
      return { error: authError || new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('review_responses')
      .insert({
        review_id: reviewId,
        facility_id: review.facility_id,
        responder_user_id: user.id,
        response_text: responseText.trim()
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Notify seeker about response
    supabase.functions.invoke('send-review-notification', {
      body: {
        type: 'review_response',
        reviewId,
        facilityId: review.facility_id,
        seekerId: review.user_id,
        responseText: responseText.trim(),
      }
    }).catch(err => console.error('Failed to send response notification:', err));
    
    fetchReviews();
    return { data, error: null };
  }, [reviews, fetchReviews]);

  const updateResponse = useCallback(async (responseId: string, responseText: string) => {
    const { data, error } = await supabase
      .from('review_responses')
      .update({ response_text: responseText.trim() })
      .eq('id', responseId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    fetchReviews();
    return { data, error: null };
  }, [fetchReviews]);

  const deleteResponse = useCallback(async (responseId: string) => {
    const { error } = await supabase
      .from('review_responses')
      .delete()
      .eq('id', responseId);

    if (error) {
      return { error };
    }

    fetchReviews();
    return { error: null };
  }, [fetchReviews]);

  const flagReview = useCallback(async (reviewId: string, reason: string, details?: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return { error: new Error('Review not found') };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { error: disputeError } = await supabase
      .from('review_disputes')
      .insert({
        review_id: reviewId,
        facility_id: review.facility_id,
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
      // Notify admins about the dispute
      supabase.functions.invoke('send-review-notification', {
        body: {
          type: 'review_disputed',
          reviewId,
          facilityId: review.facility_id,
          providerId: user.id,
          reason,
          details: details?.trim() || null,
        }
      }).catch(err => console.error('Failed to send dispute notification:', err));
      
      fetchReviews();
    }

    return { error: updateError };
  }, [reviews, fetchReviews]);

  return {
    reviews,
    facilities,
    isLoading,
    stats,
    submitResponse,
    updateResponse,
    deleteResponse,
    flagReview,
    refetch: fetchReviews
  };
}
