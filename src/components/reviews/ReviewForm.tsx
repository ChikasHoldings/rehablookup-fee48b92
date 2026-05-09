import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { FacilityReview } from '@/hooks/useFacilityReviews';

interface ReviewFormProps {
  facilityName: string;
  userReview: FacilityReview | null;
  isAuthenticated: boolean;
  isAuthReady?: boolean;
  isEmailVerified?: boolean;
  onSubmit: (rating: number, reviewText: string) => Promise<{ error: Error | null }>;
  onUpdate: (rating: number, reviewText: string) => Promise<{ error: Error | null }>;
  onDelete: () => Promise<{ error: Error | null }>;
  onResendVerification?: () => Promise<{ error: Error | null }>;
  /**
   * When true, render without an outer Card wrapper (used when the parent
   * already provides a unified section heading + container).
   */
  bare?: boolean;
}

export function ReviewForm({ 
  facilityName, 
  userReview, 
  isAuthenticated,
  isAuthReady = true,
  isEmailVerified = true,
  onSubmit,
  onUpdate,
  onDelete,
  onResendVerification,
  bare = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(userReview?.review_text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // When `bare`, replace shadcn Card primitives with plain divs so the form
  // sits flush inside the parent's unified section (no nested card chrome).
  const ShellCard: React.ElementType = bare
    ? (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />
    : Card;
  const ShellHeader: React.ElementType = bare
    ? (props: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props} className={cn('mb-3', props.className)} />
      )
    : CardHeader;
  const ShellContent: React.ElementType = bare
    ? (props: React.HTMLAttributes<HTMLDivElement>) => <div {...props} />
    : CardContent;

  const handleResendVerification = async () => {
    if (!onResendVerification) return;
    setIsResending(true);
    const { error } = await onResendVerification();
    setIsResending(false);
    
    if (error) {
      toast.error('Failed to send verification email');
    } else {
      toast.success('Verification email sent! Check your inbox.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    const trimmedText = reviewText.trim();

    // Review text is required
    if (!trimmedText) {
      toast.error('Please write a review before submitting');
      return;
    }

    if (trimmedText.length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }

    if (trimmedText.length > 2000) {
      toast.error('Review text must be 2000 characters or less');
      return;
    }

    // Spam guard: block rapid repeat submissions (10s cooldown)
    const now = Date.now();
    if (now - lastSubmitTime < 10_000) {
      toast.error('Please wait a few seconds before submitting again');
      return;
    }

    setIsSubmitting(true);
    setLastSubmitTime(now);
    
    const { error } = userReview 
      ? await onUpdate(rating, trimmedText)
      : await onSubmit(rating, trimmedText);
    
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error('You have already reviewed this facility');
      } else if (error.message.includes('owner')) {
        toast.error('Facility owners cannot review their own facilities');
      } else if (error.message.includes('verify')) {
        toast.error(error.message);
      } else {
        toast.error(error.message || 'Failed to submit review');
      }
    } else {
      toast.success(userReview ? 'Review updated! It will be visible after moderation.' : 'Review submitted! It will be visible after moderation.');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await onDelete();
    setIsDeleting(false);
    setDeleteConfirmOpen(false);

    if (error) {
      toast.error('Failed to delete review');
    } else {
      toast.success('Review deleted');
      setRating(0);
      setReviewText('');
    }
  };

  if (!isAuthReady) {
    return (
      <ShellCard className="border-dashed">
        <ShellContent className="py-8 text-center">
          <Loader2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
          <h3 className="font-medium text-lg mb-2">Loading Review Access</h3>
          <p className="text-muted-foreground">
            Checking your account so we can show the right review options.
          </p>
        </ShellContent>
      </ShellCard>
    );
  }

  if (!isAuthenticated) {
    return (
      <ShellCard className="border-dashed">
        <ShellContent className="py-8 text-center">
          <Star className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-medium text-lg mb-2">Share Your Experience</h3>
          <p className="text-muted-foreground mb-4">
            Sign in to leave a review for {facilityName}
          </p>
          <Button asChild>
            <Link to="/login">Sign In to Review</Link>
          </Button>
        </ShellContent>
      </ShellCard>
    );
  }

  if (!isEmailVerified) {
    return (
      <ShellCard className="border-yellow-500/20 bg-yellow-500/5">
        <ShellContent className="py-8 text-center">
          <Mail className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-medium text-lg mb-2">Verify Your Email</h3>
          <p className="text-muted-foreground mb-4">
            Please verify your email address before leaving a review. Check your inbox for a verification link.
          </p>
          <Button 
            onClick={handleResendVerification} 
            disabled={isResending}
            variant="outline"
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        </ShellContent>
      </ShellCard>
    );
  }

  if (userReview && userReview.status === 'approved') {
    return (
      <>
        <ShellCard className="border-primary/20 bg-primary/5">
          <ShellContent className="py-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Your Review is Live</h3>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-4 w-4",
                        star <= userReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                {userReview.review_text && (
                  <p className="text-sm text-muted-foreground mt-2">{userReview.review_text}</p>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3 text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Review'}
                </Button>
              </div>
            </div>
          </ShellContent>
        </ShellCard>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Review</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your review? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (userReview && userReview.status === 'pending') {
    return (
      <>
        <ShellCard className="border-yellow-500/20 bg-yellow-500/5">
          <ShellContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium">Review Pending Approval</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your review is being reviewed by our team and will be visible shortly.
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-4 w-4",
                        star <= userReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                {userReview.review_text && (
                  <p className="text-sm text-muted-foreground mt-2">{userReview.review_text}</p>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3 text-destructive hover:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Review'}
                </Button>
              </div>
            </div>
          </ShellContent>
        </ShellCard>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Review</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete your review? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <ShellCard>
      <ShellHeader>
        <CardTitle className="text-lg">Write a Review</CardTitle>
        <CardDescription>
          Share your experience at {facilityName}
        </CardDescription>
      </ShellHeader>
      <ShellContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30 hover:text-yellow-300"
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="review-text" className="block text-sm font-medium mb-2">
              Your Review <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="review-text"
              placeholder="Share details about your experience (minimum 10 characters)..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reviewText.length}/2000 characters
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting || rating === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </form>
      </ShellContent>
    </ShellCard>
  );
}
