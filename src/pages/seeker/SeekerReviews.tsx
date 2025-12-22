import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Star, Edit2, Trash2, Clock, MessageSquare, MapPin, Building2, Search } from "lucide-react";
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

interface SeekerOutletContext {
  isAuthenticated: boolean;
  userName?: string;
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
  formatDate
}: { 
  review: UserReview; 
  onEdit: (review: UserReview) => void;
  onDelete: (reviewId: string) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatDate: (dateString: string) => string;
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
                  to={`/center/${review.facility_slug}`}
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
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold">
              <Building2 className="h-3 w-3" />
              {review.facility_type}
            </Badge>
          </div>

          {/* Review Text */}
          {review.review_text && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
              "{review.review_text}"
            </p>
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
  const context = useOutletContext<SeekerOutletContext>();
  const isAuthenticated = context?.isAuthenticated ?? false;
  
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchReviews();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchReviews = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('facility_reviews')
      .select(`
        id,
        facility_id,
        rating,
        review_text,
        status,
        created_at,
        facilities!inner(name, slug, city, state, facility_type, logo_url)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error loading reviews",
        description: "Could not load your reviews. Please try again.",
        variant: "destructive"
      });
    } else if (data) {
      setReviews(data.map(review => ({
        id: review.id,
        facility_id: review.facility_id,
        facility_name: (review.facilities as any)?.name || 'Unknown Facility',
        facility_slug: (review.facilities as any)?.slug || '',
        facility_city: (review.facilities as any)?.city || '',
        facility_state: (review.facilities as any)?.state || '',
        facility_type: (review.facilities as any)?.facility_type || '',
        facility_logo_url: (review.facilities as any)?.logo_url || null,
        rating: review.rating,
        review_text: review.review_text,
        status: review.status,
        created_at: review.created_at
      })));
    }

    setIsLoading(false);
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
    if (!editingReview) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('facility_reviews')
      .update({
        rating: editRating,
        review_text: editText || null,
      })
      .eq('id', editingReview.id);

    if (error) {
      toast({
        title: "Error saving",
        description: "Could not update your review. Please try again.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Review updated",
        description: "Your review has been updated successfully."
      });
      fetchReviews();
    }

    setIsSaving(false);
    setEditingReview(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteReviewId) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('facility_reviews')
      .delete()
      .eq('id', deleteReviewId);

    if (error) {
      toast({
        title: "Error deleting",
        description: "Could not delete your review. Please try again.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Review deleted",
        description: "Your review has been removed successfully."
      });
      setReviews(prev => prev.filter(r => r.id !== deleteReviewId));
    }

    setIsDeleting(false);
    setDeleteReviewId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <Star className="h-5 w-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-display font-bold">My Reviews</h1>
        </div>
        {reviews.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {reviews.length === 0 ? (
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
              <Link to="/search" className="gap-2">
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
  );
}