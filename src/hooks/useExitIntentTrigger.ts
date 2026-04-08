import { useState, useEffect, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const SESSION_KEY = "exit_intent_shown";
const SUBMITTED_KEY = "exit_intent_submitted";
const SCROLL_THRESHOLD = 0.6; // 60% scroll depth
const TIME_THRESHOLD_MS = 45_000; // 45 seconds

export function useExitIntentTrigger() {
  const [shouldShow, setShouldShow] = useState(false);
  const firedRef = useRef(false);
  const isMobile = useIsMobile();

  const dismiss = useCallback(() => {
    setShouldShow(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
  }, []);

  const markSubmitted = useCallback(() => {
    setShouldShow(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
      sessionStorage.setItem(SUBMITTED_KEY, "1");
    } catch {}
  }, []);

  const fire = useCallback(() => {
    if (firedRef.current) return;
    try {
      if (
        sessionStorage.getItem(SESSION_KEY) ||
        sessionStorage.getItem(SUBMITTED_KEY)
      )
        return;
    } catch {}
    firedRef.current = true;
    setShouldShow(true);
  }, []);

  useEffect(() => {
    // Already shown or submitted this session
    try {
      if (
        sessionStorage.getItem(SESSION_KEY) ||
        sessionStorage.getItem(SUBMITTED_KEY)
      ) {
        firedRef.current = true;
        return;
      }
    } catch {}

    // Desktop exit-intent (mouseleave near top)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 10) fire();
    };

    // Scroll-based trigger
    const handleScroll = () => {
      const scrolled =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled >= SCROLL_THRESHOLD) fire();
    };

    // Time-based trigger
    const timer = setTimeout(fire, TIME_THRESHOLD_MS);

    // Attach listeners
    if (!isMobile) {
      document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      if (!isMobile) {
        document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile, fire]);

  return { shouldShow, dismiss, markSubmitted };
}
