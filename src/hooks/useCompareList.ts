import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const COMPARE_STORAGE_KEY = "treatment-center-compare";
export const MAX_COMPARE = 4;

/**
 * Per-user facility comparison list. Mirrors the useFavorites pattern:
 * - Guests: persisted to localStorage
 * - Logged-in users: persisted to user_compare_list (RLS-scoped)
 * - On login, guest entries are merged into the user's row set
 * - Soft-capped at MAX_COMPARE (UI shows a toast at the cap)
 */
export function useCompareList() {
  const [ids, setIds] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncedUserIdRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setUser(session?.user ?? null);
      }
    );

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const projectRef = supabaseUrl?.split("//")[1]?.split(".")[0] || "mldbxpntzcjalgjmwnqa";
      const storageKey = `sb-${projectRef}-auth-token`;
      const stored = localStorage.getItem(storageKey);
      if (stored && mounted) {
        const parsed = JSON.parse(stored);
        const session = parsed?.currentSession || parsed;
        if (session?.user) setUser(session.user);
      }
    } catch {
      // ignore
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const sync = async () => {
      if (!user) {
        try {
          const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
          setIds(stored ? JSON.parse(stored) : []);
        } catch {
          setIds([]);
        }
        setIsLoading(false);
        syncedUserIdRef.current = null;
        return;
      }

      if (syncedUserIdRef.current === user.id || isSyncingRef.current) return;

      isSyncingRef.current = true;
      setIsLoading(true);

      const { data: dbRows, error } = await supabase
        .from("user_compare_list")
        .select("facility_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("[useCompareList] fetch error:", error);
        setIsLoading(false);
        isSyncingRef.current = false;
        return;
      }

      const dbIds = dbRows?.map((r) => r.facility_id as string) ?? [];

      let guestIds: string[] = [];
      try {
        const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) guestIds = parsed.filter((v) => typeof v === "string");
        }
      } catch {
        // ignore
      }

      const toMigrate = guestIds.filter((id) => !dbIds.includes(id));
      let merged = dbIds;
      if (toMigrate.length > 0) {
        // Respect MAX_COMPARE during merge so we don't overflow.
        const room = Math.max(0, MAX_COMPARE - dbIds.length);
        const slice = toMigrate.slice(0, room);
        if (slice.length > 0) {
          const rows = slice.map((facility_id) => ({ user_id: user.id, facility_id }));
          const { error: mergeErr } = await supabase
            .from("user_compare_list")
            .upsert(rows, { onConflict: "user_id,facility_id", ignoreDuplicates: true });
          if (!mergeErr) merged = [...dbIds, ...slice];
        }
      }

      if (toMigrate.length === 0 || merged.length > dbIds.length) {
        try { localStorage.removeItem(COMPARE_STORAGE_KEY); } catch { /* ignore */ }
      }

      setIds(merged);
      syncedUserIdRef.current = user.id;
      isSyncingRef.current = false;
      setIsLoading(false);
    };

    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
      } catch {
        // storage unavailable
      }
    }
  }, [ids, user]);

  const isInCompare = useCallback((facilityId: string) => ids.includes(facilityId), [ids]);

  const toggleCompare = useCallback(async (facilityId: string): Promise<"added" | "removed" | "full"> => {
    const alreadyIn = ids.includes(facilityId);

    if (!alreadyIn && ids.length >= MAX_COMPARE) {
      return "full";
    }

    setIds((prev) =>
      alreadyIn ? prev.filter((id) => id !== facilityId) : [...prev, facilityId]
    );

    if (user) {
      if (alreadyIn) {
        const { error } = await supabase
          .from("user_compare_list")
          .delete()
          .eq("user_id", user.id)
          .eq("facility_id", facilityId);
        if (error) {
          console.error("[useCompareList] remove error:", error);
          setIds((prev) => [...prev, facilityId]);
        }
      } else {
        const { error } = await supabase
          .from("user_compare_list")
          .insert({ user_id: user.id, facility_id: facilityId });
        if (error) {
          console.error("[useCompareList] insert error:", error);
          setIds((prev) => prev.filter((id) => id !== facilityId));
        }
      }
    }

    return alreadyIn ? "removed" : "added";
  }, [ids, user]);

  const removeFromCompare = useCallback(async (facilityId: string) => {
    setIds((prev) => prev.filter((id) => id !== facilityId));
    if (user) {
      await supabase
        .from("user_compare_list")
        .delete()
        .eq("user_id", user.id)
        .eq("facility_id", facilityId);
    }
  }, [user]);

  const clearCompare = useCallback(async () => {
    setIds([]);
    try { localStorage.removeItem(COMPARE_STORAGE_KEY); } catch { /* ignore */ }
    if (user) {
      await supabase
        .from("user_compare_list")
        .delete()
        .eq("user_id", user.id);
    }
  }, [user]);

  return {
    compareIds: ids,
    compareCount: ids.length,
    isInCompare,
    toggleCompare,
    removeFromCompare,
    clearCompare,
    isLoading,
    isAuthenticated: !!user,
    isFull: ids.length >= MAX_COMPARE,
    max: MAX_COMPARE,
  };
}
