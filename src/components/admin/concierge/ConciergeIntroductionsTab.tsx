import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Clock, CheckCircle, XCircle, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];
type ConciergeIntroduction = Database["public"]["Tables"]["concierge_introductions"]["Row"];

interface ConciergeIntroductionsTabProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
}

const RESPONSE_STATUS = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" as const },
  interested: { label: "Interested", icon: CheckCircle, variant: "default" as const },
  declined: { label: "Declined", icon: XCircle, variant: "destructive" as const },
  no_response: { label: "No Response", icon: Clock, variant: "outline" as const },
};

export function ConciergeIntroductionsTab({ caseData, onRefresh }: ConciergeIntroductionsTabProps) {
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Fetch introductions for this inquiry
  const { data: introductions, isLoading, refetch: refetchIntros } = useQuery({
    queryKey: ["concierge-introductions", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          *,
          facility:facilities(id, name, city, state)
        `)
        .eq("inquiry_id", caseData.id)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch matched facilities that haven't been introduced yet
  const { data: availableFacilities } = useQuery({
    queryKey: ["available-introductions", caseData.id, caseData.matched_facility_ids],
    queryFn: async () => {
      if (!caseData.matched_facility_ids?.length) return [];

      const { data: existingIntros } = await supabase
        .from("concierge_introductions")
        .select("facility_id")
        .eq("inquiry_id", caseData.id);

      const existingIds = existingIntros?.map((i) => i.facility_id) || [];
      const availableIds = caseData.matched_facility_ids.filter(
        (id) => !existingIds.includes(id)
      );

      if (availableIds.length === 0) return [];

      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .in("id", availableIds);

      if (error) throw error;
      return data;
    },
    enabled: !!caseData.matched_facility_ids?.length,
  });

  // Send introduction mutation
  const sendIntroMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      setSendingTo(facilityId);

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("concierge_introductions").insert({
        inquiry_id: caseData.id,
        facility_id: facilityId,
        sent_by: user?.id,
      });

      if (error) throw error;

      // Update the inquiry status and intro count
      await supabase
        .from("concierge_inquiries")
        .update({
          status: "introductions_sent",
          introductions_sent_at: new Date().toISOString(),
          introductions_sent_count: (caseData.introductions_sent_count || 0) + 1,
        })
        .eq("id", caseData.id);
    },
    onSuccess: () => {
      toast.success("Introduction sent successfully");
      refetchIntros();
      onRefresh();
      setSendingTo(null);
    },
    onError: (error) => {
      toast.error("Failed to send introduction: " + error.message);
      setSendingTo(null);
    },
  });

  // Update response mutation
  const updateResponseMutation = useMutation({
    mutationFn: async ({
      introId,
      response,
      notes,
    }: {
      introId: string;
      response: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          provider_notes: notes,
        })
        .eq("id", introId);

      if (error) throw error;

      // If interested, update inquiry status
      if (response === "interested") {
        await supabase
          .from("concierge_inquiries")
          .update({ status: "in_contact" })
          .eq("id", caseData.id);
      }
    },
    onSuccess: () => {
      toast.success("Response updated");
      refetchIntros();
      onRefresh();
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  return (
    <div className="space-y-4">
      {/* Send New Introduction */}
      {availableFacilities && availableFacilities.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Send Introduction</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {availableFacilities.map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{facility.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {facility.city}, {facility.state}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => sendIntroMutation.mutate(facility.id)}
                    disabled={sendingTo === facility.id}
                  >
                    {sendingTo === facility.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sent Introductions */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Sent Introductions ({introductions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : !introductions?.length ? (
            <div className="text-center py-4 text-muted-foreground">
              No introductions sent yet
            </div>
          ) : (
            <div className="space-y-3">
              {introductions.map((intro) => {
                const status = RESPONSE_STATUS[intro.provider_response as keyof typeof RESPONSE_STATUS] || RESPONSE_STATUS.pending;
                const StatusIcon = status.icon;

                return (
                  <div key={intro.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">
                          {(intro.facility as any)?.name || "Unknown Facility"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {(intro.facility as any)?.city}, {(intro.facility as any)?.state}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sent: {format(new Date(intro.sent_at), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>

                    {/* Response Controls */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Provider Response:</span>
                        <Select
                          value={intro.provider_response || "pending"}
                          onValueChange={(value) =>
                            updateResponseMutation.mutate({
                              introId: intro.id,
                              response: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="interested">Interested</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                            <SelectItem value="no_response">No Response</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {intro.provider_notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          {intro.provider_notes}
                        </p>
                      )}

                      {intro.seeker_contacted && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ Seeker contacted at{" "}
                          {intro.seeker_contacted_at &&
                            format(new Date(intro.seeker_contacted_at), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
