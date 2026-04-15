import { useCaseTransition } from "@/hooks/useCaseTransition";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2 } from "lucide-react";
import { getStageConfig, getNextStage, type PlacementStage } from "./placementPipelineConfig";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface StageActionBarProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
  onSwitchTab: (tab: string) => void;
}

export function StageActionBar({ caseData, onRefresh, onSwitchTab }: StageActionBarProps) {
  const transition = useCaseTransition();
  const status = caseData.status as PlacementStage;
  const config = getStageConfig(status);
  const next = getNextStage(status);

  if (status === "closed" || status === "completed" || !next) return null;

  const nextConfig = getStageConfig(next);

  // For 'admitted' stage, direct admin to the Admission tab's confirm flow instead
  const isAdmissionAdvance = next === "admitted";

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-primary/5">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Current: <span className="font-medium text-foreground">{config.label}</span></p>
        <p className="text-xs text-muted-foreground mt-0.5">Next → <span className="font-medium">{nextConfig.label}</span></p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 shrink-0"
        onClick={() => onSwitchTab(config.tabTarget)}
      >
        {config.nextAction}
      </Button>
      {isAdmissionAdvance ? (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={() => onSwitchTab("admission")}
        >
          <ChevronRight className="h-3.5 w-3.5" />
          Confirm Admission
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 shrink-0"
          disabled={transition.isPending}
          onClick={() => {
            transition.mutate({
              caseId: caseData.id,
              fromStatus: caseData.status,
              toStatus: next,
              via: "stage_action",
              label: `Advance to ${nextConfig.label}`,
              onSuccess: onRefresh,
            });
          }}
        >
          {transition.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Advance
        </Button>
      )}
    </div>
  );
}
