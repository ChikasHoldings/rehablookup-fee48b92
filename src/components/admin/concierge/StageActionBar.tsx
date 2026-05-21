import { useCaseTransition } from "@/hooks/useCaseTransition";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { getStageConfig, getNextStage, type PlacementStage } from "./placementPipelineConfig";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface StageActionBarProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
  onSwitchTab: (tab: string) => void;
}

// Legacy statuses from the retired paid-placement product. The UI no
// longer drives new cases into these states, but rows still exist in
// the DB and the StageActionBar must offer a sane exit (close case).
const LEGACY_PLACED_STATUSES = new Set(["admission_in_progress", "admitted", "billed"]);

export function StageActionBar({ caseData, onRefresh, onSwitchTab }: StageActionBarProps) {
  const transition = useCaseTransition();
  const status = caseData.status as PlacementStage;
  const config = getStageConfig(status);
  const next = getNextStage(status);

  // Terminal states render nothing — closed / completed are read-only.
  if (status === "closed" || status === "completed") return null;

  // New terminal "Placed" state — seeker has selected a facility. The
  // workflow ends here under the post-monetization-rebuild model;
  // the only forward action is to close the case (handled in the
  // Actions tab via "Close case" with a reason).
  if (status === "seeker_selected" || LEGACY_PLACED_STATUSES.has(status)) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            Status: <span className="font-medium text-foreground">Placed</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Client has selected a facility — close the case when follow-up is complete.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 shrink-0"
          onClick={() => onSwitchTab("actions")}
        >
          Close case
        </Button>
      </div>
    );
  }

  // No further forward stage (e.g. unknown status) — bail.
  if (!next) return null;

  const nextConfig = getStageConfig(next);

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
        aria-label={`Go to ${config.tabTarget} tab — ${config.nextAction}`}
      >
        {config.nextAction}
      </Button>
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
        aria-label={`Advance status to ${nextConfig.label}`}
      >
        {transition.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Advance
      </Button>
    </div>
  );
}
