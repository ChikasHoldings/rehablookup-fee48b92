import { useState, useEffect, useCallback, useRef } from 'react';
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

const REVIEW_COOLDOWN_MS = 30_000; // 30-second cooldown between submissions

export function useFacilityReviews(facilityId: string) {
  const [reviews, setReviews] = useState<FacilityReview[]>([]);
  const [userReview, setUserReview] = useState<FacilityReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const lastSubmitRef = useRef<number>(0);
  const { user, isAuthenticated, isReady } = useSeekerSession();
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Check email verification status non-blockingly
  useEffect(() => {
    if (!user?.email) { setIsEmailVerified(false); return; }
    supabase.rpc('is_email_verified', { p_email: user.email })
      .then(({ data }) => setIsEmailVerified(!!data));
  }, [user?.email]);

  const resendVerificationEmail = useCallback(async () => {
    if (!user?.email) return { error: new Error('No email') };
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email: user.email }
      });
      if (error || data?.error) return { error: new Error(data?.error || 'Failed') };
      return { error: null };
    } catch (e: any) { return { error: e }; }
  }, [user?.email]);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);

    // Fetch approved reviews
    const { data: reviewsData, error } = await supabase
      .from('facility_reviews')
      .select('id, facility_id, user_id, rating, review_text, status, helpful_count, created_at, updated_at, reviewer_display_name')
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
      const storedName = (review as any).reviewer_display_name;
      const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
      const lastInitial = profile?.last_name?.charAt(0) || profile?.display_name?.split(' ')[1]?.charAt(0) || '';
      const builtName = firstName ? firstName + (lastInitial ? ` ${lastInitial}.` : '') : '';
      
      // Priority: stored reviewer_display_name → built from profile (name is required at signup)
      // Never fall back to "Anonymous" — name is mandatory at submission time
      const displayName = storedName || builtName || null;
      
      return {
        ...review,
        user_display_name: displayName,
        reviewer_first_name: firstName || displayName?.charAt(0) || '',
        reviewer_last_initial: lastInitial || '',
        reviewer_city: profile?.city || null,
        reviewer_state: profile?.state || null,
        has_voted_helpful: votedReviewIds.includes(review.id)
      };
    }).filter(r => !!r.user_display_name);

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
      .select('id, facility_id, user_id, rating, review_text, status, helpful_count, created_at, updated_at')
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

  const isReviewAuthReady = isReady;

  const submitReview = async (rating: number, reviewText: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (!isEmailVerified) return { error: new Error('Please verify your email before submitting a review.') };

    // Client-side cooldown to prevent rapid submissions
    const now = Date.now();
    if (now - lastSubmitRef.current < REVIEW_COOLDOWN_MS) {
      return { error: new Error('Please wait a moment before submitting another review.') };
    }

    if (!reviewText || reviewText.trim().length < 10) return { error: new Error('Review text is required (minimum 10 characters)') };
    if (reviewText.length > 2000) return { error: new Error('Review text must be 2000 characters or less') };

    // Sanitize review text client-side (server also validates)
    const sanitized = reviewText
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .trim();

    // Resolve reviewer display name — required, not optional
    let reviewerDisplayName: string | null = null;
    
    // 1. Try seeker_profiles (primary source — name is required at signup)
    const { data: profile } = await supabase
      .from('seeker_profiles')
      .select('first_name, last_name, display_name')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profile) {
      const fn = profile.first_name || profile.display_name?.split(' ')[0] || '';
      const li = profile.last_name?.charAt(0) || profile.display_name?.split(' ')[1]?.charAt(0) || '';
      if (fn) reviewerDisplayName = fn + (li ? ` ${li}.` : '');
    }
    
    // 2. Fallback to auth user_metadata (covers edge cases)
    if (!reviewerDisplayName) {
      const meta = user.user_metadata;
      const fn = meta?.first_name || meta?.full_name?.split(' ')[0] || '';
      const li = meta?.last_name?.charAt(0) || meta?.full_name?.split(' ')[1]?.charAt(0) || '';
      if (fn) reviewerDisplayName = fn + (li ? ` ${li}.` : '');
    }

    // Block submission if name cannot be resolved
    if (!reviewerDisplayName) {
      return { error: new Error('Unable to resolve your name. Please update your profile before leaving a review.') };
    }

    const { data, error } = await supabase
      .from('facility_reviews')
      .insert({
        user_id: user.id,
        facility_id: facilityId,
        rating,
        review_text: sanitized || null,
        reviewer_display_name: reviewerDisplayName
      } as any)
      .select()
      .single();

    if (!error && data) {
      lastSubmitRef.current = Date.now();
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
    isAuthLoading: !isReady,
    isReviewAuthReady,
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    resendVerificationEmail,
    refetch: fetchReviews
  };
}
