import { useCaseTransition } from "@/hooks/useCaseTransition";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getStageConfig, getNextStage, PIPELINE_STAGES, type PlacementStage } from "./placementPipelineConfig";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface StageActionBarProps {
  caseData: ConciergeInquiry;
  onRefresh: () => void;
  onSwitchTab: (tab: string) => void;
}

interface StageAction {
  label: string;
  icon: React.ElementType;
  variant: "default" | "outline" | "destructive" | "secondary";
  navigateTo?: string;
  advanceTo?: string;
  extraFields?: Record<string, unknown>;
  eventType?: string;
}

function getStageActions(c: ConciergeInquiry): StageAction[] {
  const status = c.status as PlacementStage;
  const config = getStageConfig(status);
  const next = getNextStage(status);

  if (status === "closed" || status === "completed") return [];

  const hasAdvisor = !!c.assigned_advisor_id;

  switch (status) {
    case "intake_submitted":
      return [
        { label: "Review Intake", icon: config.icon, variant: "default", navigateTo: "overview" },
        { label: "Mark Reviewed", icon: config.icon, variant: "outline", advanceTo: "intake_reviewed", eventType: "intake_reviewed" },
      ];

    case "intake_reviewed":
      return [
        { label: "Assign Advisor", icon: config.icon, variant: "default", navigateTo: "actions" },
        ...(hasAdvisor ? [{ label: "Advance to Assigned", icon: config.icon, variant: "outline" as const, advanceTo: "advisor_assigned" as string, eventType: "advisor_assigned" }] : []),
      ];

    case "advisor_assigned":
      return [
        { label: "Run Matching", icon: config.icon, variant: "default", navigateTo: "matching" },
        { label: "Begin Matching", icon: config.icon, variant: "outline", advanceTo: "matching_providers", eventType: "matching_started" },
      ];

    case "matching_providers":
      return [
        { label: "Review Matches", icon: config.icon, variant: "default", navigateTo: "matching" },
        { label: "Start Pre-Qual", icon: config.icon, variant: "outline", advanceTo: "provider_prequalification", eventType: "prequalification_started" },
      ];

    case "provider_prequalification":
      return [
        { label: "Send to Providers", icon: config.icon, variant: "default", navigateTo: "introductions" },
        { label: "Providers Accepted", icon: config.icon, variant: "outline", advanceTo: "providers_accepted", eventType: "providers_accepted" },
      ];

    case "providers_accepted":
      return [
        { label: "Present to Seeker", icon: config.icon, variant: "default", navigateTo: "introductions" },
        { label: "Mark Presented", icon: config.icon, variant: "outline", advanceTo: "presented_to_seeker", eventType: "presented_to_seeker" },
      ];

    case "presented_to_seeker":
      return [
        { label: "Check Messages", icon: config.icon, variant: "default", navigateTo: "messages" },
        { label: "Seeker Selected", icon: config.icon, variant: "outline", advanceTo: "seeker_selected", eventType: "seeker_selected" },
      ];

    case "seeker_selected":
      return [
        { label: "Schedule Tour", icon: config.icon, variant: "default", navigateTo: "tours" },
        { label: "Begin Admission", icon: config.icon, variant: "outline", advanceTo: "admission_in_progress", eventType: "admission_started" },
      ];

    case "admission_in_progress":
      return [
        { label: "Confirm Admitted", icon: config.icon, variant: "default", advanceTo: "admitted",
          extraFields: { placement_confirmed: true, placement_confirmed_at: new Date().toISOString(), admission_status: "admitted" },
          eventType: "placement_confirmed" },
      ];

    case "admitted":
      return [
        { label: "Go to Billing", icon: config.icon, variant: "default", navigateTo: "billing" },
        { label: "Mark Billed", icon: config.icon, variant: "outline", advanceTo: "billed", eventType: "invoice_sent" },
      ];

    case "billed":
      return [
        { label: "View Billing", icon: config.icon, variant: "default", navigateTo: "billing" },
        { label: "Mark Completed", icon: config.icon, variant: "outline", advanceTo: "completed", eventType: "case_completed" },
      ];

    default:
      return [];
  }
}

export function StageActionBar({ caseData, onRefresh, onSwitchTab }: StageActionBarProps) {
  const transition = useCaseTransition();
  const actions = getStageActions(caseData);

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {actions.map((action, i) => {
        const Icon = action.icon;
        const isNav = !!action.navigateTo;
        return (
          <Button
            key={i}
            size="sm"
            variant={action.variant}
            className="h-8 text-xs gap-1.5"
            disabled={transition.isPending}
            onClick={() => {
              if (isNav) {
                onSwitchTab(action.navigateTo!);
              } else if (action.advanceTo) {
                transition.mutate({
                  caseId: caseData.id,
                  fromStatus: caseData.status,
                  toStatus: action.advanceTo,
                  extraFields: action.extraFields,
                  eventType: action.eventType,
                  via: "stage_action",
                  label: action.label,
                  onSuccess: onRefresh,
                });
              }
            }}
          >
            {transition.isPending && !isNav ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
