import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";

/**
 * Centralized admin_escalations transition / mutation hook.
 *
 * Why this exists: escalation updates were previously scattered across
 * EscalationsList, EscalationDetailSheet, and ManagerDashboard with
 * inconsistent audit logging and no client-side state-machine guard.
 *
 * Guarantees:
 * - Validates status transitions client-side (mirrors the spirit of the
 *   `escalation_status` enum without forbidden hops like resolved->open
 *   for non-super-admins, etc).
 * - Auto-stamps `resolved_at` when transitioning to "resolved".
 * - Always writes an admin_audit_log row.
 * - Invalidates the standard escalation query keys.
 */

export type EscalationStatus = "open" | "in_progress" | "resolved" | "closed";

const ALLOWED_TRANSITIONS: Record<EscalationStatus, EscalationStatus[]> = {
  open: ["in_progress", "resolved", "closed"],
  in_progress: ["resolved", "closed", "open"],
  resolved: ["closed", "open"], // reopen / close from resolved
  closed: ["open"], // reopen only (super admin gated in UI)
};

export interface EscalationUpdateOptions {
  id: string;
  /** Current status — required when changing status, used for transition validation. */
  fromStatus?: string;
  /** Patch to apply. */
  updates: {
    status?: EscalationStatus;
    priority?: "low" | "medium" | "high" | "critical";
    assigned_to?: string | null;
    resolution_notes?: string | null;
  };
  /** Free-form context for the audit log details. */
  auditContext?: Record<string, unknown>;
  onSuccess?: () => void;
}

function invalidateEscalationCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin-escalations"] });
  queryClient.invalidateQueries({ queryKey: ["escalation-counts"] });
  queryClient.invalidateQueries({ queryKey: ["manager-recent-escalations"] });
  queryClient.invalidateQueries({ queryKey: ["manager-escalation-stats"] });
}

export function useEscalationTransition() {
  const { user } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (opts: EscalationUpdateOptions) => {
      const { id, fromStatus, updates } = opts;
      const payload: Record<string, unknown> = { ...updates };

      // Auto-stamp resolved_at when transitioning to resolved.
      if (updates.status === "resolved") {
        payload.resolved_at = new Date().toISOString();
      }
      // Clear resolved_at when reopening.
      if (updates.status === "open" || updates.status === "in_progress") {
        if (fromStatus === "resolved" || fromStatus === "closed") {
          payload.resolved_at = null;
        }
      }

      // Client-side state-machine guard.
      if (updates.status && fromStatus && fromStatus !== updates.status) {
        const allowed = ALLOWED_TRANSITIONS[fromStatus as EscalationStatus] ?? [];
        if (!allowed.includes(updates.status)) {
          throw new Error(
            `Cannot change escalation from "${fromStatus}" to "${updates.status}". Allowed: ${allowed.join(", ") || "none"}`
          );
        }
      }

      const { error } = await supabase
        .from("admin_escalations")
        .update(payload)
        .eq("id", id);
      if (error) throw error;

      // Always write audit log.
      if (user?.id) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: "escalation_update",
          target_type: "escalation",
          target_id: id,
          details: {
            ...payload,
            ...(fromStatus ? { from_status: fromStatus } : {}),
            ...(opts.auditContext || {}),
          },
        });
      }
    },
    onSuccess: (_d, opts) => {
      toast.success("Escalation updated");
      invalidateEscalationCaches(queryClient);
      opts.onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update escalation");
    },
  });
}
