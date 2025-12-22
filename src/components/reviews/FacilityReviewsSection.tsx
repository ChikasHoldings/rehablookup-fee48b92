import { useFacilityReviews } from '@/hooks/useFacilityReviews';
import { ReviewForm } from './ReviewForm';
import { ReviewsList } from './ReviewsList';

interface FacilityReviewsSectionProps {
  facilityId: string;
  facilityName: string;
}

export function FacilityReviewsSection({ facilityId, facilityName }: FacilityReviewsSectionProps) {
  const {
    reviews,
    userReview,
    isLoading,
    averageRating,
    reviewCount,
    isAuthenticated,
    isEmailVerified,
    submitReview,
    updateReview,
    deleteReview,
    toggleHelpful,
    resendVerificationEmail
  } = useFacilityReviews(facilityId);

  return (
    <div className="space-y-6">
      <ReviewForm
        facilityName={facilityName}
        userReview={userReview}
        isAuthenticated={isAuthenticated}
        isEmailVerified={isEmailVerified}
        onSubmit={submitReview}
        onUpdate={updateReview}
        onDelete={deleteReview}
        onResendVerification={resendVerificationEmail}
      />
      
      <ReviewsList
        reviews={reviews}
        averageRating={averageRating}
        reviewCount={reviewCount}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        onToggleHelpful={toggleHelpful}
      />
    </div>
  );
}
