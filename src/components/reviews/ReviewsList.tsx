import { useState, useEffect } from 'react';
import { Star, ThumbsUp, User, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FacilityReview } from '@/hooks/useFacilityReviews';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ReviewResponse {
  id: string;
  review_id: string;
  response_text: string;
  created_at: string;
}

interface ReviewsListProps {
  reviews: FacilityReview[];
  averageRating: number | null;
  reviewCount: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  onToggleHelpful: (reviewId: string) => Promise<{ error: Error | null }>;
  facilityId?: string;
}

export function ReviewsList({ 
  reviews, 
  averageRating, 
  reviewCount, 
  isLoading,
  isAuthenticated,
  onToggleHelpful,
  facilityId
}: ReviewsListProps) {
  const [responses, setResponses] = useState<Map<string, ReviewResponse>>(new Map());

  useEffect(() => {
    if (!facilityId || reviews.length === 0) return;

    const fetchResponses = async () => {
      const reviewIds = reviews.map(r => r.id);
      const { data } = await supabase
        .from('review_responses')
        .select('*')
        .in('review_id', reviewIds)
        .eq('status', 'active');

      if (data) {
        const map = new Map(data.map(r => [r.review_id, r]));
        setResponses(map);
      }
    };

    fetchResponses();
  }, [facilityId, reviews]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Community Reviews</CardTitle>
          {averageRating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= Math.round(averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <span className="font-semibold">{averageRating}</span>
              <span className="text-muted-foreground text-sm">({reviewCount} reviews)</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => {
              const response = responses.get(review.id);
              return (
                <div key={review.id} className="border-b border-border/50 pb-6 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {review.reviewer_first_name?.charAt(0) || 'V'}
                          {review.reviewer_last_initial || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{review.user_display_name || 'Verified User'}</p>
                        {(review.reviewer_city || review.reviewer_state) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {[review.reviewer_city, review.reviewer_state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {review.review_text && (
                    <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                      {review.review_text}
                    </p>
                  )}

                  {/* Provider Response */}
                  {response && (
                    <div className="mt-3 ml-6 border-l-2 border-primary/20 pl-4 bg-muted/30 rounded-r-lg py-2 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">Response from Facility</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(response.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80">{response.response_text}</p>
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 text-xs gap-1.5",
                        review.has_voted_helpful && "text-primary"
                      )}
                      onClick={() => onToggleHelpful(review.id)}
                      disabled={!isAuthenticated}
                      title={isAuthenticated ? 'Mark as helpful' : 'Sign in to vote'}
                    >
                      <ThumbsUp className={cn("h-3.5 w-3.5", review.has_voted_helpful && "fill-current")} />
                      Helpful ({review.helpful_count})
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
