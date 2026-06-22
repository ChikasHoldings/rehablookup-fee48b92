import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  reviewer_display_name: string | null;
  created_at: string;
  updated_at: string;
  user_display_name?: string;
  reviewer_first_name?: string;
  reviewer_last_initial?: string;
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
  /**
   * Reviews that already have a `review_responses` row. Surfaced as
   * the count on the "Replied" tab so the provider can see what
   * they've already engaged with vs the unresponded set. Optional
   * so the existing `stats` calls in useProviderReviews (which
   * doesn't compute this yet — only the page-level filtered stats
   * does) still type-check.
   */
  replied?: number;
  disputed: number;
}

export function useProviderReviews() {
  const { facilities } = useProviderFacilities();
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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

  // Coalesce concurrent refetches: realtime listeners + explicit save-then-refetch
  // calls can both fire within the same tick. Track the in-flight request and
  // drop overlapping calls to avoid double-fetch storms.
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastFetchAtRef = useRef<number>(0);

  const fetchReviews = useCallback(async () => {
    if (facilityIds.length === 0) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    // Coalesce: if a fetch fired in the last 250ms, drop this one.
    const now = Date.now();
    if (inFlightRef.current) return inFlightRef.current;
    if (now - lastFetchAtRef.current < 250) return;

    setIsLoading(true);
    setIsError(false);
    const work = (async () => {
      try {
        // Fetch reviews + responses + disputes in parallel. We deliberately
        // do NOT fetch seeker_profiles here — RLS restricts it to the owning
        // user + admins, so the call would return an empty set for providers
        // anyway. The snapshot `reviewer_display_name` stored on the review
        // row at submission time is the canonical display source.
        const [reviewsResult, responsesResult, disputesResult] = await Promise.all([
          supabase
            .from('facility_reviews')
            .select('id, user_id, facility_id, rating, review_text, status, helpful_count, disputed, created_at, updated_at, reviewer_display_name')
            .in('facility_id', facilityIds)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(2000),
          supabase
            .from('review_responses')
            .select('id, review_id, facility_id, responder_user_id, response_text, status, created_at, updated_at')
            .in('facility_id', facilityIds)
            .limit(5000),
          supabase
            .from('review_disputes')
            .select('id, review_id, facility_id, disputed_by, reason, details, status, admin_notes, resolved_by, resolved_at, created_at')
            .in('facility_id', facilityIds)
            .limit(5000)
        ]);

        if (reviewsResult.error) {
          console.error('[useProviderReviews] reviews fetch error:', reviewsResult.error);
          setIsError(true);
          return;
        }
        if (responsesResult.error) {
          console.error('[useProviderReviews] responses fetch error:', responsesResult.error);
        }
        if (disputesResult.error) {
          console.error('[useProviderReviews] disputes fetch error:', disputesResult.error);
        }

        const reviewsData = reviewsResult.data || [];
        const responseMap = new Map(responsesResult.data?.map(r => [r.review_id, r]) || []);
        const disputeMap = new Map(disputesResult.data?.map(d => [d.review_id, d]) || []);

        const enrichedReviews: ProviderReview[] = reviewsData.map(review => {
          const storedName = review.reviewer_display_name;
          const displayName = storedName?.trim() || 'Verified Reviewer';
          const nameParts = displayName.split(/\s+/).filter(Boolean);
          const firstName = nameParts[0] || 'Verified';
          // Show only last initial to the provider — matches the public
          // ReviewsList privacy model. Snapshots stored as "First L." remain
          // a single token; snapshots stored as "First Last" are truncated.
          const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) : '';
          const renderedName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;
          const facilityInfo = facilityMap.get(review.facility_id);

          return {
            ...review,
            disputed: review.disputed || false,
            user_display_name: renderedName,
            reviewer_first_name: firstName,
            reviewer_last_initial: lastInitial,
            response: responseMap.get(review.id) || null,
            dispute: disputeMap.get(review.id) || null,
            facility_name: facilityInfo?.name,
            facility_city: facilityInfo?.city,
            facility_state: facilityInfo?.state,
          };
        });

        setReviews(enrichedReviews);
      } catch (error) {
        console.error('[useProviderReviews] unexpected error:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
        lastFetchAtRef.current = Date.now();
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = work;
    return work;
  }, [facilityIds, facilityMap]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Realtime: re-fetch when a review (or response/dispute) for any of the
  // provider's facilities changes. Server only emits messages that the JWT
  // can see, so this is safe without additional filtering. We re-fetch the
  // whole list rather than mutating in-place to keep the join enrichment
  // logic in one place.
  useEffect(() => {
    if (facilityIds.length === 0) return;
    // Per-mount random suffix prevents the "cannot add postgres_changes
    // callbacks after subscribe()" crash when this hook remounts (e.g.,
    // dashboard re-mount after PlanStep navigates from /onboarding) and
    // the previous channel hasn't fully unsubscribed yet.
    const channelName = `provider-reviews-${facilityIds.join(",")}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facility_reviews" },
        () => { fetchReviews(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "review_responses" },
        () => { fetchReviews(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "review_disputes" },
        () => { fetchReviews(); },
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch { /* already torn down */ }
    };
  }, [facilityIds, fetchReviews]);

  // Calculate stats from reviews. The `disputed` count uses `!!r.dispute`
  // (matches the page-level filtered stats + the Disputed tab predicate) so
  // the stat card and tab badge never drift.
  const stats = useMemo<ReviewStats>(() => {
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : null;
    const needsResponse = reviews.filter(r => !r.response).length;
    const disputed = reviews.filter(r => !!r.dispute).length;

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
    const { data: deleted, error } = await supabase
      .from('review_responses')
      .delete()
      .eq('id', responseId)
      .select('id');

    if (error) {
      return { error };
    }
    // 0 rows + no error == RLS blocked the delete. Surface it instead of a
    // false "Response deleted" toast (the response would reappear on refetch).
    if (!deleted || deleted.length === 0) {
      return { error: new Error("Couldn't delete the response — it may have already been removed.") };
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

    // The UI drives the "Disputed" badge off the joined `review_disputes`
    // row (not the legacy `facility_reviews.disputed` boolean), so no
    // post-insert update is needed here. Notify admins + refresh.
    supabase.functions
      .invoke('send-review-notification', {
        body: {
          type: 'review_disputed',
          reviewId,
          facilityId: review.facility_id,
          providerId: user.id,
          // The function reads `disputeReason` (not `reason`); sending the
          // wrong key dropped the reason from the admin email + notification.
          disputeReason: reason,
        },
      })
      .catch((err) => console.error('Failed to send dispute notification:', err));

    fetchReviews();
    return { error: null };
  }, [reviews, fetchReviews]);

  return {
    reviews,
    facilities,
    isLoading,
    isError,
    stats,
    submitResponse,
    updateResponse,
    deleteResponse,
    flagReview,
    refetch: fetchReviews
  };
}
