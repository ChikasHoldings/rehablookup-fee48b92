import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  User, 
  Clock, 
  MapPin, 
  Heart, 
  DollarSign, 
  Calendar,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ProviderConfirmPlacementModal } from "./ProviderConfirmPlacementModal";

interface ConciergeIntroduction {
  id: string;
  inquiry_id: string;
  facility_id: string;
  sent_at: string | null;
  provider_response: string | null;
  provider_responded_at: string | null;
  provider_notes: string | null;
  seeker_contacted: boolean | null;
  seeker_contacted_at: string | null;
  created_at: string;
  concierge_inquiries?: {
    id: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    status: string;
    level_of_care: string | null;
    payment_type: string | null;
    insurance_carrier: string | null;
    timeline_urgency: string | null;
    preferred_state: string | null;
    preferred_city: string | null;
    primary_concern: string | null;
    gender: string | null;
    age_range: string | null;
    seeker_confirmed: boolean | null;
    seeker_confirmed_at: string | null;
    placement_confirmed: boolean | null;
    placed_facility_id: string | null;
  };
}

interface ConciergeIntroductionCardProps {
  introduction: ConciergeIntroduction;
  facilityId: string;
  hasPro?: boolean;
}

export function ConciergeIntroductionCard({ introduction, facilityId, hasPro = false }: ConciergeIntroductionCardProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const inquiry = introduction.concierge_inquiries;
  const isPending = !introduction.provider_response || introduction.provider_response === "pending";
  const isAccepted = introduction.provider_response === "interested";
  const isDeclined = introduction.provider_response === "declined";
  
  // Check if this facility should show the confirm button
  const seekerConfirmedThisFacility = inquiry?.seeker_confirmed && 
    inquiry?.placed_facility_id === facilityId &&
    !inquiry?.placement_confirmed;

  const respondMutation = useMutation({
    mutationFn: async (response: "interested" | "declined") => {
      // Update the introduction record
      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          provider_response: response,
          provider_responded_at: new Date().toISOString(),
          provider_notes: notes || null,
        })
        .eq("id", introduction.id);
      
      if (error) throw error;

      // If interested, trigger notifications and create messaging thread
      if (response === "interested" && inquiry) {
        // Update inquiry status to in_contact
        await supabase
          .from("concierge_inquiries")
          .update({ status: "in_contact" })
          .eq("id", inquiry.id);

        // Create messaging thread between seeker and facility
        if (inquiry.id) {
          const { data: existingThread } = await supabase
            .from("concierge_threads")
            .select("id")
            .eq("inquiry_id", inquiry.id)
            .eq("facility_id", facilityId)
            .eq("thread_type", "facility")
            .maybeSingle();

          if (!existingThread) {
            // Get user_id from inquiry for thread creation
            const { data: inquiryData } = await supabase
              .from("concierge_inquiries")
              .select("user_id")
              .eq("id", inquiry.id)
              .single();

            if (inquiryData?.user_id) {
              await supabase.from("concierge_threads").insert({
                inquiry_id: inquiry.id,
                facility_id: facilityId,
                user_id: inquiryData.user_id,
                thread_type: "facility",
              });
            }
          }
        }

        // Send notification to seeker
        await supabase.functions.invoke("send-concierge-notifications", {
          body: {
            type: "provider_interested",
            inquiryId: inquiry.id,
            facilityId: facilityId,
          },
        });

        // Log case event
        await supabase.from("concierge_case_events").insert({
          inquiry_id: inquiry.id,
          event_type: "provider_interested",
          event_data: { facility_id: facilityId, notes: notes || null },
          actor_type: "provider",
        });
      }
    },
    onSuccess: (_, response) => {
      queryClient.invalidateQueries({ queryKey: ["provider-introductions"] });
      queryClient.invalidateQueries({ queryKey: ["provider-concierge-threads"] });
      toast.success(response === "interested" 
        ? "You've expressed interest! The seeker has been notified and a messaging thread has been created." 
        : "Response recorded. You won't receive further updates about this case."
      );
      setShowResponseForm(false);
      setNotes("");
    },
    onError: () => {
      toast.error("Failed to submit response. Please try again.");
    },
  });

  const markContactedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("concierge_introductions")
        .update({
          seeker_contacted: true,
          seeker_contacted_at: new Date().toISOString(),
        })
        .eq("id", introduction.id);
      
      if (error) throw error;

      // Log case event
      if (inquiry) {
        await supabase.from("concierge_case_events").insert({
          inquiry_id: inquiry.id,
          event_type: "provider_contacted_seeker",
          event_data: { facility_id: facilityId },
          actor_type: "provider",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-introductions"] });
      toast.success("Marked as contacted");
    },
  });

  const getUrgencyBadge = (urgency: string | null) => {
    if (!urgency) return null;
    const colors: Record<string, string> = {
      immediate: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      within_week: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      within_month: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      exploring: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    };
    const labels: Record<string, string> = {
      immediate: "Immediate",
      within_week: "This Week",
      within_month: "This Month",
      exploring: "Exploring",
    };
    return (
      <Badge className={colors[urgency] || colors.exploring}>
        {labels[urgency] || urgency}
      </Badge>
    );
  };

  return (
    <>
      <Card className={`transition-all ${isPending ? "border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10" : ""} ${seekerConfirmedThisFacility ? "border-green-300 dark:border-green-800 ring-2 ring-green-200 dark:ring-green-900" : ""}`}>
        <CardContent className="p-4">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                {/* Name and status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{inquiry?.user_name || "Anonymous Seeker"}</span>
                  {isPending && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                      Awaiting Response
                    </Badge>
                  )}
                  {isAccepted && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Interested
                    </Badge>
                  )}
                  {isDeclined && (
                    <Badge variant="secondary">Declined</Badge>
                  )}
                  {seekerConfirmedThisFacility && (
                    <Badge variant="destructive" className="animate-pulse">
                      <BadgeCheck className="h-3 w-3 mr-1" />
                      Awaiting Your Confirmation
                    </Badge>
                  )}
                  {inquiry?.placement_confirmed && inquiry?.placed_facility_id === facilityId && (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Placed
                    </Badge>
                  )}
                </div>

                {/* Key info badges */}
                <div className="flex flex-wrap gap-2 text-sm">
                  {inquiry?.level_of_care && (
                    <Badge variant="outline">
                      <Heart className="h-3 w-3 mr-1" />
                      {inquiry.level_of_care}
                    </Badge>
                  )}
                  {inquiry?.payment_type && (
                    <Badge variant="outline">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {inquiry.payment_type}
                      {inquiry.insurance_carrier && ` - ${inquiry.insurance_carrier}`}
                    </Badge>
                  )}
                  {getUrgencyBadge(inquiry?.timeline_urgency || null)}
                </div>

                {/* Location and date */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {(inquiry?.preferred_city || inquiry?.preferred_state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[inquiry?.preferred_city, inquiry?.preferred_state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Introduced {format(new Date(introduction.sent_at || introduction.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {seekerConfirmedThisFacility && (
                  <Button 
                    onClick={() => setShowConfirmModal(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <BadgeCheck className="h-4 w-4 mr-2" />
                    Confirm Placement
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            {/* Expandable content */}
            <CollapsibleContent className="mt-4 space-y-4">
              {/* Additional details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {inquiry?.primary_concern && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Primary Concern</p>
                    <p className="font-medium capitalize">{inquiry.primary_concern.replace(/_/g, " ")}</p>
                  </div>
                )}
                {inquiry?.gender && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Gender</p>
                    <p className="font-medium capitalize">{inquiry.gender}</p>
                  </div>
                )}
                {inquiry?.age_range && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Age Range</p>
                    <p className="font-medium">{inquiry.age_range}</p>
                  </div>
                )}
                {inquiry?.status && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">Case Status</p>
                    <p className="font-medium capitalize">{inquiry.status.replace(/_/g, " ")}</p>
                  </div>
                )}
              </div>

              {/* Contact info for accepted */}
              {isAccepted && inquiry && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Seeker Contact Info</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      <a href={`mailto:${inquiry.user_email}`} className="text-primary hover:underline">
                        {inquiry.user_email}
                      </a>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      <a href={`tel:${inquiry.user_phone}`} className="text-primary hover:underline">
                        {inquiry.user_phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Provider notes if already responded */}
              {introduction.provider_notes && !isPending && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Your Notes</p>
                  <p className="text-sm">{introduction.provider_notes}</p>
                </div>
              )}

              {/* Response form for pending */}
              {isPending && (
                <div className="space-y-3 pt-2 border-t">
                  {showResponseForm ? (
                    <>
                      <Textarea
                        placeholder="Add notes about your availability or any questions (optional)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => respondMutation.mutate("interested")}
                          disabled={respondMutation.isPending}
                          className="flex-1"
                        >
                          {respondMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          I'm Interested
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => respondMutation.mutate("declined")}
                          disabled={respondMutation.isPending}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Not a Fit
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowResponseForm(false);
                            setNotes("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button onClick={() => setShowResponseForm(true)} className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Respond to Introduction
                    </Button>
                  )}
                </div>
              )}

              {/* Post-acceptance actions */}
              {isAccepted && !introduction.seeker_contacted && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => markContactedMutation.mutate()}
                    disabled={markContactedMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Contacted
                  </Button>
                </div>
              )}

              {introduction.seeker_contacted && (
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Contacted on {introduction.seeker_contacted_at 
                    ? format(new Date(introduction.seeker_contacted_at), "MMM d, yyyy")
                    : "—"
                  }
                </div>
              )}

              {/* Seeker confirmed info */}
              {inquiry?.seeker_confirmed && inquiry?.seeker_confirmed_at && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Seeker confirmed admission on {format(new Date(inquiry.seeker_confirmed_at), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Confirm Placement Modal */}
      {inquiry && (
        <ProviderConfirmPlacementModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          inquiry={{
            id: inquiry.id,
            user_name: inquiry.user_name,
            seeker_confirmed: inquiry.seeker_confirmed || false,
          }}
          facilityId={facilityId}
          hasPro={hasPro}
        />
      )}
    </>
  );
}
