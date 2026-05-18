import { useState, useMemo, useEffect } from 'react';
import { useProviderReviews, ProviderReview } from '@/hooks/useProviderReviews';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Clock,
  Flag,
  Loader2,
  RefreshCw,
  Inbox,
  Building2,
  Star,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { ReviewStatsCards } from '@/components/provider/reviews/ReviewStatsCards';
import { ProviderReviewCard } from '@/components/provider/reviews/ProviderReviewCard';
import { FlagReviewDialog } from '@/components/provider/reviews/FlagReviewDialog';
import { PaginationFooter } from '@/components/common/PaginationFooter';
import { usePagination } from '@/hooks/usePagination';

type SortKey =
  | 'newest'
  | 'oldest'
  | 'rating_desc'
  | 'rating_asc'
  | 'helpful_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'rating_asc', label: 'Lowest rated' },
  { value: 'helpful_desc', label: 'Most helpful' },
];

export default function ProviderReviews() {
  const {
    reviews,
    facilities,
    isLoading,
    isError,
    submitResponse,
    updateResponse,
    deleteResponse,
    flagReview,
    refetch,
  } = useProviderReviews();

  const [selectedTab, setSelectedTab] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [selectedReviewForDispute, setSelectedReviewForDispute] = useState<ProviderReview | null>(null);

  const filteredReviews = useMemo(() => {
    const list = reviews.filter(r => {
      if (facilityFilter !== "all" && r.facility_id !== facilityFilter) return false;
      if (selectedTab === 'needs-response') return !r.response;
      if (selectedTab === 'disputed') return !!r.dispute;
      return true;
    });
    const sorted = [...list];
    switch (sortKey) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'rating_desc':
        sorted.sort((a, b) => b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'rating_asc':
        sorted.sort((a, b) => a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'helpful_desc':
        sorted.sort((a, b) => (b.helpful_count ?? 0) - (a.helpful_count ?? 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return sorted;
  }, [reviews, selectedTab, facilityFilter, sortKey]);

  const reviewsPagination = usePagination({
    tableId: "provider-reviews",
    defaultPageSize: 25,
    totalItems: filteredReviews.length,
  });
  const visibleReviews = reviewsPagination.paginate(filteredReviews);

  // Reset to page 1 on tab/facility/sort change.
  useEffect(() => {
    reviewsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, facilityFilter, sortKey]);

  // Stats + rating distribution. Filtered by facility so the cards reflect
  // what's visible in the list. The disputed predicate matches the page +
  // hook + Disputed tab.
  const { filteredStats, ratingDistribution, scopedTotal } = useMemo(() => {
    const filtered = facilityFilter === "all" ? reviews : reviews.filter(r => r.facility_id === facilityFilter);
    const totalReviews = filtered.length;
    const averageRating = totalReviews > 0
      ? Math.round((filtered.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : null;
    const needsResponse = filtered.filter(r => !r.response).length;
    const disputed = filtered.filter(r => !!r.dispute).length;
    const dist = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: filtered.filter(r => r.rating === star).length,
    }));
    return {
      filteredStats: { totalReviews, averageRating, needsResponse, disputed },
      ratingDistribution: dist,
      scopedTotal: totalReviews,
    };
  }, [reviews, facilityFilter]);

  const handleFlagReview = (review: ProviderReview) => {
    setSelectedReviewForDispute(review);
    setDisputeDialogOpen(true);
  };

  const handleSubmitDispute = async (reviewId: string, reason: string, details?: string) => {
    return flagReview(reviewId, reason, details);
  };

  // BUGFIX: Show error state when reviews fetch fails instead of silent empty state
  if (isError && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Flag className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Failed to Load Reviews</h2>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          There was a problem loading your reviews. Please try again.
        </p>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }
  if (facilities.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Facilities Found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You need to have at least one facility to view reviews.
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground mt-1">
            {facilities.length > 1 
              ? `Manage reviews across ${facilities.length} locations`
              : facilities[0]?.name ? `Manage reviews for ${facilities[0].name}` : 'Manage your reviews'
            }
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap">
          {/* Sort */}
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[170px]" aria-label="Sort reviews">
              <ArrowUpDown className="h-4 w-4 mr-2" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Facility Filter */}
          {facilities.length > 1 && (
            <div className="flex items-center gap-1">
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger
                  aria-label="Filter by facility"
                  className={cn("w-[180px]", facilityFilter !== "all" && "border-primary text-primary")}
                >
                  <Building2 className="h-4 w-4 mr-2" aria-hidden />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">All Locations</SelectItem>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="truncate">{f.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {facilityFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFacilityFilter("all")}
                  aria-label="Clear facility filter"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          <Button
            variant="outline"
            onClick={refetch}
            disabled={isLoading}
            className="shrink-0"
            aria-label="Refresh reviews"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <ReviewStatsCards stats={filteredStats} />

      {/* Rating Distribution */}
      {scopedTotal > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Rating distribution</h2>
              <span className="text-xs text-muted-foreground">
                {scopedTotal} review{scopedTotal === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="space-y-1.5" aria-label="Rating distribution by star count">
              {ratingDistribution.map(({ star, count }) => {
                const pct = scopedTotal > 0 ? Math.round((count / scopedTotal) * 100) : 0;
                return (
                  <li key={star} className="flex items-center gap-3 text-xs sm:text-sm">
                    <span className="flex items-center gap-1 w-10 shrink-0 text-muted-foreground">
                      {star}
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full bg-muted overflow-hidden"
                      role="progressbar"
                      aria-label={`${star}-star reviews`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          star >= 4 ? 'bg-emerald-500' : star === 3 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-muted-foreground tabular-nums">
                      {count} <span className="opacity-70">({pct}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Reviews Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="all" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" aria-hidden />
              <span>All</span>
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{scopedTotal}</span>
            </TabsTrigger>
            <TabsTrigger value="needs-response" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Needs Response</span>
              <span className="sm:hidden">Pending</span>
              {filteredStats.needsResponse > 0 && (
                <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded text-xs">
                  {filteredStats.needsResponse}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputed" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
              <Flag className="h-4 w-4" />
              <span>Disputed</span>
              {filteredStats.disputed > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs">
                  {filteredStats.disputed}
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
              {visibleReviews.map((review) => (
                <ProviderReviewCard
                  key={review.id}
                  review={review}
                  showFacility={facilities.length > 1}
                  onSubmitResponse={submitResponse}
                  onUpdateResponse={updateResponse}
                  onDeleteResponse={deleteResponse}
                  onFlagReview={handleFlagReview}
                />
              ))}
              <PaginationFooter
                page={reviewsPagination.page}
                pageSize={reviewsPagination.pageSize}
                totalPages={reviewsPagination.totalPages}
                totalItems={filteredReviews.length}
                onPageChange={reviewsPagination.setPage}
                onPageSizeChange={reviewsPagination.setPageSize}
                itemLabel="review"
              />
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
    </div>
  );
}
