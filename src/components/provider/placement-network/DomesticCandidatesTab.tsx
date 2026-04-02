import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  MapPin,
  Clock,
  Users,
  UserCheck,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hourglass,
  ArrowRight,
} from "lucide-react";
import { IntroductionCard } from "./IntroductionCard";
import { PlacementDetailModal } from "./PlacementDetailModal";

// Proper type definitions for type safety
interface ConciergeInquiry {
  id: string;
  user_name?: string;
  level_of_care?: string | null;
  payment_type?: string | null;
  timeline_urgency?: string | null;
  preferred_state?: string | null;
  preferred_city?: string | null;
  status?: string;
  age_range?: string | null;
  gender?: string | null;
  primary_concern?: string | null;
  insurance_carrier?: string | null;
  detox_needed?: string | null;
  co_occurring_concerns?: unknown | null;
  substance_use_duration?: string | null;
  budget_range?: string | null;
  seeker_confirmed?: boolean;
  seeker_confirmed_at?: string | null;
  placement_confirmed?: boolean;
  placement_confirmed_at?: string | null;
  placed_facility_id?: string | null;
}

interface Introduction {
  id: string;
  facility_id: string;
  inquiry_id: string;
  created_at: string;
  provider_response?: string | null;
  provider_responded_at?: string | null;
  provider_notes?: string | null;
  concierge_inquiries?: ConciergeInquiry | null;
}

interface DomesticCandidatesTabProps {
  hasPro?: boolean;
}

