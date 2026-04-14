import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaseSlaCompactBadge } from "./CaseSlaAlerts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  UserCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface PipelineCase {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  status: string;
  payment_status: string;
  level_of_care: string | null;
  desired_location_state: string | null;
  preferred_state: string | null;
  match_count: number | null;
  assigned_advisor_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PlacementPipelineBoardProps {
  cases: PipelineCase[] | undefined;
  isLoading: boolean;
  onCaseClick: (caseId: string) => void;
  onRefresh: () => void;
  advisorNames?: Record<string, string>;
  isAdvisor?: boolean;
}

const PIPELINE_STAGES = [
  { key: "new", label: "New", icon: "🟢", color: "border-t-primary", bgActive: "bg-primary/5" },
  { key: "reviewing", label: "Reviewing", icon: "🔍", color: "border-t-info", bgActive: "bg-info/5" },
  { key: "matching", label: "Placing", icon: "🔗", color: "border-t-warning", bgActive: "bg-warning/5" },
  { key: "matched", label: "Facilities Found", icon: "🏥", color: "border-t-accent", bgActive: "bg-accent/5" },
  { key: "introductions_sent", label: "Intros Sent", icon: "📨", color: "border-t-secondary", bgActive: "bg-secondary/5" },
  { key: "in_contact", label: "In Contact", icon: "📞", color: "border-t-info", bgActive: "bg-info/5" },
  { key: "placed", label: "Placed ✓", icon: "🏠", color: "border-t-success", bgActive: "bg-success/5" },
  { key: "closed", label: "Closed", icon: "📁", color: "border-t-muted-foreground", bgActive: "bg-muted/20" },
];

// Valid forward transitions
const NEXT_STATUS: Record<string, string> = {
  new: "reviewing",
  reviewing: "matching",
  matching: "matched",
  matched: "introductions_sent",
  introductions_sent: "in_contact",
  in_contact: "placed", // placed needs confirm-placement edge function, handled separately
};

const PREV_STATUS: Record<string, string> = {
  reviewing: "new",
  matching: "reviewing",
  matched: "matching",
  introductions_sent: "matched",
  in_contact: "introductions_sent",
};

export function PlacementPipelineBoard({
  cases,
  isLoading,
  onCaseClick,
  onRefresh,
  advisorNames = {},
  isAdvisor = false,
}: PlacementPipelineBoardProps) {
  const { user } = useAdminAuth();
  const queryClient = useQueryClient();
  const [movingCaseId, setMovingCaseId] = useState<string | null>(null);

  const moveCase = useMutation({
    mutationFn: async ({ caseId, fromStatus, toStatus }: { caseId: string; fromStatus: string; toStatus: string }) => {
      setMovingCaseId(caseId);

      // Don't allow moving to "placed" via simple status change - needs confirm-placement
      if (toStatus === "placed") {
        throw new Error("Use 'Confirm Placement' action to mark as placed");
      }

      const { error } = await supabase
        .from("concierge_inquiries")
        .update({ status: toStatus })
        .eq("id", caseId);
      if (error) throw error;

      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseId,
        event_type: "status_changed",
        event_data: { from: fromStatus, to: toStatus, via: "pipeline" },
        actor_id: user?.id,
        actor_type: isAdvisor ? "advisor" : "admin",
      });
    },
    onSuccess: () => {
      toast.success("Case moved successfully");
      onRefresh();
      queryClient.invalidateQueries({ queryKey: ["admin-concierge-stats"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
    onSettled: () => setMovingCaseId(null),
  });

  const isPaid = (s: string) => s === "paid" || s === "succeeded";

  // Group cases by status
  const casesByStage: Record<string, PipelineCase[]> = {};
  PIPELINE_STAGES.forEach((s) => { casesByStage[s.key] = []; });
  cases?.forEach((c) => {
    if (casesByStage[c.status]) {
      casesByStage[c.status].push(c);
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {PIPELINE_STAGES.map((s) => (
          <div key={s.key} className="h-64 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="flex gap-2 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const stageCases = casesByStage[stage.key] || [];
          const nextStatus = NEXT_STATUS[stage.key];
          const prevStatus = PREV_STATUS[stage.key];

          return (
            <div
              key={stage.key}
              className={`flex flex-col w-[200px] lg:w-[220px] rounded-lg border-t-4 ${stage.color} bg-card border shadow-sm`}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{stage.icon}</span>
                  <span className="text-xs font-semibold truncate">{stage.label}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 tabular-nums">
                  {stageCases.length}
                </Badge>
              </div>

              {/* Cards */}
              <ScrollArea className="flex-1 max-h-[400px]">
                <div className="p-1.5 space-y-1.5">
                  {stageCases.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground/40">
                      <p className="text-[10px]">No cases</p>
                    </div>
                  ) : (
                    stageCases.map((c) => {
                      const isMoving = movingCaseId === c.id;
                      return (
                        <Card
                          key={c.id}
                          className="cursor-pointer hover:shadow-md transition-shadow border"
                          onClick={() => onCaseClick(c.id)}
                        >
                          <CardContent className="p-2.5">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-semibold truncate flex-1">{c.user_name}</p>
                              {!isPaid(c.payment_status) && (
                                <DollarSign className="h-3 w-3 text-destructive shrink-0" />
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {c.level_of_care && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                  {c.level_of_care}
                                </Badge>
                              )}
                              {(c.desired_location_state || c.preferred_state) && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5" />
                                  {c.desired_location_state || c.preferred_state}
                                </span>
                              )}
                            </div>

                            {/* SLA Alert */}
                            <CaseSlaCompactBadge caseData={c} />

                            {c.assigned_advisor_id && advisorNames[c.assigned_advisor_id] && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <UserCheck className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground truncate">
                                  {advisorNames[c.assigned_advisor_id]}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {format(new Date(c.created_at), "MMM d")}
                              </span>

                              {/* Quick move buttons */}
                              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                {prevStatus && stage.key !== "placed" && stage.key !== "closed" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    disabled={isMoving}
                                    onClick={() => moveCase.mutate({ caseId: c.id, fromStatus: c.status, toStatus: prevStatus })}
                                    title={`Move back to ${PIPELINE_STAGES.find(s => s.key === prevStatus)?.label}`}
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                )}
                                {nextStatus && stage.key !== "placed" && stage.key !== "closed" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    disabled={isMoving}
                                    onClick={() => {
                                      if (nextStatus === "placed") {
                                        toast.info("Open the case and use 'Confirm Placement' to mark as placed");
                                        return;
                                      }
                                      moveCase.mutate({ caseId: c.id, fromStatus: c.status, toStatus: nextStatus });
                                    }}
                                    title={`Move to ${PIPELINE_STAGES.find(s => s.key === nextStatus)?.label}`}
                                  >
                                    {isMoving ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
