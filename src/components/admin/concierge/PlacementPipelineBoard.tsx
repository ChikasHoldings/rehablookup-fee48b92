import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCaseTransition } from "@/hooks/useCaseTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CaseSlaCompactBadge } from "./CaseSlaAlerts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronRight, MapPin, Clock, DollarSign, UserCheck, Loader2,
} from "lucide-react";
import {
  PIPELINE_STAGES, CLOSED_STAGE, getNextStage, type PlacementStage,
} from "./placementPipelineConfig";

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

// Show these stages as columns (skip completed/closed to save space, they're in the table)
const BOARD_STAGES = [...PIPELINE_STAGES.filter(s => s.key !== "completed"), CLOSED_STAGE];

export function PlacementPipelineBoard({
  cases, isLoading, onCaseClick, onRefresh, advisorNames = {}, isAdvisor = false,
}: PlacementPipelineBoardProps) {
  const queryClient = useQueryClient();
  const [movingCaseId, setMovingCaseId] = useState<string | null>(null);
  const transition = useCaseTransition();

  const moveCase = useMutation({
    mutationFn: async ({ caseId, fromStatus, toStatus }: { caseId: string; fromStatus: string; toStatus: string }) => {
      setMovingCaseId(caseId);
      if (toStatus === "admitted") {
        throw new Error("Use 'Confirm Admitted' action to mark as admitted");
      }
      await transition.mutateAsync({
        caseId, fromStatus, toStatus,
        via: "pipeline",
        onSuccess: onRefresh,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-concierge-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setMovingCaseId(null),
  });

  const isPaid = (s: string) => s === "paid" || s === "succeeded";

  // Group cases
  const casesByStage: Record<string, PipelineCase[]> = {};
  BOARD_STAGES.forEach(s => { casesByStage[s.key] = []; });
  cases?.forEach(c => {
    if (casesByStage[c.status]) {
      casesByStage[c.status].push(c);
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="flex gap-2 min-w-max">
        {BOARD_STAGES.map(stage => {
          const stageCases = casesByStage[stage.key] || [];
          const nextStatus = getNextStage(stage.key as PlacementStage);

          return (
            <div key={stage.key} className={`flex flex-col w-[180px] lg:w-[200px] rounded-lg border-t-4 ${stage.color} bg-card border shadow-sm`}>
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-[10px] font-semibold truncate">{stage.shortLabel}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 tabular-nums">
                  {stageCases.length}
                </Badge>
              </div>

              <ScrollArea className="flex-1 max-h-[400px]">
                <div className="p-1.5 space-y-1.5">
                  {stageCases.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground/40">
                      <p className="text-[10px]">No cases</p>
                    </div>
                  ) : (
                    stageCases.map(c => {
                      const isMoving = movingCaseId === c.id;
                      return (
                        <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow border" onClick={() => onCaseClick(c.id)}>
                          <CardContent className="p-2.5">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-semibold truncate flex-1">{c.user_name}</p>
                              {!isPaid(c.payment_status) && <DollarSign className="h-3 w-3 text-destructive shrink-0" />}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {c.level_of_care && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{c.level_of_care}</Badge>
                              )}
                              {(c.desired_location_state || c.preferred_state) && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5" />{c.desired_location_state || c.preferred_state}
                                </span>
                              )}
                            </div>
                            <CaseSlaCompactBadge caseData={c} />
                            {c.assigned_advisor_id && advisorNames[c.assigned_advisor_id] && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <UserCheck className="h-2.5 w-2.5 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground truncate">{advisorNames[c.assigned_advisor_id]}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />{format(new Date(c.created_at), "MMM d")}
                              </span>
                              {/* Forward-only move */}
                              {nextStatus && stage.key !== "closed" && (
                                <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={isMoving}
                                    onClick={() => {
                                      if (nextStatus === "admitted") {
                                        toast.info("Open the case and use 'Confirm Admitted'");
                                        return;
                                      }
                                      moveCase.mutate({ caseId: c.id, fromStatus: c.status, toStatus: nextStatus });
                                    }}
                                    title={`Advance to ${nextStatus}`}>
                                    {isMoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                                  </Button>
                                </div>
                              )}
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
