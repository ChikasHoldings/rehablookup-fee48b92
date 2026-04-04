import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Star, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Building2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Flag,
  MapPin,
  User,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ReviewWithDetails {
  id: string;
  user_id: string;
  facility_id: string;
  rating: number;
  review_text: string | null;
  status: string;
  helpful_count: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  facility_name?: string;
  reviewer_name?: string;
  reviewer_city?: string;
  reviewer_state?: string;
}

interface DisputeWithDetails {
  id: string;
  review_id: string;
  facility_id: string;
  disputed_by: string;
  reason: string;
  details: string | null;
  status: string;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  facility_name?: string;
  review?: ReviewWithDetails;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= rating
              ? "fill-warning text-warning"
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function ReviewCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-4 w-40" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32 mt-1" />
              </div>
            </div>
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [disputes, setDisputes] = useState<DisputeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; isOpen: boolean } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  const fetchReviews = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('facility_reviews')
      .select('id, facility_id, user_id, rating, review_text, status, helpful_count, disputed, admin_notes, reviewed_at, reviewed_by, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
      setIsLoading(false);
      return;
    }

    const facilityIds = [...new Set(data?.map(r => r.facility_id) || [])];
    const userIds = [...new Set(data?.map(r => r.user_id) || [])];
    
    if (facilityIds.length === 0) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    const [facilitiesResult, profilesResult] = await Promise.all([
      supabase.from('facilities').select('id, name').in('id', facilityIds),
      userIds.length > 0
        ? supabase.from('seeker_profiles').select('user_id, first_name, last_name, city, state, display_name').in('user_id', userIds)
        : Promise.resolve({ data: [] as { user_id: string; first_name: string | null; last_name: string | null; city: string | null; state: string | null; display_name: string | null }[] })
    ]);

    const facilityMap = new Map(facilitiesResult.data?.map(f => [f.id, f.name] as const) || []);
    const profileMap = new Map((profilesResult.data || []).map(p => [p.user_id, p] as const));

    const enrichedReviews: ReviewWithDetails[] = (data || []).map(review => {
      const profile = profileMap.get(review.user_id);
      const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
      const lastInitial = profile?.last_name?.charAt(0) || profile?.display_name?.split(' ')[1]?.charAt(0) || '';
      const displayName = firstName
        ? firstName + (lastInitial ? ` ${lastInitial}.` : '')
        : 'Verified User';
      
      return {
        ...review,
        facility_name: facilityMap.get(review.facility_id) || 'Unknown Facility',
        reviewer_name: displayName,
        reviewer_city: profile?.city || null,
        reviewer_state: profile?.state || null
      };
    });

    setReviews(enrichedReviews);
    setIsLoading(false);
  };

  const fetchDisputes = async () => {
    const { data: disputesData, error } = await supabase
      .from('review_disputes')
      .select('id, facility_id, review_id, disputed_by, reason, details, status, admin_notes, created_at, resolved_at, resolved_by')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching disputes:', error);
      return;
    }

    if (!disputesData || disputesData.length === 0) {
      setDisputes([]);
      return;
    }

    const reviewIds = [...new Set(disputesData.map(d => d.review_id))];
    const facilityIds = [...new Set(disputesData.map(d => d.facility_id))];

    const [reviewsResult, facilitiesResult] = await Promise.all([
      supabase
        .from('facility_reviews')
        .select('id, facility_id, user_id, rating, review_text, status, helpful_count, admin_notes, created_at, updated_at')
        .in('id', reviewIds),
      supabase.from('facilities').select('id, name').in('id', facilityIds),
    ]);

    const userIds = [...new Set(reviewsResult.data?.map(r => r.user_id) || [])];
    const profilesResult = userIds.length > 0
      ? await supabase.from('seeker_profiles').select('user_id, first_name, last_name, city, state, display_name').in('user_id', userIds)
      : { data: [] as { user_id: string; first_name: string | null; last_name: string | null; city: string | null; state: string | null; display_name: string | null }[] };

    const profileMap = new Map((profilesResult.data || []).map(p => [p.user_id, p] as const));
    const facilityMap = new Map(facilitiesResult.data?.map(f => [f.id, f.name] as const) || []);
    
    const reviewMap = new Map(reviewsResult.data?.map(r => {
      const profile = profileMap.get(r.user_id);
      const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
      const lastInitial = profile?.last_name?.charAt(0) || profile?.display_name?.split(' ')[1]?.charAt(0) || '';
      const displayName = firstName
        ? firstName + (lastInitial ? ` ${lastInitial}.` : '')
        : 'Verified User';
      
      return [r.id, {
        ...r,
        reviewer_name: displayName,
        reviewer_city: profile?.city || null,
        reviewer_state: profile?.state || null
      }];
    }) || []);

    const enrichedDisputes: DisputeWithDetails[] = disputesData.map(dispute => ({
      ...dispute,
      facility_name: facilityMap.get(dispute.facility_id) || 'Unknown Facility',
      review: reviewMap.get(dispute.review_id) || undefined
    }));

    setDisputes(enrichedDisputes);
  };

  useEffect(() => {
    fetchReviews();
    fetchDisputes();

    const reviewsChannel = supabase
      .channel('admin-reviews-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facility_reviews' }, () => fetchReviews())
      .subscribe();

    const disputesChannel = supabase
      .channel('admin-disputes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'review_disputes' }, () => fetchDisputes())
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(disputesChannel);
    };
  }, []);

  const handleApprove = async (reviewId: string) => {
    setProcessingId(reviewId);
    
    const { error } = await supabase
      .from('facility_reviews')
      .update({ 
        status: 'approved',
        admin_notes: adminNotes[reviewId] || null,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    setProcessingId(null);

    if (error) {
      toast.error('Failed to approve review');
    } else {
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        supabase.functions.invoke('send-review-notification', {
          body: { type: 'review_approved', reviewId, facilityId: review.facility_id, seekerId: review.user_id }
        }).catch(() => {});
      }
      toast.success('Review approved');
      fetchReviews();
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!adminNotes[reviewId]?.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(reviewId);
    
    const { error } = await supabase
      .from('facility_reviews')
      .update({ 
        status: 'rejected',
        admin_notes: adminNotes[reviewId],
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    setProcessingId(null);

    if (error) {
      toast.error('Failed to reject review');
    } else {
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        supabase.functions.invoke('send-review-notification', {
          body: { type: 'review_rejected', reviewId, facilityId: review.facility_id, seekerId: review.user_id, rejectionReason: adminNotes[reviewId] }
        }).catch(() => {});
      }
      toast.success('Review rejected');
      fetchReviews();
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    }
  };

  const handleDelete = async (reviewId: string) => {
    setDeleteConfirm({ id: reviewId, isOpen: true });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    setProcessingId(deleteConfirm.id);
    
    const { error } = await supabase
      .from('facility_reviews')
      .delete()
      .eq('id', deleteConfirm.id);

    setProcessingId(null);
    setDeleteConfirm(null);

    if (error) {
      toast.error('Failed to delete review');
    } else {
      toast.success('Review deleted');
      fetchReviews();
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    }
  };

  const handleUpholdDispute = async (dispute: DisputeWithDetails) => {
    setProcessingId(dispute.id);

    await supabase.from('facility_reviews').update({ status: 'hidden' }).eq('id', dispute.review_id);

    const { error } = await supabase
      .from('review_disputes')
      .update({
        status: 'upheld',
        admin_notes: disputeNotes[dispute.id] || null,
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', dispute.id);

    await supabase.from('facility_reviews').update({ disputed: false }).eq('id', dispute.review_id);

    setProcessingId(null);

    if (error) {
      toast.error('Failed to uphold dispute');
    } else {
      toast.success('Dispute upheld — review hidden');
      fetchReviews();
      fetchDisputes();
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    }
  };

  const handleDismissDispute = async (dispute: DisputeWithDetails) => {
    setProcessingId(dispute.id);

    const { error } = await supabase
      .from('review_disputes')
      .update({
        status: 'dismissed',
        admin_notes: disputeNotes[dispute.id] || null,
        resolved_by: currentUserId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', dispute.id);

    await supabase.from('facility_reviews').update({ disputed: false }).eq('id', dispute.review_id);

    setProcessingId(null);

    if (error) {
      toast.error('Failed to dismiss dispute');
    } else {
      toast.success('Dispute dismissed — review remains visible');
      fetchReviews();
      fetchDisputes();
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (selectedTab === 'pending') return r.status === 'pending';
    if (selectedTab === 'approved') return r.status === 'approved';
    if (selectedTab === 'rejected') return r.status === 'rejected';
    return true;
  });

  const pendingCount = reviews.filter(r => r.status === 'pending').length;
  const approvedCount = reviews.filter(r => r.status === 'approved').length;
  const rejectedCount = reviews.filter(r => r.status === 'rejected').length;
  const pendingDisputesCount = disputes.filter(d => d.status === 'pending').length;

  const getDisputeReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      'fake': 'Fake Review',
      'inappropriate': 'Inappropriate Content',
      'competitor': 'Competitor Review',
      'inaccurate': 'Inaccurate Information',
      'other': 'Other'
    };
    return labels[reason] || reason;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Moderation</h1>
          <p className="text-muted-foreground">Manage user reviews and disputes</p>
        </div>
        <Button variant="outline" onClick={() => { fetchReviews(); fetchDisputes(); }} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-warning/10 shrink-0">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-success/10 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Approved</p>
                <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-destructive/10 shrink-0">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejected</p>
                <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-warning/10 shrink-0">
                <Flag className="h-4 w-4 text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Disputes</p>
                <p className="text-lg sm:text-xl font-bold leading-tight tabular-nums">{pendingDisputesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            <Badge variant="secondary" className="ml-1 tabular-nums">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approved
            <Badge variant="secondary" className="ml-1 tabular-nums">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected
            <Badge variant="secondary" className="ml-1 tabular-nums">{rejectedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="disputes" className="gap-2">
            <Flag className="h-4 w-4" />
            Disputes
            {pendingDisputesCount > 0 && (
              <Badge variant="destructive" className="ml-1 tabular-nums">{pendingDisputesCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <ReviewCardSkeleton key={i} />)}
            </div>
          ) : disputes.filter(d => d.status === 'pending').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground">No pending disputes</p>
                <p className="text-sm text-muted-foreground mt-1">All disputes have been resolved</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {disputes.filter(d => d.status === 'pending').map((dispute) => (
                <Card key={dispute.id} className="border-warning/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{dispute.facility_name}</span>
                        </div>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {getDisputeReasonLabel(dispute.reason)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dispute.review && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Original Review</p>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{dispute.review.reviewer_name || 'Verified User'}</p>
                            {(dispute.review.reviewer_city || dispute.review.reviewer_state) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {[dispute.review.reviewer_city, dispute.review.reviewer_state].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <StarRating rating={dispute.review.rating} />
                        {dispute.review.review_text ? (
                          <p className="text-sm mt-2">{dispute.review.review_text}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic mt-2">No review text</p>
                        )}
                      </div>
                    )}

                    {dispute.details && (
                      <div className="bg-warning/5 p-4 rounded-lg border border-warning/20">
                        <p className="text-xs font-medium text-warning mb-2 uppercase tracking-wider">Provider's Explanation</p>
                        <p className="text-sm">{dispute.details}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Admin notes (optional)"
                        value={disputeNotes[dispute.id] || ''}
                        onChange={(e) => setDisputeNotes(prev => ({ ...prev, [dispute.id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleUpholdDispute(dispute)}
                          disabled={processingId === dispute.id}
                          variant="destructive"
                          className="gap-2"
                        >
                          {processingId === dispute.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Uphold (Hide Review)
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDismissDispute(dispute)}
                          disabled={processingId === dispute.id}
                          className="gap-2"
                        >
                          {processingId === dispute.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          Dismiss (Keep Review)
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Review Tabs */}
        {['pending', 'approved', 'rejected'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <ReviewCardSkeleton key={i} />)}
              </div>
            ) : filteredReviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground">No {tab} reviews</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tab === 'pending' ? 'No reviews awaiting moderation' : `No reviews with ${tab} status`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{review.facility_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{review.reviewer_name || 'Verified User'}</p>
                                {(review.reviewer_city || review.reviewer_state) && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {[review.reviewer_city, review.reviewer_state].filter(Boolean).join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} />
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            review.status === 'approved' ? 'default' : 
                            review.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                          className="capitalize"
                        >
                          {review.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {review.review_text ? (
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">{review.review_text}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No review text provided</p>
                      )}

                      {review.status === 'pending' && (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Admin notes (required for rejection)"
                            value={adminNotes[review.id] || ''}
                            onChange={(e) => setAdminNotes(prev => ({ ...prev, [review.id]: e.target.value }))}
                            rows={2}
                          />
                          <div className="flex items-center gap-2">
                            <Button 
                              onClick={() => handleApprove(review.id)}
                              disabled={processingId === review.id}
                              className="gap-2"
                            >
                              {processingId === review.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleReject(review.id)}
                              disabled={processingId === review.id}
                              className="gap-2"
                            >
                              {processingId === review.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {review.admin_notes && review.status !== 'pending' && (
                        <div className="text-sm">
                          <span className="font-medium">Admin Notes: </span>
                          <span className="text-muted-foreground">{review.admin_notes}</span>
                        </div>
                      )}

                      {review.status !== 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(review.id)}
                          disabled={processingId === review.id}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete Review
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm?.isOpen ?? false} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
