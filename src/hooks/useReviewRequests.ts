import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface ReviewRequest {
  id: string;
  facility_id: string;
  sender_user_id: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  review_submitted_at: string | null;
  created_at: string;
}

export function useReviewRequests(facilityId: string | null) {
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    if (!facilityId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('review_requests')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching review requests:', error);
      } else {
        setRequests(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const sendReviewRequest = async (recipientName: string, recipientEmail: string) => {
    if (!facilityId) {
      toast({
        title: "Error",
        description: "No facility selected",
        variant: "destructive",
      });
      return { error: new Error('No facility selected') };
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-review-request', {
        body: {
          facilityId,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
        },
      });

      if (error) {
        console.error('Error sending review request:', error);
        toast({
          title: "Failed to send",
          description: error.message || "Could not send review request",
          variant: "destructive",
        });
        return { error };
      }

      if (data?.error) {
        toast({
          title: "Could not send",
          description: data.error,
          variant: "destructive",
        });
        return { error: new Error(data.error) };
      }

      toast({
        title: "Review request sent",
        description: `An invitation was sent to ${recipientEmail}`,
      });

      // Refresh the list
      fetchRequests();
      return { data };
    } finally {
      setIsSending(false);
    }
  };

  const stats = {
    total: requests.length,
    sent: requests.filter(r => r.status === 'sent').length,
    opened: requests.filter(r => r.opened_at).length,
    clicked: requests.filter(r => r.clicked_at).length,
    converted: requests.filter(r => r.review_submitted_at).length,
  };

  return {
    requests,
    isLoading,
    isSending,
    sendReviewRequest,
    refetch: fetchRequests,
    stats,
  };
}
