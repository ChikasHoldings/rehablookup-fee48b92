import { useEffect, useRef, useCallback } from "react";

interface UseExitIntentOptions {
  /** Minimum time (ms) the user must be on page before the popup fires. Default: 15000 (15s) */
  minTimeOnPage?: number;
  /** How many pixels from the top of the viewport triggers exit intent. Default: 20 */
  topThreshold?: number;
  /** Session storage key to prevent showing more than once per session. Default: "exit_intent_shown" */
  storageKey?: string;
  /** Whether the hook is enabled. Default: true */
  enabled?: boolean;
  /** Callback fired when exit intent is detected */
  onExitIntent: () => void;
}

/**
 * Detects exit intent via:
 * 1. Mouse leaving the top of the viewport (desktop)
 * 2. popstate event (mobile back-button)
 *
 * Only fires once per session (stored in sessionStorage).
 */
export function useExitIntent({
  minTimeOnPage = 15000,
  topThreshold = 20,
  storageKey = "exit_intent_shown",
  enabled = true,
  onExitIntent,
}: UseExitIntentOptions) {
  const arrivedAt = useRef(Date.now());
  const fired = useRef(false);

  const trigger = useCallback(() => {
    if (fired.current) return;
    if (sessionStorage.getItem(storageKey)) return;
    if (Date.now() - arrivedAt.current < minTimeOnPage) return;

    fired.current = true;
    sessionStorage.setItem(storageKey, "1");
    onExitIntent();
  }, [minTimeOnPage, onExitIntent, storageKey]);

  useEffect(() => {
    if (!enabled) return;

    // Reset arrival time when hook mounts (page change)
    arrivedAt.current = Date.now();
    fired.current = false;

    // Desktop: mouse leaves through the top of the viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= topThreshold) {
        trigger();
      }
    };

    // Mobile: user presses back button
    const handlePopState = () => {
      trigger();
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled, topThreshold, trigger]);
}
