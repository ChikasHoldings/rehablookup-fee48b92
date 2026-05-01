import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFacilityReviews } from '@/hooks/useFacilityReviews';
import { ReviewForm } from './ReviewForm';
import { ReviewsList } from './ReviewsList';

interface FacilityReviewsSectionProps {
  facilityId: string;
  facilityName: string;
}

/**
 * Unified, single-block reviews section.
 *
 * Previously rendered two stacked Cards ("Write a Review" + "Community Reviews"),
 * which — when nested inside the profile's <ProfileSection title="Community Reviews">
 * wrapper — visually read as two separate sections (and even duplicated the title).
 *
 * Now renders one consolidated flow:
 *   1. Aggregate rating summary (avg + count)
 *   2. The user's own review status / submission form
 *   3. The list of community reviews
 *
 * Subcomponents are rendered in `bare` mode so they don't add their own Card chrome
 * or duplicate headings. The parent <ProfileSection> on CenterProfile owns the title.
 */
export function FacilityReviewsSection({ facilityId, facilityName }: FacilityReviewsSectionProps) {
  const {
    reviews,
    userReview,
    isLoading,
    averageRating,
    reviewCount,
    isAuthenticated,
    isEmailVerified,
    isReviewAuthReady,
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    resendVerificationEmail
  } = useFacilityReviews(facilityId);

  return (
    <div className="space-y-6">
      {/* Aggregate rating summary */}
      {averageRating && reviewCount > 0 && (
        <div className="flex items-center gap-2 pb-4 border-b border-border/40">
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
          <span className="font-semibold text-foreground">{averageRating}</span>
          <span className="text-muted-foreground text-sm">
            ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      )}

      {/* User's review form / status */}
      <ReviewForm
        bare
        facilityName={facilityName}
        userReview={userReview}
        isAuthenticated={isAuthenticated}
        isAuthReady={isReviewAuthReady}
        isEmailVerified={isEmailVerified}
        onSubmit={submitReview}
        onUpdate={updateReview}
        onDelete={deleteReview}
        onResendVerification={resendVerificationEmail}
      />

      {/* Community reviews list */}
      <ReviewsList
        bare
        reviews={reviews}
        averageRating={averageRating}
        reviewCount={reviewCount}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        onToggleHelpful={toggleHelpful}
        facilityId={facilityId}
      />
    </div>
  );
}
