import { useState } from 'react';
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
  User,
  Send,
  Edit2,
  Trash2,
  ThumbsUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ProviderReview } from '@/hooks/useProviderReviews';

interface ProviderReviewCardProps {
  review: ProviderReview;
  onSubmitResponse: (reviewId: string, text: string) => Promise<{ error: any }>;
  onUpdateResponse: (responseId: string, text: string) => Promise<{ error: any }>;
  onDeleteResponse: (responseId: string) => Promise<{ error: any }>;
  onFlagReview: (review: ProviderReview) => void;
}

export function ProviderReviewCard({ 
  review, 
  onSubmitResponse, 
  onUpdateResponse, 
  onDeleteResponse,
  onFlagReview 
}: ProviderReviewCardProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const handleSubmit = async () => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }
    setIsSubmitting(true);
    const { error } = await onSubmitResponse(review.id, responseText);
    setIsSubmitting(false);
    if (error) {
      toast.error('Failed to submit response');
    } else {
      toast.success('Response submitted successfully');
      setIsResponding(false);
      setResponseText('');
    }
  };

  const handleUpdate = async () => {
    if (!editText.trim() || !review.response) return;
    setIsSubmitting(true);
    const { error } = await onUpdateResponse(review.response.id, editText);
    setIsSubmitting(false);
    if (error) {
      toast.error('Failed to update response');
    } else {
      toast.success('Response updated');
      setIsEditing(false);
      setEditText('');
    }
  };

  const handleDelete = async () => {
    if (!review.response || !confirm('Are you sure you want to delete this response?')) return;
    const { error } = await onDeleteResponse(review.response.id);
    if (error) {
      toast.error('Failed to delete response');
    } else {
      toast.success('Response deleted');
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Review Header */}
        <div className="p-5 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                <User className="h-5 w-5 text-primary/70" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{review.user_display_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3.5 w-3.5",
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {review.dispute && (
                <Badge 
                  variant={review.dispute.status === 'pending' ? 'destructive' : 'secondary'}
                  className="gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {review.dispute.status === 'pending' ? 'Under Review' : 
                   review.dispute.status === 'upheld' ? 'Upheld' : 'Dismissed'}
                </Badge>
              )}
              {review.response && (
                <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  Responded
                </Badge>
              )}
              {review.helpful_count > 0 && (
                <Badge variant="outline" className="gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {review.helpful_count}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Review Content */}
        <div className="p-5 space-y-4">
          {review.review_text ? (
            <p className="text-sm text-foreground/85 leading-relaxed">
              "{review.review_text}"
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No written review</p>
          )}

          {/* Existing Response */}
          {review.response && (
            <div className="ml-4 pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Your Response</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(review.response.created_at), { addSuffix: true })}
                </span>
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="bg-background"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{editText.length}/500</span>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground/80">{review.response.response_text}</p>
                  <div className="flex items-center gap-1 mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsEditing(true);
                        setEditText(review.response!.response_text);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={handleDelete}
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
            <div className="ml-4 pl-4 border-l-2 border-primary/30 space-y-3">
              <Textarea
                placeholder="Write a professional response to this review..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={3}
                maxLength={500}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{responseText.length}/500 characters</span>
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
                  <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Submit Response
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3 bg-muted/30 border-t border-border/50 flex items-center gap-2">
          {!review.response && !isResponding && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setIsResponding(true)}
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Write Response
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
              Flag Review
            </Button>
          )}
          {review.dispute?.status === 'pending' && (
            <span className="text-xs text-muted-foreground ml-auto">
              Dispute submitted — awaiting admin review
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
