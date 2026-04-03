import { useState, useEffect } from "react";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Star, Edit2, Trash2, Clock, MessageSquare, MapPin, Building2, Search, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
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

interface ReviewResponse {
  id: string;
  response_text: string;
  created_at: string;
}

interface UserReview {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_slug: string;
  facility_city: string;
  facility_state: string;
  facility_type: string;
  facility_logo_url: string | null;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
  response?: ReviewResponse | null;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function ReviewCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="h-[100px] sm:h-[140px] sm:w-40 bg-muted animate-pulse" />
        <div className="p-4 flex-1 space-y-3">
          <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Separate component for review card to properly use useState
function ReviewCard({ 
  review, 
  onEdit, 
  onDelete,
  getStatusBadge,
  formatDate,
  formatRelativeDate
}: { 
  review: UserReview; 
  onEdit: (review: UserReview) => void;
  onDelete: (reviewId: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatDate: (dateString: string) => string;
  formatRelativeDate: (dateString: string) => string;
}) {
  const [logoError, setLogoError] = useState(false);
  const initials = getInitials(review.facility_name);
  const hasLogo = review.facility_logo_url && !logoError;

  return (
    <article 
      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Facility Logo Section */}
        <div className="relative sm:w-40 shrink-0 overflow-hidden bg-muted">
          <div className="h-[100px] sm:h-full w-full">
            {hasLogo ? (
              <img 
                src={review.facility_logo_url!}
                alt={`${review.facility_name} logo`}
                className="absolute inset-0 h-full w-full object-contain object-center p-4 bg-white"
                loading="lazy"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shadow-sm">
                    <span className="font-display text-xl font-bold text-primary">
                      {initials}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Link 
                  to={`/account/facility/${review.facility_slug || review.facility_id}`}
                  className="font-display text-base font-bold leading-tight hover:text-primary transition-colors"
                >
                  {review.facility_name}
                </Link>
                {getStatusBadge(review.status)}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium">{review.facility_city}, {review.facility_state}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {review.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(review)}
                  className="h-8 w-8"
                  title="Edit review"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(review.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete review"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Rating & Type */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            {review.facility_type && (
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold">
                <Building2 className="h-3 w-3" />
                {review.facility_type}
              </Badge>
            )}
          </div>

          {/* Review Text */}
          {review.review_text && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
              "{review.review_text}"
            </p>
          )}

          {/* Facility Response */}
          {review.response && review.status === 'approved' && (
            <div className="mt-2 mb-3 border-l-2 border-primary/20 pl-3 bg-muted/30 rounded-r-lg py-2 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <Reply className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Response from Facility</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(review.response.created_at)}
                </span>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-2">{review.response.response_text}</p>
            </div>
          )}

          {/* Date */}
          <div className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Reviewed on {formatDate(review.created_at)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SeekerReviews() {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session) {
        await fetchReviews(session.user.id);
      } else {
        setIsLoading(false);
      }
    };
    
    checkAuthAndFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsAuthenticated(!!session);
        if (session) {
          await fetchReviews(session.user.id);
        } else {
          setReviews([]);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchReviews = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('facility_reviews')
        .select('id, facility_id, rating, review_text, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
        setError('Could not load your reviews');
        setIsLoading(false);
        return;
      }

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setIsLoading(false);
        return;
      }

      // Fetch facility details for the reviews
      const facilityIds = [...new Set(reviewsData.map(r => r.facility_id))];
      const reviewIds = reviewsData.map(r => r.id);

      // Fetch facilities and responses in parallel
      const [facilitiesResult, responsesResult] = await Promise.all([
        supabase
          .from('facilities')
          .select('id, name, slug, city, state, facility_type, logo_url')
          .in('id', facilityIds),
        supabase
          .from('review_responses')
          .select('id, review_id, response_text, created_at')
          .in('review_id', reviewIds)
          .eq('status', 'active')
      ]);

      if (facilitiesResult.error) {
        console.error('Error fetching facilities:', facilitiesResult.error);
      }

      // Create maps for quick lookup
      const facilityMap = new Map(
        (facilitiesResult.data || []).map(f => [f.id, f])
      );
      const responseMap = new Map(
        (responsesResult.data || []).map(r => [r.review_id, r])
      );

      // Map reviews with facility data and responses
      const mappedReviews: UserReview[] = reviewsData.map(review => {
        const facility = facilityMap.get(review.facility_id);
        const response = responseMap.get(review.id);
        return {
          id: review.id,
          facility_id: review.facility_id,
          facility_name: facility?.name || 'Unknown Facility',
          facility_slug: facility?.slug || '',
          facility_city: facility?.city || '',
          facility_state: facility?.state || '',
          facility_type: facility?.facility_type || '',
          facility_logo_url: facility?.logo_url || null,
          rating: review.rating,
          review_text: review.review_text,
          status: review.status,
          created_at: review.created_at,
          response: response ? {
            id: response.id,
            response_text: response.response_text,
            created_at: response.created_at
          } : null
        };
      });

      setReviews(mappedReviews);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (review: UserReview) => {
    if (review.status !== 'pending') {
      toast({
        title: "Cannot edit",
        description: "Only pending reviews can be edited. Published reviews cannot be modified.",
        variant: "destructive"
      });
      return;
    }
    setEditingReview(review);
    setEditRating(review.rating);
    setEditText(review.review_text || "");
  };

  const handleSaveEdit = async () => {
    if (!editingReview || isSaving) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('facility_reviews')
        .update({
          rating: editRating,
          review_text: editText || null,
        })
        .eq('id', editingReview.id)
        .eq('user_id', session.user.id);

      if (error) {
        toast({ title: "Error saving", description: "Could not update your review. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Review updated", description: "Your review has been updated successfully." });
        fetchReviews(session.user.id);
      }
    } finally {
      setIsSaving(false);
      setEditingReview(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteReviewId || isDeleting) return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('facility_reviews')
        .delete()
        .eq('id', deleteReviewId)
        .eq('user_id', session.user.id);

      if (error) {
        toast({ title: "Error deleting", description: "Could not delete your review. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Review deleted", description: "Your review has been removed successfully." });
        setReviews(prev => prev.filter(r => r.id !== deleteReviewId));
      }
    } finally {
      setIsDeleting(false);
      setDeleteReviewId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Published</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">Rejected</Badge>;
      default:
        return null;
    }
  };

  // Show auth prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthPrompt 
        title="Sign in to view your reviews"
        description="Create a free account to leave and manage reviews for treatment centers."
        icon="star"
        returnTo="/account/reviews"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-amber-100">
            <Star className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-display font-bold">My Reviews</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Reviews | RehabLookup</title>
        <meta name="description" content="View and manage your treatment center reviews. Edit pending reviews, see approval status, and read facility responses." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <h1 className="text-lg sm:text-2xl font-display font-bold">My Reviews</h1>
          </div>
          {reviews.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 mb-4">
          <CardContent className="p-4 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {reviews.length === 0 && !error ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No Reviews Yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Share your experience by leaving reviews on treatment centers you've visited.
            </p>
            <Button asChild>
              <Link to="/account/search" className="gap-2">
                <Search className="h-4 w-4" />
                Find Treatment Centers
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteReviewId(id)}
              getStatusBadge={getStatusBadge}
              formatDate={formatDate}
              formatRelativeDate={formatRelativeDate}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>
              Update your review for {editingReview?.facility_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        star <= editRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground hover:text-amber-400"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="review-text" className="mb-2 block">
                Your Review (optional)
              </Label>
              <Textarea
                id="review-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReview(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteReviewId} onOpenChange={() => setDeleteReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your review will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}