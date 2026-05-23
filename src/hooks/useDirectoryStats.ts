import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DirectoryStats {
  facilityCount: number;
  stateCount: number;
}

// The SAMHSA-sourced approved directory has shipped at least these
// counts since the May 14 ingest. A live count below SANITY_MIN_FACILITIES
// almost certainly means a query error / partial state, not a real drop,
// so we fall back to the floor to avoid undermining the YMYL trust signal.
const FACILITY_FLOOR = 3800;
// 51 = 50 states + Washington, D.C. The directory carries facilities in
// D.C., so user-visible counts include it. Prose elsewhere reads
// "50 states and Washington, D.C." against this value.
const STATE_FLOOR = 51;
const SANITY_MIN_FACILITIES = 100;

/**
 * Apply sanity floors to a raw stats reading.
 * - If facility count looks broken (< 100), substitute the safe pair.
 * - Otherwise pass facility count through, and clamp state count to the
 *   floor (rendering anything below 51 would be inconsistent with the
 *   "50 states + D.C." trust copy).
 */
function applyFloors(s: DirectoryStats): DirectoryStats {
  if (s.facilityCount < SANITY_MIN_FACILITIES) {
    return { facilityCount: FACILITY_FLOOR, stateCount: STATE_FLOOR };
  }
  return {
    facilityCount: s.facilityCount,
    stateCount: Math.max(STATE_FLOOR, s.stateCount),
  };
}

/**
 * Read the build-time-inlined `<meta name="rl:stats">` tag synchronously.
 * Returns null if absent / malformed so the caller can decide whether to
 * fall back to floors or wait for the network.
 */
function readInlinedStats(): DirectoryStats | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="rl:stats"]');
  if (!meta?.content) return null;
  try {
    const parsed = JSON.parse(meta.content) as { facilities?: unknown; states?: unknown };
    if (typeof parsed.facilities !== "number" || typeof parsed.states !== "number") return null;
    return { facilityCount: parsed.facilities, stateCount: parsed.states };
  } catch {
    return null;
  }
}

/**
 * Single source of truth for the homepage facility / state count badges.
 *
 * Three-stage initialization, in order of priority:
 *   1. Inlined `<meta name="rl:stats">` (set at build time by
 *      scripts/inline-directory-stats.mjs). Synchronous, no network,
 *      available on the very first paint.
 *   2. Live Supabase RPC (`public.get_directory_stats`) fired on mount
 *      to catch any drift since the last build.
 *   3. Hardcoded floor (3800 / 50) only if both above are unavailable.
 *
 * The returned `isLoading` flag is true only when there's no inlined
 * value AND the RPC is still in flight, so the UI can render a
 * skeleton instead of the original "0+" bug.
 */
export function useDirectoryStats(): {
  stats: DirectoryStats | null;
  isLoading: boolean;
} {
  const inlined = typeof window !== "undefined" ? readInlinedStats() : null;
  const [stats, setStats] = useState<DirectoryStats | null>(inlined ? applyFloors(inlined) : null);
  const [isLoading, setIsLoading] = useState(!inlined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_directory_stats");
      if (cancelled) return;
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        // RPC failed AND no inlined value to fall back to — show floors
        // rather than nothing so the trust signal still lands.
        if (!inlined) {
          setStats({ facilityCount: FACILITY_FLOOR, stateCount: STATE_FLOOR });
        }
        setIsLoading(false);
        return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as {
        facility_count: number | string | null;
        state_count: number | string | null;
      };
      const facilityCount = Number(row.facility_count ?? 0);
      const stateCount = Number(row.state_count ?? 0);
      setStats(applyFloors({ facilityCount, stateCount }));
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stats, isLoading };
}
