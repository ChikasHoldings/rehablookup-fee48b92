import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  actionType: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Hook to log admin actions to the audit trail.
 * Automatically resolves the current admin user.
 */
export function useAuditLog() {
  const log = useCallback(async ({ actionType, targetType, targetId, details }: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("admin_audit_log").insert({
        admin_user_id: user.id,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId || null,
        details: details || {},
      });
    } catch (err) {
      console.error("[AUDIT] Failed to log action:", actionType, err);
    }
  }, []);

  return { log };
}