export function DomesticCandidatesTab({ hasPro = false }: DomesticCandidatesTabProps) {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();

  // Fetch pending introductions from concierge system with proper error handling
  const { data: introductions, isLoading, error, refetch } = useQuery({
    queryKey: ["placement-introductions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(
          `
          id,
          facility_id,
          inquiry_id,
          created_at,
          provider_response,
          provider_responded_at,
          provider_notes,
          concierge_inquiries (
            id, user_name, level_of_care, payment_type, timeline_urgency, preferred_state,
            preferred_city, status, age_range, gender, primary_concern, insurance_carrier,
            detox_needed, co_occurring_concerns, substance_use_duration, budget_range,
            seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at, placed_facility_id
          )
        `
        )
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DomesticCandidatesTab] Query error:", error.message);
        throw new Error(`Failed to load introductions: ${error.message}`);
      }
      
      return (data || []) as Introduction[];
    },
    enabled: !!selectedFacility?.id,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });

  // Realtime: auto-refresh when introductions or case status change
  useEffect(() => {
    if (!selectedFacility?.id) return;

    const channel = supabase
      .channel(`provider-intros-${selectedFacility.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "concierge_introductions",
          filter: `facility_id=eq.${selectedFacility.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["placement-introductions", selectedFacility.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedFacility?.id, queryClient]);

  const respondMutation = useMutation({
    mutationFn: async ({ id, response, notes }: { id: string; response: string; notes?: string }) => {
      // Validate inputs
      if (!id || typeof id !== "string") {
        throw new Error("Invalid introduction ID");
      }
      if (!["interested", "not_available"].includes(response)) {
        throw new Error("Invalid response value");
      }

      // First verify the introduction hasn't already been responded to (race condition guard)
      const { data: current } = await supabase
        .from("concierge_introductions")
        .select("provider_response, concierge_inquiries(status)")
        .eq("id", id)
        .eq("facility_id", selectedFacility?.id)
        .maybeSingle();

      if (current?.provider_response && current.provider_response !== "pending") {
        throw new Error("You've already responded to this candidate");
      }

      const caseStatus = (current?.concierge_inquiries as any)?.status;
      if (caseStatus === "closed" || caseStatus === "placed") {
        throw new Error("This case is no longer active");
      }

      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          provider_notes: notes?.trim() || null,
        })
        .eq("id", id)
        .eq("facility_id", selectedFacility?.id); // Security: ensure facility ownership

      if (error) {
        console.error("[DomesticCandidatesTab] Respond error:", error.message);
        throw new Error(`Failed to submit response: ${error.message}`);
      }

      // Get the inquiry_id for this introduction
      const intro = introductions?.find((i) => i.id === id);
      const inquiryId = intro?.inquiry_id;

      if (inquiryId && response === "interested") {
        // Trigger auto-status-transition: introductions_sent → in_contact
        try {
          await supabase.functions.invoke("auto-status-transition", {
            body: {
              inquiryId,
              trigger: "provider_interested",
              actorType: "provider",
            },
          });
        } catch (transitionError) {
          console.error("[DomesticCandidatesTab] Status transition error:", transitionError);
        }

        // Notify admin that a provider has accepted
        try {
          await supabase.functions.invoke("send-concierge-notifications", {
            body: {
              type: "provider_interested",
              inquiryId,
              facilityId: selectedFacility?.id,
            },
          });
        } catch (notifError) {
          console.error("[DomesticCandidatesTab] Notification error:", notifError);
        }
      }

      // Notify admin that a provider has declined
      if (inquiryId && response === "not_available") {
        try {
          await supabase.functions.invoke("send-concierge-notifications", {
            body: {
              type: "provider_declined",
              inquiryId,
              facilityId: selectedFacility?.id,
            },
          });
        } catch (notifError) {
          console.error("[DomesticCandidatesTab] Decline notification error:", notifError);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["placement-introductions"] });
      const action = variables.response === "interested" ? "accepted" : "declined";
      toast.success(`Candidate ${action} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit response");
    },
  });

  // Safely filter introductions with null checks
  const pendingIntroductions =
    introductions?.filter((i) => !i.provider_response || i.provider_response === "pending") || [];

  // Placements confirmed by admin (status = placed with this facility)
  const confirmedPlacements =
    introductions?.filter(
      (i) =>
        i.concierge_inquiries?.placement_confirmed === true &&
        i.concierge_inquiries?.placed_facility_id === selectedFacility?.id
    ) || [];

  const confirmedIds = new Set(confirmedPlacements.map((i) => i.id));

  // Active placements: provider accepted, not yet confirmed by admin, case still active
  const activePlacements = introductions?.filter(
    (i) =>
      i.provider_response === "interested" &&
      !confirmedIds.has(i.id) &&
      i.concierge_inquiries?.status !== "closed" &&
      i.concierge_inquiries?.status !== "placed"
  ) || [];

  const activeIds = new Set(activePlacements.map((i) => i.id));

  // Declined or completed past responses (not active, not confirmed)
  const respondedIntroductions = introductions?.filter(
    (i) =>
      i.provider_response &&
      i.provider_response !== "pending" &&
      !confirmedIds.has(i.id) &&
      !activeIds.has(i.id)
  ) || [];

  const acceptedCount = (introductions?.filter((i) => i.provider_response === "interested") || []).length;
  const declinedCount = (introductions?.filter((i) => i.provider_response === "not_available") || []).length;

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium">Failed to load candidates</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Domestic Placements Header */}
      <Card className="bg-gradient-to-r from-blue-500/5 to-blue-600/10 border-blue-500/20">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">U.S. Client Placements</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Pre-qualified domestic clients seeking treatment. All candidates have been screened by our
                placement advisors to ensure a good fit.
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-bold text-blue-600">
                {hasPro ? "$800" : "$1,000"}
              </p>
              <p className="text-xs text-muted-foreground">per confirmed admission</p>
              {hasPro && (
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Pro: Save $200</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">{pendingIntroductions.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold">{acceptedCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{declinedCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Confirmed Placements - Show success state */}
      {confirmedPlacements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            Confirmed Admissions
            <Badge variant="default" className="bg-emerald-500">
              {confirmedPlacements.length}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground -mt-1">
            These placements have been confirmed by RehabLookup. Thank you for working with us!
          </p>
          <div className="grid gap-3">
            {confirmedPlacements.slice(0, 3).map((intro) => (
              <Card key={`confirmed-${intro.id}`} className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="bg-emerald-500">
                        <CheckCircle className="h-3 w-3 mr-1" /> Placed
                      </Badge>
                      <span className="text-sm font-medium">
                        Case #{intro.concierge_inquiries?.id?.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {intro.concierge_inquiries?.placement_confirmed_at &&
                        format(new Date(intro.concierge_inquiries.placement_confirmed_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Introductions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Pending Candidates
          {pendingIntroductions.length > 0 && (
            <Badge variant="destructive">{pendingIntroductions.length} new</Badge>
          )}
        </h3>

        {pendingIntroductions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No pending domestic candidates</p>
              <p className="text-sm text-muted-foreground mt-1">
                When U.S. clients are matched to your facility, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingIntroductions.map((intro) => (
              <IntroductionCard
                key={intro.id}
                introduction={intro}
                facilityId={selectedFacility?.id || ""}
                onRespond={(response, notes) => respondMutation.mutate({ id: intro.id, response, notes })}
                isResponding={respondMutation.isPending}
                hasPro={hasPro}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Placements - Accepted, awaiting admin confirmation */}
      {activePlacements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-amber-500" />
            Active — Awaiting Confirmation
            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
              {activePlacements.length}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground -mt-1">
            You accepted these candidates. Our placement team is coordinating next steps and will confirm the admission.
          </p>
          <div className="grid gap-3">
            {activePlacements.map((intro) => (
              <motion.div
                key={`active-${intro.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                          <Clock className="h-3 w-3 mr-1" /> In Progress
                        </Badge>
                        <span className="text-sm font-medium">
                          Case #{intro.concierge_inquiries?.id?.slice(0, 8).toUpperCase() ||
                            intro.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          Accepted {intro.provider_responded_at &&
                            format(new Date(intro.provider_responded_at), "MMM d")}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-700/80 dark:text-amber-400/80 bg-amber-100/50 dark:bg-amber-900/20 rounded-md px-3 py-2">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span>Our advisor is coordinating with the client. You'll be notified once admission is confirmed.</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Past Responses */}
      {respondedIntroductions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground">Past Responses</h3>
          <div className="grid gap-3">
            {respondedIntroductions.slice(0, 5).map((intro) => (
              <Card key={intro.id} className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={intro.provider_response === "interested" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {intro.provider_response === "interested" ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" /> Accepted
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" /> Declined
                          </>
                        )}
                      </Badge>
                      <span className="text-sm">
                        Case #{intro.concierge_inquiries?.id?.slice(0, 8).toUpperCase() ||
                          intro.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {intro.provider_responded_at &&
                        format(new Date(intro.provider_responded_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
