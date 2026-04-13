import { useState, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, Star, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProviderReview } from '@/hooks/useProviderReviews';

const DISPUTE_REASONS = [
  { value: 'fake', label: 'Fake Review', description: 'This review is not from a real patient/client' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Contains offensive or harmful language' },
  { value: 'competitor', label: 'Competitor Review', description: 'Posted by a competitor to harm reputation' },
  { value: 'inaccurate', label: 'Inaccurate Information', description: 'Contains factually incorrect statements' },
  { value: 'other', label: 'Other', description: 'Another reason not listed above' }
];

interface FlagReviewDialogProps {
  review: ProviderReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reviewId: string, reason: string, details?: string) => Promise<{ error: any }>;
}

export const FlagReviewDialog = memo(function FlagReviewDialog({ review, open, onOpenChange, onSubmit }: FlagReviewDialogProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!review || !reason) {
      toast.error('Please select a reason');
      return;
    }

    // Validate reason against whitelist
    const validReasons = DISPUTE_REASONS.map(r => r.value);
    if (!validReasons.includes(reason)) {
      toast.error('Invalid dispute reason');
      return;
    }

    // Sanitize details text
    const sanitizedDetails = details
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim()
      .slice(0, 1000);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(review.id)) {
      toast.error('Invalid review identifier');
      return;
    }

    setIsSubmitting(true);
    const { error } = await onSubmit(review.id, reason, sanitizedDetails || undefined);
    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to submit dispute');
    } else {
      toast.success('Review flagged for admin review');
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setReason('');
    setDetails('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Flag Review for Admin Review
          </DialogTitle>
          <DialogDescription>
            Submit this review for admin review. Please provide a reason and any supporting details.
          </DialogDescription>
        </DialogHeader>

        {review && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {review.reviewer_first_name?.charAt(0) || 'A'}
                  {review.reviewer_last_initial || ''}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{review.user_display_name}</p>
                {(review.reviewer_city || review.reviewer_state) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[review.reviewer_city, review.reviewer_state].filter(Boolean).join(', ')}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-3 w-3",
                        star <= review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-muted text-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            {review.review_text && (
              <p className="text-sm text-muted-foreground line-clamp-3">"{review.review_text}"</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for flagging *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span>{r.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reason && (
              <p className="text-xs text-muted-foreground">
                {DISPUTE_REASONS.find(r => r.value === reason)?.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide any additional context or evidence to support your dispute..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{details.length}/1000</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !reason}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Dispute'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
