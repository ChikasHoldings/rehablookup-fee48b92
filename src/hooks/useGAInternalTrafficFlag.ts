import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { gaSetTrafficType } from "@/lib/ga";

const STORAGE_KEY = "rl_ga_traffic_type";
const INTERNAL_ROLES = new Set(["admin", "super_admin", "manager"]);

/**
 * Mount once at the SPA root (App.tsx). Decides whether the current
 * session is INTERNAL (staff: admin / super_admin / manager) or EXTERNAL
 * (everyone else) and sets a GA4 user property accordingly.
 *
 * Hardened 2026-05-21: every step is wrapped so the GA tagging never
 * crashes the host app. Earlier version threw on cleanup when
 * `supabase.auth.onAuthStateChange`'s return shape varied — that
 * propagated into React's error boundary and blacked out every route
 * mounted under `AppGlobals`.
 */
export function useGAInternalTrafficFlag(): void {
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached === "internal" || cached === "external") {
        gaSetTrafficType(cached);
      }
    } catch {
      /* localStorage unavailable — fall through */
    }

    const refreshFromAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        const userId = user?.id ?? null;
        if (userId === lastUserIdRef.current && userId !== null) return;
        lastUserIdRef.current = userId;

        if (!user) {
          gaSetTrafficType("external");
          try { window.localStorage.setItem(STORAGE_KEY, "external"); } catch { /* ignore */ }
          return;
        }

        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (cancelled) return;
        if (error) {
          gaSetTrafficType("external");
          return;
        }
        const isInternal = (roles ?? []).some((r) => INTERNAL_ROLES.has(r.role as string));
        const kind = isInternal ? "internal" : "external";
        gaSetTrafficType(kind);
        try { window.localStorage.setItem(STORAGE_KEY, kind); } catch { /* ignore */ }
      } catch {
        /* network blip — leave previous tagging in place */
      }
    };

    void refreshFromAuth();

    try {
      const result = supabase.auth.onAuthStateChange((event) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          lastUserIdRef.current = null;
          void refreshFromAuth();
        }
      });
      // supabase-js v2 returns `{ data: { subscription } }`; older shapes
      // returned `{ subscription }` directly. Be defensive on both.
      const maybeSub =
        (result as { data?: { subscription?: { unsubscribe?: () => void } } })?.data?.subscription
        ?? (result as unknown as { subscription?: { unsubscribe?: () => void } })?.subscription;
      if (maybeSub && typeof maybeSub.unsubscribe === "function") {
        unsubscribe = () => {
          try { maybeSub.unsubscribe!(); } catch { /* noop */ }
        };
      }
    } catch (err) {
      console.warn("[useGAInternalTrafficFlag] onAuthStateChange unavailable", err);
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);
}
