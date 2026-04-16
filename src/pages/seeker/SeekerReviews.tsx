import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import facilityPlaceholder from "@/assets/facility-placeholder.webp";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Star, Edit2, Trash2, Clock, MessageSquare, MapPin, Building2, Search, Reply, ThumbsUp, AlertTriangle, RefreshCw, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSeekerSession } from "@/hooks/useSeekerSession";
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
  helpful_count: number;
  admin_notes: string | null;
  response?: ReviewResponse | null;
}

type StatusFilter = "all" | "approved" | "pending" | "rejected";

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

function ReviewCard({ 
  review, 
  onEdit, 
  onDelete,
}: { 
  review: UserReview; 
  onEdit: (review: UserReview) => void;
  onDelete: (reviewId: string) => void;
}) {
  const [logoError, setLogoError] = useState(false);
  const hasLogo = review.facility_logo_url && !logoError;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success border-0 text-xs">Published</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning border-0 text-xs">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Rejected</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatRelativeDate = (dateString: string) =>
    formatDistanceToNow(new Date(dateString), { addSuffix: true });

  const canEdit = review.status === 'pending';
  const facilityLink = review.facility_slug ? `/center/${review.facility_slug}` : `/center/${review.facility_id}`;

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300">
      <div className="flex flex-col sm:flex-row">
        {/* Facility Logo */}
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
              <img 
                src={facilityPlaceholder}
                alt={`${review.facility_name} facility`}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
              />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Link 
                  to={facilityLink}
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
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(review)} className="h-8 w-8" title="Edit review">
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
                  className={`h-4 w-4 ${star <= review.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            {review.facility_type && (
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-semibold">
                <Building2 className="h-3 w-3" />
                {review.facility_type}
              </Badge>
            )}
            {review.helpful_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ThumbsUp className="h-3 w-3" />
                {review.helpful_count} found helpful
              </span>
            )}
          </div>

          {/* Review Text */}
          {review.review_text && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">
              "{review.review_text}"
            </p>
          )}

          {/* Rejection reason */}
          {review.status === 'rejected' && review.admin_notes && (
            <div className="mt-1 mb-3 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs font-medium text-destructive">Reason for rejection</span>
              </div>
              <p className="text-sm text-foreground/80">{review.admin_notes}</p>
            </div>
          )}

          {/* Facility Response */}
          {review.response && review.status === 'approved' && (
            <div className="mt-1 mb-3 border-l-2 border-primary/20 pl-3 bg-muted/30 rounded-r-lg py-2 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <Reply className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Response from Facility</span>
                <span className="text-xs text-muted-foreground">{formatRelativeDate(review.response.created_at)}</span>
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
  const { userId, isAuthenticated, isReady } = useSeekerSession();
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { toast } = useToast();

  const fetchReviews = useCallback(async (uid: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('facility_reviews')
        .select('id, facility_id, rating, review_text, status, created_at, helpful_count, admin_notes')
        .eq('user_id', uid)
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

      const facilityIds = [...new Set(reviewsData.map(r => r.facility_id))];
      const reviewIds = reviewsData.map(r => r.id);

      const [facilitiesResult, responsesResult] = await Promise.all([
        supabase.from('facilities').select('id, name, slug, city, state, facility_type, logo_url').in('id', facilityIds),
        supabase.from('review_responses').select('id, review_id, response_text, created_at').in('review_id', reviewIds).eq('status', 'active'),
      ]);

      const facilityMap = new Map((facilitiesResult.data || []).map(f => [f.id, f]));
      const responseMap = new Map((responsesResult.data || []).map(r => [r.review_id, r]));

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
          helpful_count: review.helpful_count ?? 0,
          admin_notes: review.admin_notes ?? null,
          response: response ? { id: response.id, response_text: response.response_text, created_at: response.created_at } : null,
        };
      });

      setReviews(mappedReviews);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (userId) {
      fetchReviews(userId);
    } else {
      setIsLoading(false);
    }
  }, [isReady, userId, fetchReviews]);

  const handleEdit = (review: UserReview) => {
    if (review.status !== 'pending') {
      toast({ title: "Cannot edit", description: "Only pending reviews can be edited.", variant: "destructive" });
      return;
    }
    setEditingReview(review);
    setEditRating(review.rating);
    setEditText(review.review_text || "");
  };

  const lastReviewSaveRef = useRef<number>(0);

  const handleSaveEdit = async () => {
    if (!editingReview || isSaving) return;
    const now = Date.now();
    if (now - lastReviewSaveRef.current < 5000) {
      toast({ title: "Please wait", description: "You're saving too frequently.", variant: "destructive" });
      return;
    }
    lastReviewSaveRef.current = now;

    if (editRating < 1 || editRating > 5) {
      toast({ title: "Invalid rating", description: "Rating must be between 1 and 5.", variant: "destructive" });
      return;
    }

    const sanitizedText = editText.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim().slice(0, 2000);

    setIsSaving(true);
    try {
      if (!userId) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('facility_reviews')
        .update({ rating: editRating, review_text: sanitizedText || null })
        .eq('id', editingReview.id)
        .eq('user_id', userId);

      if (error) {
        toast({ title: "Error saving", description: "Could not update your review. Please try again.", variant: "destructive" });
      } else {
        toast({ title: "Review updated", description: "Your review has been updated successfully." });
        fetchReviews(userId);
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
      if (!userId) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from('facility_reviews')
        .delete()
        .eq('id', deleteReviewId)
        .eq('user_id', userId);

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

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    if (statusFilter === "all") return reviews;
    return reviews.filter(r => r.status === statusFilter);
  }, [reviews, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (reviews.length === 0) return null;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const published = reviews.filter(r => r.status === "approved").length;
    const pending = reviews.filter(r => r.status === "pending").length;
    const rejected = reviews.filter(r => r.status === "rejected").length;
    return { avgRating, published, pending, rejected };
  }, [reviews]);

  if (isReady && !isAuthenticated) {
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
          <div className="p-2 rounded-lg bg-warning/10">
            <Star className="h-5 w-5 text-warning" />
          </div>
          <h1 className="text-2xl font-display font-bold">My Reviews</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <ReviewCardSkeleton key={i} />)}
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
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-display font-bold">My Reviews</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {reviews.length > 0 ? `${reviews.length} review${reviews.length !== 1 ? 's' : ''}` : 'Manage your reviews'}
              </p>
            </div>
          </div>
          {userId && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchReviews(userId)} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5 mb-4">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
              {userId && (
                <Button variant="outline" size="sm" onClick={() => fetchReviews(userId)}>
                  Retry
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats summary */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="text-lg font-bold">{stats.avgRating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-success">{stats.published}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-warning">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-destructive">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </CardContent>
            </Card>
          </div>
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
        ) : reviews.length > 0 && (
          <div className="space-y-4">
            {/* Filter tabs */}
            {reviews.length > 1 && (
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList className="grid w-full grid-cols-4 h-9">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                  <TabsTrigger value="approved" className="text-xs sm:text-sm">Published</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
                  <TabsTrigger value="rejected" className="text-xs sm:text-sm">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {filteredReviews.length === 0 ? (
              <div className="text-center py-8">
                <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No {statusFilter} reviews
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteReviewId(id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
              <DialogDescription>Update your review for {editingReview?.facility_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="mb-2 block">Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setEditRating(star)} className="p-1">
                      <Star className={`h-6 w-6 transition-colors ${star <= editRating ? "fill-warning text-warning" : "text-muted-foreground hover:text-warning"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="review-text" className="mb-2 block">Your Review (optional)</Label>
                <Textarea
                  id="review-text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value.slice(0, 2000))}
                  placeholder="Share your experience..."
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">{editText.length}/2000</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingReview(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteReviewId} onOpenChange={() => setDeleteReviewId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Review?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. Your review will be permanently removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? "Deleting..." : "Delete Review"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
