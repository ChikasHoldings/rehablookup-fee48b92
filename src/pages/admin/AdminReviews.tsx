import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAuditLog } from '@/hooks/admin/useAuditLog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Star, CheckCircle2, XCircle, Clock, MessageSquare, Building2,
  Loader2, RefreshCw, AlertTriangle, Flag, MapPin, User, Trash2,
  Search, Link2, X, Download, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ReviewDetailModal } from '@/components/admin/ReviewDetailModal';
import { PaginationFooter } from '@/components/common/PaginationFooter';
import { usePagination } from '@/hooks/usePagination';
import {
  BulkReviewModerationDialog,
  type BulkReviewAction,
} from '@/components/admin/reviews/BulkReviewModerationDialog';

interface ReviewWithDetails {
  id: string;
  user_id: string | null;
  facility_id: string;
  rating: number;
  review_text: string | null;
  status: string;
  helpful_count: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  // Token-submitted reviews (from the send-a-link funnel) carry the
  // originating review_requests row id. NULL = direct seeker submission.
  // Used by the row UI to flag provenance with an "Invited" badge.
  review_request_id?: string | null;
  facility_name?: string;
  reviewer_name?: string;
  reviewer_city?: string | null;
  reviewer_state?: string | null;
  disputed?: boolean | null;
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

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= rating
              ? "fill-warning text-warning"
              : "text-muted-foreground/30"
          )}
          aria-hidden
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

function reviewerDisplayName(
  storedName: string | null | undefined,
  profile: { first_name: string | null; last_name: string | null; display_name: string | null } | undefined,
): string {
  let displayName = storedName?.trim() || null;
  if (!displayName) {
    const firstName = (profile?.first_name || profile?.display_name?.split(' ')[0] || '').trim();
    const lastName = (profile?.last_name || profile?.display_name?.split(' ').slice(1).join(' ') || '').trim();
    displayName = firstName ? (firstName + (lastName ? ` ${lastName}` : '')) : null;
  }
  return displayName || 'Verified Reviewer';
}

