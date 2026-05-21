import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { gaSetTrafficType } from "@/lib/ga";

const STORAGE_KEY = "rl_ga_traffic_type";
const INTERNAL_ROLES = new Set(["admin", "super_admin", "manager"]);

/**
 * Mount once at the SPA root (App.tsx). Decides whether the current
 * session is INTERNAL (staff: admin / super_admin / manager) or EXTERNAL
 * (everyone else, including providers and seekers, since they're real
 * users) and sets a GA4 user property accordingly.
 *
 * GA4 reports can then exclude internal traffic via:
 *   Admin → Property → Data Filters → "Exclude traffic where
 *   user_property:traffic_type matches Internal"
 * — no IP allowlist required, no manual filter list.
 *
 * Implementation notes:
 *  - localStorage caches the resolution so subsequent loads tag GA before
 *    the network call returns (eliminates a few seconds of mistagged hits
 *    after each refresh on staff machines).
 *  - The lookup hits `user_roles` only when the cache is missing OR the
 *    user_id changed since last visit. Service-side cost: one `eq` query
 *    per session, not per page.
 *  - Re-runs on Supabase auth events so a logout → fresh anon visit
 *    flips traffic_type back to "external" immediately.
 *
 * Privacy: no PII is sent to GA. The user property is a single bucket
 * label, not a user id.
 */
export function useGAInternalTrafficFlag(): void {
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    // Apply cached value immediately so the very first page_view this
    // session fires carries the right traffic_type without waiting for
    // the auth round-trip.
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
        // Skip the role lookup when the user_id hasn't changed since the
        // last invocation — same identity, same role bucket.
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
          // Don't taint GA on lookup failure — default to external.
          gaSetTrafficType("external");
          return;
        }
        const isInternal = (roles ?? []).some((r) => INTERNAL_ROLES.has(r.role as string));
        const kind = isInternal ? "internal" : "external";
        gaSetTrafficType(kind);
        try { window.localStorage.setItem(STORAGE_KEY, kind); } catch { /* ignore */ }
      } catch {
        // Network blip — leave the previous tagging (or cached value) in place.
      }
    };

    void refreshFromAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // SIGNED_IN / SIGNED_OUT / USER_UPDATED — re-evaluate.
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

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
}
