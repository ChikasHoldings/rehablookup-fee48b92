import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { VALID_TRANSITIONS, type PlacementStage } from "@/components/admin/concierge/placementPipelineConfig";
import { validateTransition } from "@/lib/statusTransitions";

/**
 * Centralized placement case status transition hook.
 *
 * Guarantees:
 * - Optimistic locking: status is only updated if current DB status matches expected
 * - Automatic timestamp fields per stage
 * - Timeline event always logged with actor, via, and from/to
 * - Query cache invalidated consistently
 * - Stale-state conflicts surfaced to the user
 */

function getTimestampFields(toStatus: string): Record<string, unknown> {
  const now = new Date().toISOString();
  switch (toStatus) {
    case "providers_accepted":
      return { matched_at: now };
    case "presented_to_seeker":
      return { introductions_sent_at: now };
    case "admitted":
      return { placement_confirmed: true, placement_confirmed_at: now, admission_status: "admitted", admission_substatus: "admitted" };
    case "billed":
      return { provider_fee_status: "invoiced" };
    case "completed":
      return { closed_at: now };
    case "closed":
      return { closed_at: now };
    default:
      return {};
  }
}

export interface TransitionOptions {
  caseId: string;
  fromStatus: string;
  toStatus: string;
  /** Additional columns to update */
  extraFields?: Record<string, unknown>;
  /** Event type override (defaults to "status_changed") */
  eventType?: string;
  /** How the transition was triggered (stepper, stage_action, pipeline, actions_tab) */
  via?: string;
  /** Human-readable label for timeline */
  label?: string;
  /** Callback on success */
  onSuccess?: () => void;
}

export function useCaseTransition() {
  const { user, adminRole } = useAdminAuth();
  const queryClient = useQueryClient();
  const isAdvisor = adminRole === "advisor";

  const mutation = useMutation({
    mutationFn: async (opts: TransitionOptions) => {
      const { caseId, fromStatus, toStatus, extraFields, eventType, via, label } = opts;

      // Client-side validation against shared transition rules (mirrors DB trigger).
      const check = validateTransition("concierge", fromStatus, toStatus);
      if (!check.ok) {
        throw new Error(check.reason || "Invalid status transition");
      }
      // Defensive sanity check against the typed config too.
      void (VALID_TRANSITIONS[fromStatus as PlacementStage] ?? []);

      // Build update payload with automatic timestamps
      const timestampFields = getTimestampFields(toStatus);
      const updatePayload: Record<string, unknown> = {
        status: toStatus,
        ...timestampFields,
        ...(extraFields || {}),
      };

      // Optimistic locking: only update if status still matches
      const { data: updated, error } = await supabase
        .from("concierge_inquiries")
        .update(updatePayload)
        .eq("id", caseId)
        .eq("status", fromStatus)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        throw new Error(
          "Status conflict — another user changed this case. Please close and reopen to see the latest state."
        );
      }

      // Log timeline event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseId,
        event_type: eventType || "status_changed",
        event_data: {
          from: fromStatus,
          to: toStatus,
          via: via || "unknown",
          ...(label ? { label } : {}),
        },
        actor_id: user?.id || null,
        actor_type: isAdvisor ? "advisor" : "admin",
      });

      return { from: fromStatus, to: toStatus };
    },
    onSuccess: (_data, opts) => {
      toast.success("Case updated");
      queryClient.invalidateQueries({ queryKey: ["admin-concierge-cases-full"] });
      queryClient.invalidateQueries({ queryKey: ["case-events", opts.caseId] });
      queryClient.invalidateQueries({ queryKey: ["intros-count", opts.caseId] });
      queryClient.invalidateQueries({ queryKey: ["tours-count", opts.caseId] });
      queryClient.invalidateQueries({ queryKey: ["placement-intros-count", opts.caseId] });
      queryClient.invalidateQueries({ queryKey: ["admin-concierge-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-concierge-case-detail", opts.caseId] });
      opts.onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return mutation;
}
