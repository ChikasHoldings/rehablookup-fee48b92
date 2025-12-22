import { Star, ThumbsUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FacilityReview } from '@/hooks/useFacilityReviews';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsListProps {
  reviews: FacilityReview[];
  averageRating: number | null;
  reviewCount: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  onToggleHelpful: (reviewId: string) => Promise<{ error: Error | null }>;
}

export function ReviewsList({ 
  reviews, 
  averageRating, 
  reviewCount, 
  isLoading,
  isAuthenticated,
  onToggleHelpful 
}: ReviewsListProps) {
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
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-border/50 pb-6 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{review.user_display_name || 'Anonymous'}</p>
                      <div className="flex items-center gap-2">
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
