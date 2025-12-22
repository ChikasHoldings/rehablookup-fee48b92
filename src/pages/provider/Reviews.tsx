import { useState, useMemo } from 'react';
import { useProviderReviews, ProviderReview } from '@/hooks/useProviderReviews';
import { useSelectedFacility } from '@/contexts/SelectedFacilityContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
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

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (selectedTab === 'needs-response') return !r.response;
      if (selectedTab === 'disputed') return r.dispute;
      return true;
    });
  }, [reviews, selectedTab]);

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
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground mt-1 truncate">
            Manage reviews for {selectedFacility.name}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={refetch} 
          disabled={isLoading}
          className="shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <ReviewStatsCards stats={stats} />

      {/* Reviews Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="all" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span>All</span>
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {reviews.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="needs-response" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Needs Response</span>
              <span className="sm:hidden">Pending</span>
              {stats.needsResponse > 0 && (
                <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-xs">
                  {stats.needsResponse}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputed" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
              <Flag className="h-4 w-4" />
              <span>Disputed</span>
              {stats.disputed > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs">
                  {stats.disputed}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={selectedTab} className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  {selectedTab === 'needs-response' ? (
                    <Clock className="h-7 w-7 text-muted-foreground" />
                  ) : selectedTab === 'disputed' ? (
                    <Flag className="h-7 w-7 text-muted-foreground" />
                  ) : (
                    <Inbox className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {selectedTab === 'needs-response' 
                    ? 'All caught up!' 
                    : selectedTab === 'disputed' 
                    ? 'No disputed reviews'
                    : 'No reviews yet'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {selectedTab === 'needs-response'
                    ? "You've responded to all reviews."
                    : selectedTab === 'disputed'
                    ? "No reviews have been flagged."
                    : "Reviews will appear here when clients leave them."}
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
