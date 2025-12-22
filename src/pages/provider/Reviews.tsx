import { useState } from 'react';
import { useProviderReviews, ProviderReview } from '@/hooks/useProviderReviews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { 
  Star, 
  MessageSquare, 
  Flag, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
  RefreshCw,
  Send,
  Edit2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const DISPUTE_REASONS = [
  { value: 'fake', label: 'Fake Review' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'competitor', label: 'Competitor Review' },
  { value: 'inaccurate', label: 'Inaccurate Information' },
  { value: 'other', label: 'Other' }
];

export default function ProviderReviews() {
  const { reviews, isLoading, stats, submitResponse, updateResponse, deleteResponse, flagReview, refetch } = useProviderReviews();
  const [selectedTab, setSelectedTab] = useState('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Dispute dialog state
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputingReview, setDisputingReview] = useState<ProviderReview | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');

  const filteredReviews = reviews.filter(r => {
    if (selectedTab === 'needs-response') return !r.response;
    if (selectedTab === 'disputed') return r.dispute;
    return true;
  });

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setIsSubmitting(true);
    const { error } = await submitResponse(reviewId, responseText);
    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to submit response');
    } else {
      toast.success('Response submitted');
      setRespondingTo(null);
      setResponseText('');
    }
  };

  const handleUpdateResponse = async (responseId: string) => {
    if (!editText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    setIsSubmitting(true);
    const { error } = await updateResponse(responseId, editText);
    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to update response');
    } else {
      toast.success('Response updated');
      setEditingResponse(null);
      setEditText('');
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return;

    const { error } = await deleteResponse(responseId);

    if (error) {
      toast.error('Failed to delete response');
    } else {
      toast.success('Response deleted');
    }
  };

  const handleFlagReview = async () => {
    if (!disputingReview || !disputeReason) {
      toast.error('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    const { error } = await flagReview(disputingReview.id, disputeReason, disputeDetails);
    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to flag review');
    } else {
      toast.success('Review flagged for admin review');
      setDisputeDialogOpen(false);
      setDisputingReview(null);
      setDisputeReason('');
      setDisputeDetails('');
    }
  };

  const openDisputeDialog = (review: ProviderReview) => {
    setDisputingReview(review);
    setDisputeDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">Manage reviews for your facility</p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageRating || '-'}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.needsResponse}</p>
                <p className="text-sm text-muted-foreground">Needs Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Flag className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.disputed}</p>
                <p className="text-sm text-muted-foreground">Disputed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            All ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="needs-response" className="gap-2">
            <Clock className="h-4 w-4" />
            Needs Response ({stats.needsResponse})
          </TabsTrigger>
          <TabsTrigger value="disputed" className="gap-2">
            <Flag className="h-4 w-4" />
            Disputed ({stats.disputed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No reviews in this category</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6 space-y-4">
                    {/* Review Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{review.user_display_name}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground/30"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.dispute && (
                          <Badge variant={review.dispute.status === 'pending' ? 'destructive' : 'secondary'}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {review.dispute.status === 'pending' ? 'Disputed' : review.dispute.status}
                          </Badge>
                        )}
                        {review.response && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Responded
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Review Text */}
                    {review.review_text && (
                      <p className="text-sm text-foreground/80 leading-relaxed bg-muted/50 p-3 rounded-lg">
                        {review.review_text}
                      </p>
                    )}

                    {/* Existing Response */}
                    {review.response && (
                      <div className="ml-6 border-l-2 border-primary/20 pl-4">
                        <p className="text-xs font-medium text-primary mb-1">Your Response</p>
                        {editingResponse === review.response.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={3}
                              maxLength={500}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateResponse(review.response!.id)}
                                disabled={isSubmitting}
                              >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingResponse(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-foreground/80">{review.response.response_text}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setEditingResponse(review.response!.id);
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
                                onClick={() => handleDeleteResponse(review.response!.id)}
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
                    {!review.response && respondingTo === review.id && (
                      <div className="space-y-2 ml-6 border-l-2 border-primary/20 pl-4">
                        <Textarea
                          placeholder="Write your response..."
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          rows={3}
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{responseText.length}/500</span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRespondingTo(null);
                                setResponseText('');
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSubmitResponse(review.id)}
                              disabled={isSubmitting}
                            >
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

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {!review.response && respondingTo !== review.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRespondingTo(review.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Respond
                        </Button>
                      )}
                      {!review.dispute && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => openDisputeDialog(review)}
                        >
                          <Flag className="h-4 w-4 mr-1" />
                          Flag
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Review for Admin Review</DialogTitle>
            <DialogDescription>
              Please provide a reason for flagging this review. An admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Select value={disputeReason} onValueChange={setDisputeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Details (optional)</label>
              <Textarea
                placeholder="Provide any additional context..."
                value={disputeDetails}
                onChange={(e) => setDisputeDetails(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFlagReview} disabled={isSubmitting || !disputeReason}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
