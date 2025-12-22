import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Star, Edit2, Trash2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface UserReview {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_slug: string;
  rating: number;
  review_text: string | null;
  status: string;
  created_at: string;
}

export default function SeekerReviews() {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<UserReview | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('facility_reviews')
      .select(`
        id,
        facility_id,
        rating,
        review_text,
        status,
        created_at,
        facilities!inner(name, slug)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setReviews(data.map(review => ({
        id: review.id,
        facility_id: review.facility_id,
        facility_name: (review.facilities as any)?.name || 'Unknown Facility',
        facility_slug: (review.facilities as any)?.slug || '',
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
        description: "Only pending reviews can be edited.",
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
        description: "Could not update your review.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Review updated",
        description: "Your review has been updated."
      });
      fetchReviews();
    }

    setIsSaving(false);
    setEditingReview(null);
  };

  const handleDelete = async (reviewId: string) => {
    const { error } = await supabase
      .from('facility_reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      toast({
        title: "Error deleting",
        description: "Could not delete your review.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Review deleted",
        description: "Your review has been removed."
      });
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    }
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
        return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Published</span>;
      case 'pending':
        return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending Review</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Rejected</span>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-display font-bold mb-6">My Reviews</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold mb-6">
        My Reviews
        {reviews.length > 0 && (
          <span className="text-muted-foreground font-normal text-lg ml-2">
            ({reviews.length})
          </span>
        )}
      </h1>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Reviews Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Share your experience by leaving reviews on treatment centers you've visited.
            </p>
            <Button asChild variant="outline">
              <Link to="/rehab-centers">Browse Facilities</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        to={`/center/${review.facility_slug}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {review.facility_name}
                      </Link>
                      {getStatusBadge(review.status)}
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>

                    {review.review_text && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {review.review_text}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(review.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {review.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(review)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(review.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
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
    </div>
  );
}
