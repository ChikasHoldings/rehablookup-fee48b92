import { useState } from 'react';
import { useProviderReviews, ProviderReview } from '@/hooks/useProviderReviews';
import { useSelectedFacility } from '@/contexts/SelectedFacilityContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  MessageSquare, 
  Clock, 
  Flag, 
  Loader2,
  RefreshCw,
  Inbox,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReviewStatsCards } from '@/components/provider/reviews/ReviewStatsCards';
import { ProviderReviewCard } from '@/components/provider/reviews/ProviderReviewCard';
import { FlagReviewDialog } from '@/components/provider/reviews/FlagReviewDialog';

export default function ProviderReviews() {
  const { selectedFacility } = useSelectedFacility();
  const { 
    reviews, 
    isLoading, 
    stats, 
    submitResponse, 
    updateResponse, 
    deleteResponse, 
    flagReview, 
    refetch 
  } = useProviderReviews();
  
  const [selectedTab, setSelectedTab] = useState('all');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [selectedReviewForDispute, setSelectedReviewForDispute] = useState<ProviderReview | null>(null);

  const filteredReviews = reviews.filter(r => {
    if (selectedTab === 'needs-response') return !r.response;
    if (selectedTab === 'disputed') return r.dispute;
    return true;
  });

  const handleFlagReview = (review: ProviderReview) => {
    setSelectedReviewForDispute(review);
    setDisputeDialogOpen(true);
  };

  const handleSubmitDispute = async (reviewId: string, reason: string, details?: string) => {
    return flagReview(reviewId, reason, details);
  };

  if (!selectedFacility) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Facility Selected</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Please select a facility from the dropdown to view and manage reviews.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Manage and respond to reviews for {selectedFacility.name}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refetch} 
          disabled={isLoading}
          className="shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <ReviewStatsCards stats={stats} />

      {/* Reviews Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="all" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">All Reviews</span>
            <span className="sm:hidden">All</span>
            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
              {reviews.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="needs-response" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Needs Response</span>
            <span className="sm:hidden">Pending</span>
            {stats.needsResponse > 0 && (
              <span className="ml-1 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                {stats.needsResponse}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="disputed" className="gap-2">
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">Disputed</span>
            <span className="sm:hidden">Flagged</span>
            {stats.disputed > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {stats.disputed}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {selectedTab === 'needs-response' ? (
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  ) : selectedTab === 'disputed' ? (
                    <Flag className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {selectedTab === 'needs-response' 
                    ? 'All caught up!' 
                    : selectedTab === 'disputed' 
                    ? 'No disputed reviews'
                    : 'No reviews yet'}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {selectedTab === 'needs-response'
                    ? "You've responded to all reviews. Great job staying engaged with your clients!"
                    : selectedTab === 'disputed'
                    ? "You haven't flagged any reviews for admin review."
                    : "When clients leave reviews for your facility, they'll appear here."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ProviderReviewCard
                  key={review.id}
                  review={review}
                  onSubmitResponse={submitResponse}
                  onUpdateResponse={updateResponse}
                  onDeleteResponse={deleteResponse}
                  onFlagReview={handleFlagReview}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Flag Review Dialog */}
      <FlagReviewDialog
        review={selectedReviewForDispute}
        open={disputeDialogOpen}
        onOpenChange={setDisputeDialogOpen}
        onSubmit={handleSubmitDispute}
      />
    </div>
  );
}
