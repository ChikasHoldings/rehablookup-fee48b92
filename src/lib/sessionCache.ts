import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * Deduplicates concurrent getSession() calls.
 * Multiple React Query hooks firing simultaneously will share a single
 * in-flight getSession() promise instead of each making their own request.
 */
let inflight: Promise<Session | null> | null = null;
let cachedSession: Session | null = null;
let cachedAt = 0;
const CACHE_MS = 5_000; // 5 seconds

export async function getCachedSession(): Promise<Session | null> {
  const now = Date.now();
  if (cachedSession && now - cachedAt < CACHE_MS) {
    return cachedSession;
  }

  if (inflight) return inflight;

  inflight = supabase.auth.getSession()
    .then(({ data: { session } }) => {
      cachedSession = session;
      cachedAt = Date.now();
      inflight = null;
      return session;
    })
    .catch(() => {
      inflight = null;
      return null;
    });

  return inflight;
}

// Invalidate on auth state change
supabase.auth.onAuthStateChange((_event, session) => {
  cachedSession = session;
  cachedAt = Date.now();
});
