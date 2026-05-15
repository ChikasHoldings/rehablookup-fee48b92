import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  /** Target number to count up to. */
  to: number;
  /** Animation duration in ms. */
  durationMs?: number;
  /** When true (default), the count waits for the element to enter the
   *  viewport before animating. Set false to animate immediately on mount. */
  triggerInView?: boolean;
  /** Easing — applied to progress 0..1 → eased 0..1. Defaults to easeOutCubic. */
  easing?: (t: number) => number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Count-up animation from 0 to `to`, optionally gated on the returned
 * ref entering the viewport. Uses requestAnimationFrame + a single
 * IntersectionObserver. Honors prefers-reduced-motion: if the user has
 * the OS setting enabled, the final value is shown immediately with no
 * animation.
 */
export function useCountUp({
  to,
  durationMs = 1400,
  triggerInView = true,
  easing = easeOutCubic,
}: UseCountUpOptions): {
  value: number;
  ref: React.RefObject<HTMLElement>;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setValue(to);
      startedRef.current = true;
      return;
    }

    const animate = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        setValue(Math.round(easing(t) * to));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!triggerInView) {
      animate();
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      // SSR / no IO — just show the final value rather than 0.
      setValue(to);
      startedRef.current = true;
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animate();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [to, durationMs, triggerInView, easing]);

  return { value, ref: ref as React.RefObject<HTMLElement> };
}
