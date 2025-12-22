import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Building2,
  Loader2,
  RefreshCw
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
  user_email?: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const fetchReviews = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('facility_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
      setIsLoading(false);
      return;
    }

    // Fetch facility names
    const facilityIds = [...new Set(data?.map(r => r.facility_id) || [])];
    const { data: facilities } = await supabase
      .from('facilities')
      .select('id, name')
      .in('id', facilityIds);

    const facilityMap = new Map(facilities?.map(f => [f.id, f.name]) || []);

    const enrichedReviews: ReviewWithDetails[] = (data || []).map(review => ({
      ...review,
      facility_name: facilityMap.get(review.facility_id) || 'Unknown Facility'
    }));

    setReviews(enrichedReviews);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (reviewId: string) => {
    setProcessingId(reviewId);
    
    const { error } = await supabase
      .from('facility_reviews')
      .update({ 
        status: 'approved',
        admin_notes: adminNotes[reviewId] || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    setProcessingId(null);

    if (error) {
      toast.error('Failed to approve review');
    } else {
      toast.success('Review approved');
      fetchReviews();
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
        reviewed_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    setProcessingId(null);

    if (error) {
      toast.error('Failed to reject review');
    } else {
      toast.success('Review rejected');
      fetchReviews();
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setProcessingId(reviewId);
    
    const { error } = await supabase
      .from('facility_reviews')
      .delete()
      .eq('id', reviewId);

    setProcessingId(null);

    if (error) {
      toast.error('Failed to delete review');
    } else {
      toast.success('Review deleted');
      fetchReviews();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Moderation</h1>
          <p className="text-muted-foreground">Manage user reviews for facilities</p>
        </div>
        <Button variant="outline" onClick={fetchReviews} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Approved ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({rejectedCount})
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
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No {selectedTab} reviews</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{review.facility_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-4 w-4",
                                  star <= review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
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
                        Delete Review
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
