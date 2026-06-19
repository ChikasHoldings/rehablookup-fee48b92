import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_DEFAULTS } from "@/hooks/useAdminUserManagement";
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
    getStoredImpersonation,
  );

  // L3: the grant persisted in sessionStorage can be hand-edited by an
  // already-authenticated admin. It only drives the client-side *preview*
  // (RLS gates all real data server-side), but a tampered blob shouldn't be
  // able to widen the previewed nav/permissions. On restore, re-derive role +
  // permissions from the DB for the stored userId and overwrite whatever was
  // persisted; if the target is no longer an active admin, drop the session.
  useEffect(() => {
    const stored = getStoredImpersonation();
    if (!stored?.userId) return;
    let cancelled = false;
    void (async () => {
      const [{ data: profile }, { data: perms }] = await Promise.all([
        supabase
          .from("admin_user_profiles")
          .select("admin_role, status")
          .eq("user_id", stored.userId)
          .maybeSingle(),
        supabase
          .from("admin_user_permissions")
          .select("permission_key, granted")
          .eq("user_id", stored.userId),
      ]);
      if (cancelled) return;

      if (!profile || profile.status !== "active") {
        sessionStorage.removeItem(SESSION_KEY);
        setImpersonating(null);
        return;
      }

      const role = profile.admin_role as AdminRoleType;
      const permMap: Record<string, boolean> = {};
      (perms || []).forEach((p) => {
        permMap[p.permission_key] = p.granted;
      });
      const authoritative: ImpersonationTarget = {
        userId: stored.userId,
        displayName: stored.displayName,
        role,
        permissions:
          Object.keys(permMap).length > 0 ? permMap : (ROLE_DEFAULTS[role] || {}),
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authoritative));
      setImpersonating(authoritative);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Start an impersonation session. The audit row is written FIRST and the
  // local session state only flips after the insert succeeds — that way an
  // RLS-denied / network-failed audit write doesn't leave the user in a
  // mismatched UI state where the sidebar pretends to be a non-super-admin
  // but the DB still treats them as their real account.
  const startImpersonation = useCallback(async (
    target: ImpersonationTarget,
    adminUserId: string,
  ) => {
    const { error } = await supabase.from("admin_impersonation_log").insert({
      admin_user_id: adminUserId,
      target_user_id: target.userId,
      target_role: target.role,
    });
    if (error) {
      // Surface to the caller so they can show a toast / abort. We do NOT
      // mutate sessionStorage or local state on failure.
      throw new Error(
        error.message || "Failed to record impersonation start in audit log",
      );
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(target));
    setImpersonating(target);
  }, []);

  // Stop an impersonation session. We attempt to update the audit row's
  // ended_at, but we ALWAYS clear local state regardless — leaving the
  // admin trapped in impersonation because the audit write failed is worse
  // than a missing ended_at timestamp (a 60-minute auto-expire trigger
  // also closes orphans server-side, see migration 20260423053829).
  const stopImpersonation = useCallback(async (adminUserId: string) => {
    let auditWarning: string | null = null;
    try {
      const { data, error: lookupErr } = await supabase
        .from("admin_impersonation_log")
        .select("id")
        .eq("admin_user_id", adminUserId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupErr) {
        auditWarning = `Audit lookup failed: ${lookupErr.message}`;
      } else if (data) {
        const { error: updateErr } = await supabase
          .from("admin_impersonation_log")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", data.id);
        if (updateErr) auditWarning = `Audit close failed: ${updateErr.message}`;
      }
    } catch (err) {
      auditWarning = err instanceof Error ? err.message : String(err);
    }

    sessionStorage.removeItem(SESSION_KEY);
    setImpersonating(null);

    if (auditWarning) {
      // The auto-expire trigger will eventually close this row; surface to
      // the console for the on-call to investigate, but never block the
      // user from leaving impersonation.
      console.warn("[useImpersonation] stop audit warning:", auditWarning);
    }
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
