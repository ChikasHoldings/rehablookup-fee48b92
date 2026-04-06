import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProviderReviews, ProviderReview } from '@/hooks/useProviderReviews';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Mail,
  Star,
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useReviewRequests } from '@/hooks/useReviewRequests';
import { useGoogleReviews } from '@/hooks/useGoogleReviews';
import { useProStatus } from '@/hooks/useProStatus';
import { ReviewStatsCards } from '@/components/provider/reviews/ReviewStatsCards';
import { ProviderReviewCard } from '@/components/provider/reviews/ProviderReviewCard';
import { FlagReviewDialog } from '@/components/provider/reviews/FlagReviewDialog';
import { RequestReviewSection } from '@/components/provider/reviews/RequestReviewSection';
import { GoogleReviewsImportSection } from '@/components/provider/reviews/GoogleReviewsImportSection';

export default function ProviderReviews() {
  const navigate = useNavigate();
  const { data: proStatus } = useProStatus();
  const isPro = proStatus?.isPro ?? false;

  const { 
    reviews, 
    facilities,
    isLoading, 
    stats, 
    submitResponse, 
    updateResponse, 
    deleteResponse, 
    flagReview, 
    refetch 
  } = useProviderReviews();
  
  const [selectedTab, setSelectedTab] = useState('all');
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [selectedReviewForDispute, setSelectedReviewForDispute] = useState<ProviderReview | null>(null);
  const [requestReviewOpen, setRequestReviewOpen] = useState(false);
  const [googleReviewsOpen, setGoogleReviewsOpen] = useState(false);

  // Get the active facility ID for modals
  const activeFacilityId = facilityFilter !== "all" ? facilityFilter : facilities[0]?.id || null;
  
  // Get stats for the trigger cards
  const { stats: requestStats } = useReviewRequests(activeFacilityId);
  const { reviewsConfig } = useGoogleReviews(activeFacilityId || '');

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Facility filter
      if (facilityFilter !== "all" && r.facility_id !== facilityFilter) return false;
      // Tab filter
      if (selectedTab === 'needs-response') return !r.response;
      if (selectedTab === 'disputed') return r.dispute;
      return true;
    });
  }, [reviews, selectedTab, facilityFilter]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const filtered = facilityFilter === "all" ? reviews : reviews.filter(r => r.facility_id === facilityFilter);
    const totalReviews = filtered.length;
    const averageRating = totalReviews > 0
      ? Math.round((filtered.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : null;
    const needsResponse = filtered.filter(r => !r.response).length;
    const disputed = filtered.filter(r => r.dispute && r.dispute.status === 'pending').length;
    return { totalReviews, averageRating, needsResponse, disputed };
  }, [reviews, facilityFilter]);

  const handleFlagReview = (review: ProviderReview) => {
    setSelectedReviewForDispute(review);
    setDisputeDialogOpen(true);
  };

  const handleSubmitDispute = async (reviewId: string, reason: string, details?: string) => {
    return flagReview(reviewId, reason, details);
  };

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
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Facility Filter */}
          {facilities.length > 1 && (
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className={cn("w-[180px]", facilityFilter !== "all" && "border-primary text-primary")}>
                <Building2 className="h-4 w-4 mr-2" />
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
          )}
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
      </div>

      {/* Request Reviews & Import Google Reviews - Trigger Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Request Reviews Trigger Card */}
        <Card 
          className={cn(
            "cursor-pointer transition-all group",
            isPro 
              ? "hover:border-primary/50 hover:shadow-sm" 
              : "opacity-75 hover:opacity-90"
          )}
          onClick={() => isPro ? setRequestReviewOpen(true) : navigate('/provider/billing?tab=pro')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 relative",
                  isPro ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Mail className="h-5 w-5" />
                  {!isPro && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                      <Lock className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Request Reviews</CardTitle>
                  <CardDescription className="text-xs">
                    Send email invitations to clients
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPro && requestStats.sent > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {requestStats.sent} sent
                  </Badge>
                )}
                {!isPro && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs font-medium">
                    <Sparkles className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Import Google Reviews Trigger Card */}
        <Card 
          className={cn(
            "cursor-pointer transition-all group",
            isPro 
              ? "hover:border-primary/50 hover:shadow-sm" 
              : "opacity-75 hover:opacity-90"
          )}
          onClick={() => isPro ? setGoogleReviewsOpen(true) : navigate('/provider/billing?tab=pro')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 relative",
                  isPro ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
                )}>
                  <Star className="h-5 w-5" />
                  {!isPro && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                      <Lock className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Import Google Reviews</CardTitle>
                  <CardDescription className="text-xs">
                    Display your Google rating
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPro && reviewsConfig?.google_rating && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {reviewsConfig.google_rating.toFixed(1)}
                  </Badge>
                )}
                {!isPro && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-xs font-medium">
                    <Sparkles className="h-3 w-3 mr-1" />
                    PRO
                  </Badge>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Pro Upgrade Banner */}
      {!isPro && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-amber-600/10">
          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-muted-foreground truncate">
                Upgrade to Pro to unlock Google Reviews Import & Review Requests
              </p>
            </div>
            <Button 
              size="sm" 
              className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
              onClick={() => navigate('/provider/billing?tab=pro')}
            >
              Upgrade
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <ReviewStatsCards stats={filteredStats} />

      {/* Reviews Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="all" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              <span>All</span>
              <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {facilityFilter === "all" ? reviews.length : reviews.filter(r => r.facility_id === facilityFilter).length}
              </span>
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
              {filteredReviews.map((review) => (
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

      {/* Request Reviews Modal */}
      <RequestReviewSection 
        facilityId={activeFacilityId}
        facilityName={facilityFilter !== "all" ? facilities.find(f => f.id === facilityFilter)?.name : facilities[0]?.name}
        open={requestReviewOpen}
        onOpenChange={setRequestReviewOpen}
      />

      {/* Google Reviews Modal */}
      <GoogleReviewsImportSection 
        facilityId={activeFacilityId}
        open={googleReviewsOpen}
        onOpenChange={setGoogleReviewsOpen}
      />
      </div>
    </div>
  );
}
