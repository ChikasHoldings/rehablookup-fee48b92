import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminRoleType } from "@/hooks/useAdminUserManagement";

interface ImpersonationTarget {
  userId: string;
  displayName: string;
  role: AdminRoleType;
  permissions: Record<string, boolean>;
}

const SESSION_KEY = "rl_impersonation";

function getStoredImpersonation(): ImpersonationTarget | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useImpersonation() {
  const [impersonating, setImpersonating] = useState<ImpersonationTarget | null>(
    getStoredImpersonation
  );

  const startImpersonation = useCallback(async (
    target: ImpersonationTarget,
    adminUserId: string
  ) => {
    // Log to impersonation audit table
    try {
      await supabase.from("admin_impersonation_log").insert({
        admin_user_id: adminUserId,
        target_user_id: target.userId,
        target_role: target.role,
      });
    } catch (err) {
      console.error("Failed to log impersonation:", err);
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(target));
    setImpersonating(target);
  }, []);

  const stopImpersonation = useCallback(async (adminUserId: string) => {
    // Update the ended_at on the most recent log entry
    try {
      const { data } = await supabase
        .from("admin_impersonation_log")
        .select("id")
        .eq("admin_user_id", adminUserId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        await supabase
          .from("admin_impersonation_log")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    } catch (err) {
      console.error("Failed to update impersonation log:", err);
    }

    sessionStorage.removeItem(SESSION_KEY);
    setImpersonating(null);
  }, []);

  const isImpersonating = !!impersonating;

  return {
    impersonating,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
    impersonatedRole: impersonating?.role ?? null,
    impersonatedPermissions: impersonating?.permissions ?? null,
  };
}
