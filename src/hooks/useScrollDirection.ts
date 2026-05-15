import { useEffect, useRef, useState } from "react";

export type ScrollDirection = "up" | "down" | null;

interface UseScrollDirectionOptions {
  /** Ignore movements smaller than this (px) — avoids jitter from
   *  scroll bounce / address-bar shows on mobile Safari. */
  threshold?: number;
}

/**
 * Returns the user's current scroll direction. `null` on first paint
 * (before the user has scrolled) so callers can pick a sensible
 * default (typically: show the bar).
 *
 * Implementation note: uses a passive scroll listener throttled via
 * requestAnimationFrame so we never block the main thread.
 */
export function useScrollDirection({
  threshold = 8,
}: UseScrollDirectionOptions = {}): ScrollDirection {
  const [dir, setDir] = useState<ScrollDirection>(null);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastYRef.current = window.scrollY;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastYRef.current;
      if (Math.abs(delta) > threshold) {
        setDir(delta > 0 ? "down" : "up");
        lastYRef.current = y;
      }
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return dir;
}
