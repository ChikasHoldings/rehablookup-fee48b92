import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useCaseTransition } from "@/hooks/useCaseTransition";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ClipboardCheck, Play, Send, MessageSquare, Bell, CalendarCheck,
  CheckCircle, DollarSign, Loader2,
} from "lucide-react";
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
  const hasAdvisor = !!c.assigned_advisor_id;
  const hasMatches = (c.match_count || 0) > 0;
  const hasIntros = (c.introductions_sent_count || 0) > 0;
  const feeSettled = c.provider_fee_status === "paid" || c.provider_fee_status === "waived";

  switch (c.status) {
    case "new":
      return [
        { label: "Review Intake", icon: ClipboardCheck, variant: "default", navigateTo: "seeker" },
      ];

    case "reviewing":
      if (!hasAdvisor) {
        return [
          { label: "Assign Advisor", icon: Play, variant: "default", navigateTo: "actions" },
        ];
      }
      return [
        { label: "Begin Matching", icon: Play, variant: "default", advanceTo: "matching", eventType: "matching_started" },
      ];

    case "matching":
      if (!hasMatches) {
        return [
          { label: "Run Matching", icon: Play, variant: "default", navigateTo: "matching" },
        ];
      }
      return [
        { label: "Send to Providers", icon: Send, variant: "default", navigateTo: "intros" },
      ];

    case "matched":
      if (!hasIntros) {
        return [
          { label: "Send Introductions", icon: Send, variant: "default", navigateTo: "intros" },
        ];
      }
      return [
        { label: "Review Responses", icon: MessageSquare, variant: "default", navigateTo: "intros" },
        { label: "Advance to Intros Sent", icon: Send, variant: "outline", advanceTo: "introductions_sent", eventType: "introductions_advanced" },
      ];

    case "introductions_sent":
      return [
        { label: "Review Responses", icon: MessageSquare, variant: "default", navigateTo: "decision" },
        { label: "Advance to In Contact", icon: CheckCircle, variant: "outline", advanceTo: "in_contact", eventType: "contact_started" },
      ];

    case "in_contact":
      if (!c.seeker_confirmed) {
        return [
          { label: "Follow Up Seeker", icon: Bell, variant: "default", navigateTo: "decision" },
          { label: "Schedule Tour", icon: CalendarCheck, variant: "outline", navigateTo: "tours" },
        ];
      }
      return [
        { label: "Mark Admitted", icon: CheckCircle, variant: "default", advanceTo: "placed",
          extraFields: { placement_confirmed: true, placement_confirmed_at: new Date().toISOString(), admission_status: "admitted" },
          eventType: "placement_confirmed" },
        { label: "Schedule Tour", icon: CalendarCheck, variant: "outline", navigateTo: "tours" },
      ];

    case "placed":
      if (!feeSettled) {
        return [
          { label: "Complete Billing", icon: DollarSign, variant: "default", navigateTo: "billing" },
        ];
      }
      return [
        { label: "View Billing", icon: DollarSign, variant: "outline", navigateTo: "billing" },
      ];

    case "closed":
      return [];

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
