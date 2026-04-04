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
        .select('id, facility_id, sender_user_id, recipient_name, recipient_email, status, sent_at, opened_at, clicked_at, review_submitted_at, resend_id, created_at, updated_at')
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
      console.log('[useReviewRequests] Sending review request:', { facilityId, recipientName, recipientEmail: recipientEmail.trim().toLowerCase() });
      
      const { data, error } = await supabase.functions.invoke('send-review-request', {
        body: {
          facilityId,
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim().toLowerCase(),
        },
      });

      console.log('[useReviewRequests] Response:', { data, error });

      // Handle edge function invocation errors
      if (error) {
        console.error('[useReviewRequests] Invocation error:', error);
        
        // Try to extract a better error message from the error
        let errorMessage = "Could not send review request";
        
        // The error might contain the response body with our custom error
        if (error.message) {
          try {
            // Sometimes the error message is JSON
            const parsed = JSON.parse(error.message);
            if (parsed.error) {
              errorMessage = parsed.error;
            }
          } catch {
            // If not JSON, check if it contains our error text
            if (error.message.includes("already sent")) {
              errorMessage = "A review request was already sent to this email within the last 30 days";
            } else {
              errorMessage = error.message;
            }
          }
        }
        
        toast({
          title: "Failed to send",
          description: errorMessage,
          variant: "destructive",
        });
        return { error };
      }

      // Handle application-level errors in the response data
      if (data?.error) {
        console.log('[useReviewRequests] Application error:', data.error);
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
    } catch (unexpectedError) {
      console.error('[useReviewRequests] Unexpected error:', unexpectedError);
      toast({
        title: "Failed to send",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { error: unexpectedError };
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
