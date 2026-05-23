import { Loader2 } from "lucide-react";

/**
 * Suspense fallback shown while a route-level lazy chunk downloads.
 *
 * Was previously `<div className="min-h-screen" />` — a literal blank
 * screen that left the user with no signal that anything was happening,
 * particularly painful on slow networks where a chunk might take 1-3
 * seconds. Mobile / non-technical users read the blank as "the site
 * is broken" — and when paired with the global navigation interceptor
 * that wrapped every link click in startTransition, the previous
 * page stayed visible during the wait, making it look like a click did
 * nothing.
 *
 * This replacement keeps the same `min-h-screen` reservation (so layout
 * doesn't shift when the chunk lands and the real content fills in)
 * but adds a centered, animated spinner so the user has a clear "I'm
 * loading" cue.
 */
export function RouteLoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-primary"
        aria-hidden="true"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
