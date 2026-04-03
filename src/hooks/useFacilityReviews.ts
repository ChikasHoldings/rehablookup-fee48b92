import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSeekerSession } from './useSeekerSession';

export interface FacilityReview {
  id: string;
  user_id: string;
  facility_id: string;
  rating: number;
  review_text: string | null;
  status: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  user_display_name?: string;
  reviewer_first_name?: string;
  reviewer_last_initial?: string;
  reviewer_city?: string;
  reviewer_state?: string;
  has_voted_helpful?: boolean;
}

export function useFacilityReviews(facilityId: string) {
  const [reviews, setReviews] = useState<FacilityReview[]>([]);
  const [userReview, setUserReview] = useState<FacilityReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const { user, isAuthenticated, isEmailVerified, resendVerificationEmail, isLoading: isAuthLoading } = useSeekerAuth();

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);

    // Fetch approved reviews
    const { data: reviewsData, error } = await supabase
      .from('facility_reviews')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      setIsLoading(false);
      return;
    }

    // If user is logged in, check which reviews they've voted helpful
    let votedReviewIds: string[] = [];
    if (user) {
      const { data: votes } = await supabase
        .from('review_helpful_votes')
        .select('review_id')
        .eq('user_id', user.id);
      
      votedReviewIds = votes?.map(v => v.review_id) || [];
    }

    // Fetch user profile info from seeker_profiles
    const userIds = [...new Set(reviewsData?.map(r => r.user_id) || [])];
    const { data: profiles } = await supabase
      .from('seeker_profiles')
      .select('user_id, display_name, first_name, last_name, city, state')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedReviews: FacilityReview[] = (reviewsData || []).map(review => {
      const profile = profileMap.get(review.user_id);
      const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || 'Anonymous';
      const lastInitial = profile?.last_name?.charAt(0) || profile?.display_name?.split(' ')[1]?.charAt(0) || '';
      
      return {
        ...review,
        user_display_name: firstName + (lastInitial ? ` ${lastInitial}.` : ''),
        reviewer_first_name: firstName,
        reviewer_last_initial: lastInitial,
        reviewer_city: profile?.city || null,
        reviewer_state: profile?.state || null,
        has_voted_helpful: votedReviewIds.includes(review.id)
      };
    });

    setReviews(enrichedReviews);
    setReviewCount(enrichedReviews.length);
    
    if (enrichedReviews.length > 0) {
      const avg = enrichedReviews.reduce((sum, r) => sum + r.rating, 0) / enrichedReviews.length;
      setAverageRating(Math.round(avg * 10) / 10);
    }

    setIsLoading(false);
  }, [facilityId, user]);

  // Fetch user's own review (including pending)
  const fetchUserReview = useCallback(async () => {
    if (!user) {
      setUserReview(null);
      return;
    }

    const { data } = await supabase
      .from('facility_reviews')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('user_id', user.id)
      .maybeSingle();

    setUserReview(data);
  }, [facilityId, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchUserReview();
  }, [fetchUserReview]);

  const isReviewAuthReady = !isAuthLoading;

  const submitReview = async (rating: number, reviewText: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('facility_reviews')
      .insert({
        user_id: user.id,
        facility_id: facilityId,
        rating,
        review_text: reviewText.trim() || null
      })
      .select()
      .single();

    if (!error && data) {
      setUserReview(data);
      
      // Notify admins about new review
      supabase.functions.invoke('send-review-notification', {
        body: {
          type: 'review_submitted',
          reviewId: data.id,
          facilityId,
          seekerId: user.id,
        }
      }).catch(err => console.error('Failed to send review notification:', err));
    }

    return { data, error };
  };

  const updateReview = async (rating: number, reviewText: string) => {
    if (!user || !userReview) return { error: new Error('No review to update') };

    const { data, error } = await supabase
      .from('facility_reviews')
      .update({
        rating,
        review_text: reviewText.trim() || null,
        status: 'pending' // Reset to pending after edit
      })
      .eq('id', userReview.id)
      .select()
      .single();

    if (!error && data) {
      setUserReview(data);
    }

    return { data, error };
  };

  const deleteReview = async () => {
    if (!user || !userReview) return { error: new Error('No review to delete') };

    const { error } = await supabase
      .from('facility_reviews')
      .delete()
      .eq('id', userReview.id);

    if (!error) {
      setUserReview(null);
      fetchReviews();
    }

    return { error };
  };

  const toggleHelpful = async (reviewId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const review = reviews.find(r => r.id === reviewId);
    if (!review) return { error: new Error('Review not found') };

    if (review.has_voted_helpful) {
      // Remove vote
      const { error } = await supabase
        .from('review_helpful_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', user.id);

      if (!error) {
        setReviews(prev => prev.map(r => 
          r.id === reviewId 
            ? { ...r, helpful_count: r.helpful_count - 1, has_voted_helpful: false }
            : r
        ));
      }
      return { error };
    } else {
      // Add vote
      const { error } = await supabase
        .from('review_helpful_votes')
        .insert({ review_id: reviewId, user_id: user.id });

      if (!error) {
        setReviews(prev => prev.map(r => 
          r.id === reviewId 
            ? { ...r, helpful_count: r.helpful_count + 1, has_voted_helpful: true }
            : r
        ));
      }
      return { error };
    }
  };

  return {
    reviews,
    userReview,
    isLoading,
    averageRating,
    reviewCount,
    isAuthenticated,
    isEmailVerified,
    isAuthLoading,
    isReviewAuthReady,
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    resendVerificationEmail,
    refetch: fetchReviews
  };
}
