import { useState, useCallback, memo, forwardRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  MessageSquare,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  Edit2,
  Trash2,
  Building2
} from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';
import { ProviderReview } from '@/hooks/useProviderReviews';

// formatDistanceToNow throws on Invalid Date; guard it so a malformed
// timestamp from the DB never blows up the whole card.
function formatReviewDate(iso: string | null | undefined): string {
  if (!iso) return 'recently';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'recently';
  return formatDistanceToNow(date, { addSuffix: true });
}

interface ProviderReviewCardProps {
  review: ProviderReview;
  showFacility?: boolean;
  onSubmitResponse: (reviewId: string, text: string) => Promise<{ error: { message: string } | null }>;
  onUpdateResponse: (responseId: string, text: string) => Promise<{ error: { message: string } | null }>;
  onDeleteResponse: (responseId: string) => Promise<{ error: { message: string } | null }>;
  onFlagReview: (review: ProviderReview) => void;
}

// Using forwardRef to properly handle refs from parent components (e.g., Radix Tabs)
export const ProviderReviewCard = memo(forwardRef<HTMLDivElement, ProviderReviewCardProps>(function ProviderReviewCard({ 
  review,
  showFacility,
  onSubmitResponse, 
  onUpdateResponse, 
  onDeleteResponse,
  onFlagReview 
}, ref) {
  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await onSubmitResponse(review.id, responseText);
      if (error) {
        console.error('[ProviderReviewCard] Submit error:', error);
        toast.error(error.message || 'Failed to submit response');
      } else {
        toast.success('Response submitted');
        setIsResponding(false);
        setResponseText('');
      }
    } catch (err) {
      console.error('[ProviderReviewCard] Unexpected error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [responseText, review.id, onSubmitResponse]);

  const handleUpdate = useCallback(async () => {
    if (!editText.trim() || !review.response) return;
    setIsSubmitting(true);
    try {
      const { error } = await onUpdateResponse(review.response.id, editText);
      if (error) {
        console.error('[ProviderReviewCard] Update error:', error);
        toast.error(error.message || 'Failed to update response');
      } else {
        toast.success('Response updated');
        setIsEditing(false);
        setEditText('');
      }
    } catch (err) {
      console.error('[ProviderReviewCard] Unexpected update error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [editText, review.response, onUpdateResponse]);

  const handleDelete = useCallback(async () => {
    if (!review.response || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await onDeleteResponse(review.response.id);
      if (error) {
        toast.error('Failed to delete response');
      } else {
        toast.success('Response deleted');
      }
      setDeleteConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [review.response, onDeleteResponse, isSubmitting]);

  const startEditing = useCallback(() => {
    if (review.response) {
      setIsEditing(true);
      setEditText(review.response.response_text);
    }
  }, [review.response]);

  return (
    <>
      <Card ref={ref} className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {review.reviewer_first_name?.charAt(0) || 'A'}
                    {review.reviewer_last_initial || ''}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{review.user_display_name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <div
                      className="flex items-center"
                      role="img"
                      aria-label={`Rated ${review.rating} out of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3 w-3",
                            star <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          )}
                          aria-hidden
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatReviewDate(review.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Facility Badge */}
                {showFacility && review.facility_name && (
                  <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5 text-primary font-medium">
                    <Building2 className="h-3 w-3 mr-1" />
                    {review.facility_name.length > 15 ? review.facility_name.slice(0, 15) + "..." : review.facility_name}
                  </Badge>
                )}
                {review.dispute && (
                  <Badge 
                    variant={review.dispute.status === 'pending' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {review.dispute.status === 'pending' ? 'Disputed' : review.dispute.status}
                  </Badge>
                )}
                {review.response && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Responded
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {review.review_text ? (
              <p className="text-sm text-foreground/90 leading-relaxed">"{review.review_text}"</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No written review</p>
            )}

            {/* Existing Response */}
            {review.response && (
              <div className="ml-3 pl-3 border-l-2 border-primary/30 bg-muted/50 rounded-r-lg p-3">
                <p className="text-xs font-medium text-primary mb-2">Your Response</p>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="bg-background text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{editText.length}/500</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleUpdate} disabled={isSubmitting || !editText.trim()}>
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground/80">{review.response.response_text}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={startEditing}>
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Response Form */}
            {!review.response && isResponding && (
              <div className="ml-3 pl-3 border-l-2 border-primary/30 space-y-2">
                <Textarea
                  placeholder="Write a professional response..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{responseText.length}/500</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsResponding(false);
                        setResponseText('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !responseText.trim()}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-1" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border/50 flex items-center gap-2 flex-wrap">
            {!review.response && !isResponding && (
              <Button size="sm" onClick={() => setIsResponding(true)}>
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Respond
              </Button>
            )}
            {!review.dispute && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onFlagReview(review)}
              >
                <Flag className="h-4 w-4 mr-1.5" />
                Flag
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Response Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Response</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this response? This action cannot be undone.
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
}));
