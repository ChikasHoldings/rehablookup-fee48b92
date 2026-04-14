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
import { Send, Clock, CheckCircle, XCircle, MessageSquare, Loader2, Eye, EyeOff, Shield } from "lucide-react";
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
  interested: { label: "Accepted", icon: CheckCircle, variant: "default" as const },
  not_available: { label: "Declined", icon: XCircle, variant: "destructive" as const },
  declined: { label: "Declined", icon: XCircle, variant: "destructive" as const },
  no_response: { label: "No Response", icon: Clock, variant: "outline" as const },
};

export function ConciergeIntroductionsTab({ caseData, onRefresh }: ConciergeIntroductionsTabProps) {
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [disclosingTo, setDisclosingTo] = useState<string | null>(null);

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
  // Merge both matched lists for complete facility coverage
  const allMatchedFacilityIds = [
    ...new Set([
      ...(caseData.matched_facility_ids || []),
      ...(caseData.admin_matched_facility_ids || []),
    ])
  ];

  const { data: availableFacilities } = useQuery({
    queryKey: ["available-introductions", caseData.id, allMatchedFacilityIds],
    queryFn: async () => {
      if (!allMatchedFacilityIds.length) return [];

      const { data: existingIntros } = await supabase
        .from("concierge_introductions")
        .select("facility_id")
        .eq("inquiry_id", caseData.id);

      const existingIds = existingIntros?.map((i) => i.facility_id) || [];
      const availableIds = allMatchedFacilityIds.filter(
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
    enabled: allMatchedFacilityIds.length > 0,
  });

  // Send introduction mutation
  const sendIntroMutation = useMutation({
    mutationFn: async (facilityId: string) => {
      setSendingTo(facilityId);

      const { data: { user } } = await supabase.auth.getUser();

      // Duplicate guard: check if intro already exists for this facility
      const { data: existingIntro } = await supabase
        .from("concierge_introductions")
        .select("id")
        .eq("inquiry_id", caseData.id)
        .eq("facility_id", facilityId)
        .maybeSingle();

      if (existingIntro) {
        throw new Error("An introduction has already been sent to this facility.");
      }

      // Create introduction record
      const { data: introData, error } = await supabase
        .from("concierge_introductions")
        .insert({
          inquiry_id: caseData.id,
          facility_id: facilityId,
          sent_by: user?.id,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger auto-status transition for introduction sent
      await supabase.functions.invoke("auto-status-transition", {
        body: {
          inquiryId: caseData.id,
          trigger: "introduction_sent",
          actorId: user?.id,
          actorType: "admin",
        },
      });

      // Update the intro count manually
      await supabase
        .from("concierge_inquiries")
        .update({
          introductions_sent_count: (caseData.introductions_sent_count || 0) + 1,
        })
        .eq("id", caseData.id);

      // Send email notification to facility
      try {
        const response = await supabase.functions.invoke("send-concierge-introduction", {
          body: {
            inquiryId: caseData.id,
            facilityId: facilityId,
            introductionId: introData.id,
          },
        });

        if (response.error) {
          console.error("Email notification failed:", response.error);
        }
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }

      // Notify the seeker that introductions are being sent
      try {
        await supabase.functions.invoke("send-concierge-notifications", {
          body: {
            type: "introductions_sent",
            inquiryId: caseData.id,
          },
        });
      } catch (notifError) {
        console.error("Failed to send seeker notification:", notifError);
      }
    },
    onSuccess: () => {
      toast.success("Introduction sent and facility notified");
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

      // If interested, trigger auto-status transition
      if (response === "interested") {
        await supabase.functions.invoke("auto-status-transition", {
          body: {
            inquiryId: caseData.id,
            trigger: "provider_interested",
            actorType: "admin",
          },
        });
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

  // Disclose PII mutation - admin-only action to share patient info with facility
  const disclosePIIMutation = useMutation({
    mutationFn: async (introId: string) => {
      setDisclosingTo(introId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get introduction details for audit logging
      const intro = introductions?.find((i) => i.id === introId);
      const facility = intro?.facility as { id: string; name: string } | undefined;

      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          admin_disclosed_pii_at: new Date().toISOString(),
          disclosed_by_admin_id: user.id,
        })
        .eq("id", introId);

      if (error) throw error;

      // Log the disclosure event to case events
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseData.id,
        event_type: "pii_disclosed",
        event_data: { introduction_id: introId },
        actor_id: user.id,
        actor_type: "admin",
      });

      // Log to PII disclosure audit table for compliance tracking
      await supabase.from("pii_disclosure_log").insert({
        disclosure_type: "concierge_introduction",
        reference_id: introId,
        admin_user_id: user.id,
        client_name: caseData.user_name,
        client_email: caseData.user_email,
        client_phone: caseData.user_phone,
        facility_id: facility?.id,
        facility_name: facility?.name,
        reason: `Admin disclosed PII for concierge case ${caseData.id}`,
        metadata: {
          inquiry_id: caseData.id,
          primary_concern: caseData.primary_concern,
        },
      });
    },
    onSuccess: () => {
      toast.success("Patient info disclosed to facility");
      refetchIntros();
      onRefresh();
      setDisclosingTo(null);
    },
    onError: (error) => {
      toast.error("Failed to disclose: " + error.message);
      setDisclosingTo(null);
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
                          Sent: {intro.sent_at ? format(new Date(intro.sent_at), "MMM d, yyyy h:mm a") : format(new Date(intro.created_at || Date.now()), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>

                    {/* Response Controls */}
                    <div className="mt-3 pt-3 border-t space-y-3">
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
                            <SelectItem value="interested">Accepted</SelectItem>
                            <SelectItem value="not_available">Declined</SelectItem>
                            <SelectItem value="no_response">No Response</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* PII Disclosure Control - Only show when provider accepted */}
                      {intro.provider_response === "interested" && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                          {intro.admin_disclosed_pii_at ? (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <Eye className="h-4 w-4" />
                              <span className="text-sm">
                                PII disclosed {format(new Date(intro.admin_disclosed_pii_at), "MMM d, h:mm a")}
                              </span>
                            </div>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 text-amber-600" />
                              <span className="text-sm text-amber-800 dark:text-amber-200 flex-1">
                                Patient info is hidden from facility
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => disclosePIIMutation.mutate(intro.id)}
                                disabled={disclosingTo === intro.id}
                                className="gap-1"
                              >
                                {disclosingTo === intro.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                                Disclose PII
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {intro.provider_notes && (
                        <p className="text-sm p-2 bg-muted rounded">
                          {intro.provider_notes}
                        </p>
                      )}

                      {intro.seeker_contacted && (
                        <p className="text-xs text-green-600">
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
