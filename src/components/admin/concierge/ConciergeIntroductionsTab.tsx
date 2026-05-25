import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OriginatingFacilityBanner } from "./OriginatingFacilityBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { getCaseEventActorType } from "@/lib/caseEventActor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, CheckCircle, XCircle, MessageSquare, Loader2, Eye, Shield } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { SendIntroductionsBatchAction } from "./SendIntroductionsBatchAction";
import { PlacementPartnerBadge } from "./PlacementPartnerBadge";
import { useFacilityPartnerStatus } from "@/hooks/useFacilityPartnerStatus";

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
  const { adminRole } = useAdminAuth();
  const [disclosingTo, setDisclosingTo] = useState<string | null>(null);
  const [confirmDiscloseId, setConfirmDiscloseId] = useState<string | null>(null);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<Set<string>>(new Set());

  // Clinical criteria snapshot for the EKRA audit + partner-status geo match.
  const clinicalCriteria = useMemo(
    () => ({
      geo_state: caseData.preferred_state ?? caseData.desired_location_state ?? null,
      geo_city: caseData.preferred_city ?? caseData.desired_location_city ?? null,
      level_of_care: caseData.level_of_care ?? null,
      insurance: caseData.insurance_carrier ?? null,
      primary_concern: caseData.primary_concern ?? null,
    }),
    [
      caseData.preferred_state,
      caseData.desired_location_state,
      caseData.preferred_city,
      caseData.desired_location_city,
      caseData.level_of_care,
      caseData.insurance_carrier,
      caseData.primary_concern,
    ],
  );

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

  // Partner status for every available facility — drives the badge in the
  // selection list and feeds the EKRA audit on the batch send.
  const { data: partnerSet } = useFacilityPartnerStatus({
    facilityIds: (availableFacilities ?? []).map((f) => f.id),
    seekerState: clinicalCriteria.geo_state,
    seekerCity: clinicalCriteria.geo_city,
  });
  const partners = partnerSet ?? new Set<string>();

  const surfacedCandidates = useMemo(
    () =>
      (availableFacilities ?? []).map((f) => ({
        facility_id: f.id,
        facility_name: f.name,
        facility_summary: [f.city, f.state].filter(Boolean).join(", "),
      })),
    [availableFacilities],
  );
  const selectedCandidates = useMemo(
    () => surfacedCandidates.filter((c) => selectedFacilityIds.has(c.facility_id)),
    [surfacedCandidates, selectedFacilityIds],
  );

  const toggleFacilitySelection = (facilityId: string) => {
    setSelectedFacilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(facilityId)) next.delete(facilityId);
      else if (next.size < 10) next.add(facilityId);
      else toast.warning("You can select at most 10 facilities per batch.");
      return next;
    });
  };

  const handleBatchCompleted = async () => {
    // Mirror the per-facility flow's side-effects so other tabs / case state
    // stay in sync. The audit row and email sends were already issued by the
    // batch action itself.
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.functions.invoke("auto-status-transition", {
      body: {
        inquiryId: caseData.id,
        trigger: "introduction_sent",
        actorId: user?.id,
        actorType: getCaseEventActorType(adminRole),
      },
    });

    const sentCount = selectedFacilityIds.size;
    const priorCount = caseData.introductions_sent_count || 0;
    await supabase
      .from("concierge_inquiries")
      .update({ introductions_sent_count: priorCount + sentCount })
      .eq("id", caseData.id);

    // Send the "introductions sent" notification to the seeker. The
    // intros themselves were already issued by the batch action +
    // per-facility email send (above), so a failure here is a soft
    // warning: the facilities were emailed, but the seeker didn't get
    // their "we sent intros on your behalf" confirmation.
    try {
      const { data: notifData, error: notifErr } = await supabase.functions.invoke("send-concierge-notifications", {
        body: { type: "introductions_sent", inquiryId: caseData.id },
      });
      if (notifErr || notifData?.error) {
        const msg = (notifErr as Error | null)?.message || notifData?.error || "Unknown error";
        toast.warning(`Introductions sent, but seeker notification failed: ${msg}`);
      }
    } catch (notifErr) {
      const msg = notifErr instanceof Error ? notifErr.message : "Unknown error";
      toast.warning(`Introductions sent, but seeker notification failed: ${msg}`);
    }

    setSelectedFacilityIds(new Set());
    refetchIntros();
    onRefresh();
  };

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

      // If interested, trigger auto-status transition with granular actor.
      if (response === "interested") {
        await supabase.functions.invoke("auto-status-transition", {
          body: {
            inquiryId: caseData.id,
            trigger: "provider_interested",
            actorType: getCaseEventActorType(adminRole),
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
        actor_type: getCaseEventActorType(adminRole),
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

  // Free-tier-redirect inquiries pin the originating facility as
  // Option 1 of the 3 introductions. The banner shows the advisor
  // exactly which facility and flags any clinical mismatch with the
  // seeker's intake.
  const isFreeTierRedirect = (caseData as { routing_mode?: string | null }).routing_mode === "free_tier_redirect";
  const originatingFacilityId = (caseData as { originating_facility_id?: string | null }).originating_facility_id ?? null;
  const intakeForBanner = ((caseData as { intake_data?: Record<string, unknown> | null }).intake_data ?? {}) as {
    level_of_care?: string | null;
    insurance_provider?: string | null;
    insurance_type?: string | null;
    location_state?: string | null;
  };

  return (
    <div className="space-y-4">
      {isFreeTierRedirect && originatingFacilityId && (
        <OriginatingFacilityBanner
          originatingFacilityId={originatingFacilityId}
          intake={intakeForBanner}
        />
      )}

      {/* Select facilities to introduce */}
      {availableFacilities && availableFacilities.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">
              Select facilities to introduce
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Choose up to 10. You'll confirm the EKRA non-partner consideration
              before sending.
            </p>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {availableFacilities.map((facility) => {
                const isPartner = partners.has(facility.id);
                const isChecked = selectedFacilityIds.has(facility.id);
                return (
                  <label
                    key={facility.id}
                    htmlFor={`intro-facility-${facility.id}`}
                    className="flex items-center justify-between gap-3 p-2 border rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        id={`intro-facility-${facility.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleFacilitySelection(facility.id)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{facility.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {facility.city}, {facility.state}
                        </p>
                      </div>
                    </div>
                    {isPartner ? (
                      <PlacementPartnerBadge />
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Non-partner
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch send + EKRA audit confirmation */}
      {selectedCandidates.length > 0 && (
        <SendIntroductionsBatchAction
          inquiryId={caseData.id}
          selected={selectedCandidates}
          surfaced={surfacedCandidates}
          clinicalCriteria={clinicalCriteria}
          onCompleted={handleBatchCompleted}
        />
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
                          {(intro.facility as { name?: string; city?: string; state?: string } | null)?.name || "Unknown Facility"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {(intro.facility as { name?: string; city?: string; state?: string } | null)?.city}, {(intro.facility as { name?: string; city?: string; state?: string } | null)?.state}
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
                          disabled={updateResponseMutation.isPending}
                          onValueChange={(value) => {
                            if (value === (intro.provider_response || "pending")) return;
                            updateResponseMutation.mutate({
                              introId: intro.id,
                              response: value,
                            });
                          }}
                        >
                          <SelectTrigger className="w-32 h-8" aria-label="Provider response">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="interested">Accepted</SelectItem>
                            <SelectItem value="not_available">Declined</SelectItem>
                            <SelectItem value="no_response">No Response</SelectItem>
                          </SelectContent>
                        </Select>
                        {updateResponseMutation.isPending && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
                        )}
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
                                onClick={() => setConfirmDiscloseId(intro.id)}
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

      {/* Confirm before disclosing PII — irreversible, writes the disclosure
          audit log and reveals the seeker's name/email/phone to the facility. */}
      <AlertDialog
        open={!!confirmDiscloseId}
        onOpenChange={(o) => {
          if (!o && !disclosePIIMutation.isPending) setConfirmDiscloseId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disclose patient info to this facility?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This reveals the client's name, email, and phone to the facility and is
              logged for compliance. It can't be undone. Only disclose after the
              provider has confirmed interest and you've verified the match.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disclosePIIMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDiscloseId) disclosePIIMutation.mutate(confirmDiscloseId);
              }}
              disabled={disclosePIIMutation.isPending}
              className="gap-2"
            >
              {disclosePIIMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Disclose patient info
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