const VALID_TABS = ['pending', 'approved', 'rejected', 'hidden', 'disputes'] as const;
type TabValue = typeof VALID_TABS[number];

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const { adminRole, isSuperAdmin } = useAdminAuth();
  const { log: auditLog } = useAuditLog();
  const canModerateReviews = isSuperAdmin || adminRole === "super_admin" || adminRole === "manager";

  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedTab, setSelectedTab] = useState<TabValue>(() => {
    const t = searchParams.get('tab');
    return t && (VALID_TABS as readonly string[]).includes(t) ? (t as TabValue) : 'pending';
  });
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') ?? '');
  const searchQuery = useDebounce(searchInput, 350);
  const [ratingFilter, setRatingFilter] = useState<string>(() => searchParams.get('rating') ?? 'all');

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkReviewAction | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // URL ← state sync. Defaults not written to keep the URL clean.
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchQuery) next.set('q', searchQuery);
    if (selectedTab && selectedTab !== 'pending') next.set('tab', selectedTab);
    if (ratingFilter && ratingFilter !== 'all') next.set('rating', ratingFilter);
    const a = next.toString();
    const b = searchParams.toString();
    if (a !== b) setSearchParams(next, { replace: true });
  }, [searchQuery, selectedTab, ratingFilter, searchParams, setSearchParams]);

  // Reviews query — useQuery so we get isFetching + proper cache mgmt
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    isFetching: reviewsFetching,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['admin-reviews-all'],
    queryFn: async (): Promise<ReviewWithDetails[]> => {
      const { data, error } = await supabase
        .from('facility_reviews')
        .select('id, facility_id, user_id, rating, review_text, status, helpful_count, disputed, admin_notes, reviewed_at, reviewed_by, created_at, updated_at, reviewer_display_name, review_request_id')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      const rows = data || [];
      if (rows.length === 0) return [];

      const facilityIds = [...new Set(rows.map((r) => r.facility_id))];
      const userIds = [...new Set(rows.map((r) => r.user_id))];

      const [facilitiesResult, profilesResult] = await Promise.all([
        supabase.from('facilities').select('id, name').in('id', facilityIds),
        userIds.length > 0
          ? supabase.from('seeker_profiles')
              .select('user_id, first_name, last_name, city, state, display_name')
              .in('user_id', userIds)
          : Promise.resolve({
              data: [] as { user_id: string; first_name: string | null; last_name: string | null; city: string | null; state: string | null; display_name: string | null }[],
              error: null,
            }),
      ]);
      // Throw on lookup failures so isError reflects reality instead
      // of rendering rows with "Unknown Facility" / "Verified Reviewer"
      // placeholders that mask outages.
      if (facilitiesResult.error) throw facilitiesResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const facilityMap = new Map(facilitiesResult.data?.map((f) => [f.id, f.name] as const) || []);
      const profileMap = new Map((profilesResult.data || []).map((p) => [p.user_id, p] as const));

      return rows.map((review) => {
        const profile = profileMap.get(review.user_id);
        const storedName = (review as { reviewer_display_name?: string | null }).reviewer_display_name;
        return {
          ...review,
          facility_name: facilityMap.get(review.facility_id) || 'Unknown Facility',
          reviewer_name: reviewerDisplayName(storedName, profile),
          reviewer_city: profile?.city || null,
          reviewer_state: profile?.state || null,
        };
      });
    },
    staleTime: 30 * 1000,
  });

  // Disputes query
  const {
    data: disputes = [],
    isFetching: disputesFetching,
    refetch: refetchDisputes,
  } = useQuery({
    queryKey: ['admin-review-disputes'],
    queryFn: async (): Promise<DisputeWithDetails[]> => {
      const { data: disputesData, error } = await supabase
        .from('review_disputes')
        .select('id, facility_id, review_id, disputed_by, reason, details, status, admin_notes, created_at, resolved_at, resolved_by')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      if (!disputesData || disputesData.length === 0) return [];

      const reviewIds = [...new Set(disputesData.map((d) => d.review_id))];
      const facilityIds = [...new Set(disputesData.map((d) => d.facility_id))];

      const [reviewsResult, facilitiesResult] = await Promise.all([
        supabase
          .from('facility_reviews')
          .select('id, facility_id, user_id, rating, review_text, status, helpful_count, admin_notes, created_at, updated_at, reviewer_display_name, review_request_id')
          .in('id', reviewIds),
        supabase.from('facilities').select('id, name').in('id', facilityIds),
      ]);
      if (reviewsResult.error) throw reviewsResult.error;
      if (facilitiesResult.error) throw facilitiesResult.error;

      const userIds = [...new Set(reviewsResult.data?.map((r) => r.user_id) || [])];
      const profilesResult = userIds.length > 0
        ? await supabase.from('seeker_profiles')
            .select('user_id, first_name, last_name, city, state, display_name')
            .in('user_id', userIds)
        : { data: [], error: null };
      if (profilesResult.error) throw profilesResult.error;

      const profileMap = new Map((profilesResult.data || []).map((p) => [p.user_id, p] as const));
      const facilityMap = new Map(facilitiesResult.data?.map((f) => [f.id, f.name] as const) || []);

      const reviewMap = new Map(reviewsResult.data?.map((r) => {
        const profile = profileMap.get(r.user_id);
        const storedName = (r as { reviewer_display_name?: string | null }).reviewer_display_name;
        return [r.id, {
          ...r,
          reviewer_name: reviewerDisplayName(storedName, profile),
          reviewer_city: profile?.city || null,
          reviewer_state: profile?.state || null,
        }];
      }) || []);

      return disputesData.map((dispute) => ({
        ...dispute,
        facility_name: facilityMap.get(dispute.facility_id) || 'Unknown Facility',
        review: reviewMap.get(dispute.review_id) || undefined,
      }));
    },
    staleTime: 30 * 1000,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin-reviews-all'] });
    queryClient.invalidateQueries({ queryKey: ['admin-review-disputes'] });
    queryClient.invalidateQueries({ queryKey: ['admin-sidebar-counts'] });
  }, [queryClient]);

  // Realtime — facility_reviews + review_disputes are now in the
  // supabase_realtime publication (migration
  // 20260621000000_realtime_for_reviews_and_disputes). Polling at 30s
  // layered as fallback.
  useEffect(() => {
    const interval = setInterval(invalidateAll, 30000);
    return () => clearInterval(interval);
  }, [invalidateAll]);

  useEffect(() => {
    const reviewsChannel = supabase
      .channel(`admin-reviews-live-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facility_reviews' }, () => invalidateAll())
      .subscribe();
    const disputesChannel = supabase
      .channel(`admin-disputes-live-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'review_disputes' }, () => invalidateAll())
      .subscribe();
    return () => {
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(disputesChannel);
    };
  }, [invalidateAll]);

  // Reset processingId if the row leaves the visible set (e.g. after
  // a status change the row moves to a different tab).
  useEffect(() => {
    if (!processingId) return;
    const stillVisible = reviews.some((r) => r.id === processingId);
    if (!stillVisible) setProcessingId(null);
  }, [reviews, processingId]);

  // Filters
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (selectedTab === 'pending' && r.status !== 'pending') return false;
      if (selectedTab === 'approved' && r.status !== 'approved') return false;
      if (selectedTab === 'rejected' && r.status !== 'rejected') return false;
      if (selectedTab === 'hidden' && r.status !== 'hidden') return false;
      if (ratingFilter !== 'all' && String(r.rating) !== ratingFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          r.facility_name, r.reviewer_name, r.review_text,
          r.reviewer_city, r.reviewer_state,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [reviews, selectedTab, ratingFilter, searchQuery]);

  // Prune selectedIds to the visible filtered set
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(filteredReviews.map((r) => r.id));
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id); else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [filteredReviews, selectedIds]);

  const reviewsPagination = usePagination({
    tableId: `admin-reviews-${selectedTab}-${ratingFilter}`,
    defaultPageSize: 25,
    totalItems: filteredReviews.length,
  });
  const visibleReviews = reviewsPagination.paginate(filteredReviews);

  useEffect(() => {
    reviewsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, ratingFilter, searchQuery]);

  const pendingCount = useMemo(() => reviews.filter((r) => r.status === 'pending').length, [reviews]);
  const approvedCount = useMemo(() => reviews.filter((r) => r.status === 'approved').length, [reviews]);
  const rejectedCount = useMemo(() => reviews.filter((r) => r.status === 'rejected').length, [reviews]);
  const hiddenCount = useMemo(() => reviews.filter((r) => r.status === 'hidden').length, [reviews]);
  const pendingDisputesCount = useMemo(() => disputes.filter((d) => d.status === 'pending').length, [disputes]);

  const hasActiveFilters = searchInput !== '' || ratingFilter !== 'all';

  const clearAllFilters = () => {
    setSearchInput('');
    setRatingFilter('all');
    setSelectedIds(new Set());
  };

  const copyFilterLink = useCallback(async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Filter link copied to clipboard');
      } else {
        const tmp = document.createElement('input');
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
        toast.success('Filter link copied to clipboard');
      }
    } catch {
      toast.error('Could not copy link');
    }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    if (visibleReviews.length === 0) return;
    const allIds = visibleReviews.map((r) => r.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleReviews, selectedIds]);

  const handleExportCSV = useCallback(() => {
    if (filteredReviews.length === 0) {
      toast.info('No reviews to export');
      return;
    }
    const headers = [
      'ID', 'Status', 'Rating', 'Facility', 'Reviewer', 'City', 'State',
      'Review Text', 'Helpful Count', 'Disputed', 'Created At', 'Updated At',
    ];
    const rows = filteredReviews.map((r) => [
      r.id, r.status, String(r.rating),
      r.facility_name || '', r.reviewer_name || '',
      r.reviewer_city || '', r.reviewer_state || '',
      r.review_text || '',
      String(r.helpful_count ?? 0),
      r.disputed ? 'yes' : 'no',
      r.created_at, r.updated_at,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredReviews.length} reviews`);
  }, [filteredReviews]);

  // Single-action handlers (existing single-row UX preserved)

  const handleApprove = async (reviewId: string) => {
    setProcessingId(reviewId);
    const sanitizedNotes = (adminNotes[reviewId] || '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, 2000);

    const { data: approvedRow, error } = await supabase
      .from('facility_reviews')
      .update({
        status: 'approved',
        admin_notes: sanitizedNotes || null,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('id')
      .maybeSingle();

    setProcessingId(null);

    if (error || !approvedRow) {
      toast.error(error ? `Failed to approve review: ${error.message}` : 'Review not found or already deleted');
      return;
    }
    const review = reviews.find((r) => r.id === reviewId);
    if (review) {
      auditLog({
        actionType: 'review_approved',
        targetType: 'review',
        targetId: reviewId,
        details: {
          facility_id: review.facility_id,
          facility_name: review.facility_name,
          reviewer: review.reviewer_name,
          rating: review.rating,
          admin_notes: sanitizedNotes || null,
        },
      });
      // Email notification — failure is soft (decision is persisted).
      try {
        const { data, error: notifyErr } = await supabase.functions.invoke('send-review-notification', {
          body: { type: 'review_approved', reviewId, facilityId: review.facility_id, seekerId: review.user_id },
        });
        if (notifyErr || data?.error) {
          const msg = (notifyErr as Error | null)?.message || data?.error || 'Unknown error';
          toast.warning(`Review approved, but seeker email failed: ${msg}`);
        }
      } catch (notifyErr) {
        const msg = notifyErr instanceof Error ? notifyErr.message : 'Unknown error';
        toast.warning(`Review approved, but seeker email failed: ${msg}`);
      }
    }
    toast.success('Review approved');
    invalidateAll();
  };

  // Reverse a moderation decision: bring a hidden/rejected review back to
  // visible. Preserves admin_notes (the moderation history) and sends no email
  // — this is a correction, not a fresh approval. Without this, a wrongly
  // hidden/rejected review could only be deleted (a dead-end).
  const handleRestore = async (reviewId: string) => {
    setProcessingId(reviewId);
    const { data: restoredRow, error } = await supabase
      .from('facility_reviews')
      .update({
        status: 'approved',
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('id')
      .maybeSingle();

    setProcessingId(null);

    if (error || !restoredRow) {
      toast.error(error ? `Failed to restore review: ${error.message}` : 'Review not found or already deleted');
      return;
    }
    const review = reviews.find((r) => r.id === reviewId);
    if (review) {
      auditLog({
        actionType: 'review_restored',
        targetType: 'review',
        targetId: reviewId,
        details: {
          facility_id: review.facility_id,
          facility_name: review.facility_name,
          reviewer: review.reviewer_name,
          from_status: review.status,
        },
      });
    }
    toast.success('Review restored to visible');
    invalidateAll();
  };

  const handleReject = async (reviewId: string) => {
    if (!adminNotes[reviewId]?.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessingId(reviewId);
    const sanitizedNotes = adminNotes[reviewId]
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, 2000);

    const { data: rejectedRow, error } = await supabase
      .from('facility_reviews')
      .update({
        status: 'rejected',
        admin_notes: sanitizedNotes,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select('id')
      .maybeSingle();

    setProcessingId(null);

    if (error || !rejectedRow) {
      toast.error(error ? `Failed to reject review: ${error.message}` : 'Review not found or already deleted');
      return;
    }
    const review = reviews.find((r) => r.id === reviewId);
    if (review) {
      auditLog({
        actionType: 'review_rejected',
        targetType: 'review',
        targetId: reviewId,
        details: {
          facility_id: review.facility_id,
          facility_name: review.facility_name,
          reviewer: review.reviewer_name,
          rating: review.rating,
          rejection_reason: sanitizedNotes,
        },
      });
      try {
        const { data, error: notifyErr } = await supabase.functions.invoke('send-review-notification', {
          body: { type: 'review_rejected', reviewId, facilityId: review.facility_id, seekerId: review.user_id, rejectionReason: sanitizedNotes },
        });
        if (notifyErr || data?.error) {
          const msg = (notifyErr as Error | null)?.message || data?.error || 'Unknown error';
          toast.warning(`Review rejected, but seeker email failed: ${msg}`);
        }
      } catch (notifyErr) {
        const msg = notifyErr instanceof Error ? notifyErr.message : 'Unknown error';
        toast.warning(`Review rejected, but seeker email failed: ${msg}`);
      }
    }
    toast.success('Review rejected');
    invalidateAll();
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const review = reviews.find((r) => r.id === deleteConfirm.id);
    setProcessingId(deleteConfirm.id);

    // Cascade dispute rows first so the FK doesn't block the delete.
    const { error: disputeErr } = await supabase
      .from('review_disputes')
      .delete()
      .eq('review_id', deleteConfirm.id);
    if (disputeErr) {
      setProcessingId(null);
      setDeleteConfirm(null);
      toast.error(`Failed to clean up disputes: ${disputeErr.message}`);
      return;
    }

    const { data: deletedReview, error } = await supabase
      .from('facility_reviews')
      .delete()
      .eq('id', deleteConfirm.id)
      .select('id')
      .maybeSingle();

    setProcessingId(null);
    setDeleteConfirm(null);

    if (error) {
      toast.error(`Failed to delete review: ${error.message}`);
      return;
    }
    if (!deletedReview) {
      toast.error('Review not found or already deleted');
      return;
    }
    auditLog({
      actionType: 'review_deleted',
      targetType: 'review',
      targetId: deleteConfirm.id,
      details: {
        facility_id: review?.facility_id,
        facility_name: review?.facility_name,
        reviewer: review?.reviewer_name,
        rating: review?.rating,
        review_text: review?.review_text,
        status_before_delete: review?.status,
      },
    });
    toast.success('Review deleted');
    invalidateAll();
  };

  // Dispute handlers — now sequenced with explicit error checks at
  // every step so a partial-state failure can't silently leave the
  // ticket half-resolved.

  const handleUpholdDispute = async (dispute: DisputeWithDetails) => {
    setProcessingId(dispute.id);
    try {
      // 1. Hide the review (+ clear disputed flag in the same update).
      const { data: hiddenRow, error: hideErr } = await supabase
        .from('facility_reviews')
        .update({ status: 'hidden', disputed: false, updated_at: new Date().toISOString() })
        .eq('id', dispute.review_id)
        .select('id')
        .maybeSingle();
      if (hideErr) throw new Error(`Failed to hide review: ${hideErr.message}`);
      if (!hiddenRow) throw new Error('Review not found or already deleted — cannot uphold dispute');

      // 2. Mark the dispute as upheld.
      const { data: upheldRow, error: disputeErr } = await supabase
        .from('review_disputes')
        .update({
          status: 'upheld',
          admin_notes: disputeNotes[dispute.id] || null,
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', dispute.id)
        .select('id')
        .maybeSingle();
      if (disputeErr) throw new Error(`Failed to mark dispute upheld: ${disputeErr.message}`);
      if (!upheldRow) throw new Error('Dispute not found or already resolved');

      auditLog({
        actionType: 'dispute_upheld',
        targetType: 'review_dispute',
        targetId: dispute.id,
        details: {
          review_id: dispute.review_id,
          facility_name: dispute.facility_name,
          reason: dispute.reason,
          admin_notes: disputeNotes[dispute.id] || null,
        },
      });
      toast.success('Dispute upheld — review hidden');
      invalidateAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismissDispute = async (dispute: DisputeWithDetails) => {
    setProcessingId(dispute.id);
    try {
      const { data: dismissedRow, error: disputeErr } = await supabase
        .from('review_disputes')
        .update({
          status: 'dismissed',
          admin_notes: disputeNotes[dispute.id] || null,
          resolved_by: currentUserId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', dispute.id)
        .select('id')
        .maybeSingle();
      if (disputeErr) throw new Error(`Failed to dismiss dispute: ${disputeErr.message}`);
      if (!dismissedRow) throw new Error('Dispute not found or already resolved');

      const { error: clearErr } = await supabase
        .from('facility_reviews')
        .update({ disputed: false, updated_at: new Date().toISOString() })
        .eq('id', dispute.review_id);
      if (clearErr) {
        // Soft-fail — the dispute resolution persisted; we just couldn't
        // clear the flag on the review (e.g. row missing). Surface as
        // a warning instead of overwriting the success.
        toast.warning(`Dispute dismissed, but couldn't clear disputed flag: ${clearErr.message}`);
      } else {
        toast.success('Dispute dismissed — review remains visible');
      }

      auditLog({
        actionType: 'dispute_dismissed',
        targetType: 'review_dispute',
        targetId: dispute.id,
        details: {
          review_id: dispute.review_id,
          facility_name: dispute.facility_name,
          reason: dispute.reason,
          admin_notes: disputeNotes[dispute.id] || null,
        },
      });
      invalidateAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    } finally {
      setProcessingId(null);
    }
  };

  const getDisputeReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      'fake': 'Fake Review',
      'inappropriate': 'Inappropriate Content',
      'competitor': 'Competitor Review',
      'inaccurate': 'Inaccurate Information',
      'other': 'Other',
    };
    return labels[reason] || reason;
  };

  const isLoading = reviewsLoading;
  const isFetching = reviewsFetching || disputesFetching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review Moderation</h1>
          <p className="text-muted-foreground">Manage user reviews and disputes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && canModerateReviews && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction('approve')}
                aria-label={`Approve ${selectedIds.size} selected review${selectedIds.size === 1 ? '' : 's'}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Approve</span>
                <span>({selectedIds.size})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/5"
                onClick={() => setBulkAction('reject')}
                aria-label={`Reject ${selectedIds.size} selected review${selectedIds.size === 1 ? '' : 's'}`}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reject</span>
                <span>({selectedIds.size})</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction('hide')}
                aria-label={`Hide ${selectedIds.size} selected review${selectedIds.size === 1 ? '' : 's'}`}
              >
                <EyeOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hide</span>
                <span>({selectedIds.size})</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5"
                onClick={() => setBulkAction('delete')}
                aria-label={`Delete ${selectedIds.size} selected review${selectedIds.size === 1 ? '' : 's'}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
                <span>({selectedIds.size})</span>
              </Button>
            </>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={copyFilterLink}
              aria-label="Copy shareable link to this filtered view"
              title="Copy shareable link to this filtered view"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={clearAllFilters}
              aria-label="Clear filters"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredReviews.length === 0}
            className="gap-1.5"
            aria-label="Export filtered reviews as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          {isSuperAdmin && (
            <Button variant="outline" size="sm" onClick={async () => {
              const { data, error } = await (supabase.rpc as unknown as { (fn: string): Promise<{ data: number | null; error: { message: string } | null }> })('admin_backfill_reviewer_names');
              if (error) { toast.error('Backfill failed: ' + error.message); }
              else { toast.success(`Backfilled names for ${data ?? 0} review(s)`); invalidateAll(); }
            }}>
              Backfill Names
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { refetchReviews(); refetchDisputes(); }} disabled={isLoading} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
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

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by facility, reviewer, or text…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                <SelectItem value="5">5 stars</SelectItem>
                <SelectItem value="4">4 stars</SelectItem>
                <SelectItem value="3">3 stars</SelectItem>
                <SelectItem value="2">2 stars</SelectItem>
                <SelectItem value="1">1 star</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as TabValue)}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-auto sm:w-full justify-start">
            <TabsTrigger value="pending" className="gap-2 whitespace-nowrap" aria-label="Pending reviews">
              <Clock className="h-4 w-4" />
              Pending
              <Badge variant="secondary" className="ml-1 tabular-nums">{pendingCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2 whitespace-nowrap" aria-label="Approved reviews">
              <CheckCircle2 className="h-4 w-4" />
              Approved
              <Badge variant="secondary" className="ml-1 tabular-nums">{approvedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2 whitespace-nowrap" aria-label="Rejected reviews">
              <XCircle className="h-4 w-4" />
              Rejected
              <Badge variant="secondary" className="ml-1 tabular-nums">{rejectedCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="hidden" className="gap-2 whitespace-nowrap" aria-label="Hidden reviews">
              <EyeOff className="h-4 w-4" />
              Hidden
              <Badge variant="secondary" className="ml-1 tabular-nums">{hiddenCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2 whitespace-nowrap" aria-label="Review disputes">
              <Flag className="h-4 w-4" />
              Disputes
              {pendingDisputesCount > 0 && (
                <Badge variant="destructive" className="ml-1 tabular-nums">{pendingDisputesCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="mt-6">
          {!isLoading && isFetching && (
            <div className="px-1 -mt-2 mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing…
            </div>
          )}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => <ReviewCardSkeleton key={i} />)}
            </div>
          ) : disputes.filter((d) => d.status === 'pending').length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground">No pending disputes</p>
                <p className="text-sm text-muted-foreground mt-1">All disputes have been resolved</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {disputes.filter((d) => d.status === 'pending').map((dispute) => (
                <Card key={dispute.id} className="border-warning/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
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
                            <p className="text-sm font-medium">{dispute.review.reviewer_name || 'Verified Reviewer'}</p>
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
                        onChange={(e) => setDisputeNotes((prev) => ({ ...prev, [dispute.id]: e.target.value.slice(0, 2000) }))}
                        rows={2}
                        maxLength={2000}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
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

        {/* Review Tabs — pending / approved / rejected / hidden */}
        {(['pending', 'approved', 'rejected', 'hidden'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {!isLoading && isFetching && (
              <div className="px-1 -mt-2 mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
                <Loader2 className="h-3 w-3 animate-spin" />
                Refreshing…
              </div>
            )}
            {visibleReviews.length > 0 && canModerateReviews && (
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  checked={visibleReviews.length > 0 && visibleReviews.every((r) => selectedIds.has(r.id))}
                  onCheckedChange={toggleSelectAllVisible}
                  aria-label={
                    visibleReviews.every((r) => selectedIds.has(r.id))
                      ? "Deselect all visible reviews"
                      : "Select all visible reviews"
                  }
                />
                <span className="text-xs text-muted-foreground">Select all on this page</span>
              </div>
            )}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <ReviewCardSkeleton key={i} />)}
              </div>
            ) : filteredReviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-medium text-muted-foreground">No {tab} reviews</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tab === 'pending'
                      ? 'No reviews awaiting moderation'
                      : `No reviews with ${tab} status${hasActiveFilters ? ' match the current filters' : ''}`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {visibleReviews.map((review) => {
                  const isChecked = selectedIds.has(review.id);
                  return (
                    <Card
                      key={review.id}
                      className={cn(
                        "transition-shadow hover:shadow-md",
                        isChecked && "ring-1 ring-primary/40 bg-primary/[0.02]"
                      )}
                    >
                      <CardHeader className="flex flex-row items-start gap-3">
                        {canModerateReviews && (
                          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleSelect(review.id)}
                              aria-label={`Select review by ${review.reviewer_name}`}
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedReview(review)}
                          className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          aria-label={`Open detail for review of ${review.facility_name}`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="space-y-2 min-w-0">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium truncate">{review.facility_name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{review.reviewer_name || 'Verified Reviewer'}</p>
                                    {(review.reviewer_city || review.reviewer_state) && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {[review.reviewer_city, review.reviewer_state].filter(Boolean).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <StarRating rating={review.rating} />
                                <span className="text-sm text-muted-foreground tabular-nums">
                                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                </span>
                                {review.disputed && (
                                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                                    <Flag className="h-2.5 w-2.5 mr-0.5" />
                                    Disputed
                                  </Badge>
                                )}
                                {review.review_request_id && (
                                  // Token-submitted reviews originated from the
                                  // provider's "Request a review" invite flow.
                                  // Moderators tend to approve these faster
                                  // because the facility itself vouched for
                                  // the customer.
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
                                    title="Submitted via a provider's review-request invitation"
                                  >
                                    Invited
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                review.status === 'approved' ? 'default' :
                                review.status === 'rejected' ? 'destructive' :
                                'secondary'
                              }
                              className="capitalize shrink-0"
                            >
                              {review.status}
                            </Badge>
                          </div>
                        </button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {review.review_text ? (
                          <p className="text-sm bg-muted/50 p-3 rounded-lg">{review.review_text}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No review text provided</p>
                        )}

                        {review.status === 'pending' && canModerateReviews && (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Admin notes (required for rejection)"
                              value={adminNotes[review.id] || ''}
                              onChange={(e) => setAdminNotes((prev) => ({ ...prev, [review.id]: e.target.value.slice(0, 2000) }))}
                              rows={2}
                              maxLength={2000}
                            />
                            <div className="flex items-center gap-2 flex-wrap">
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
                        {review.status === 'pending' && !canModerateReviews && (
                          <p className="text-xs text-muted-foreground italic">Only Managers and Super Admins can approve or reject reviews.</p>
                        )}

                        {review.admin_notes && review.status !== 'pending' && (
                          <div className="text-sm">
                            <span className="font-medium">Admin Notes: </span>
                            <span className="text-muted-foreground">{review.admin_notes}</span>
                          </div>
                        )}

                        {review.status !== 'pending' && canModerateReviews && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {(review.status === 'hidden' || review.status === 'rejected') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleRestore(review.id)}
                                disabled={processingId === review.id}
                                aria-label={`Restore review by ${review.reviewer_name} to visible`}
                              >
                                {processingId === review.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                Restore to visible
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({ id: review.id })}
                              disabled={processingId === review.id}
                              aria-label={`Delete review by ${review.reviewer_name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Delete Review
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <PaginationFooter
              page={reviewsPagination.page}
              pageSize={reviewsPagination.pageSize}
              totalPages={reviewsPagination.totalPages}
              totalItems={filteredReviews.length}
              onPageChange={reviewsPagination.setPage}
              onPageSizeChange={reviewsPagination.setPageSize}
              itemLabel="review"
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone. Any related dispute records will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!!processingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingId === deleteConfirm?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk action dialog */}
      {bulkAction && (
        <BulkReviewModerationDialog
          open={!!bulkAction}
          onOpenChange={(open) => !open && setBulkAction(null)}
          action={bulkAction}
          selectedIds={selectedIds}
          onSuccess={() => {
            setSelectedIds(new Set());
            invalidateAll();
          }}
        />
      )}

      {/* Review Detail Modal */}
      <ReviewDetailModal
        review={selectedReview}
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
        onRefresh={invalidateAll}
      />
    </div>
  );
}
