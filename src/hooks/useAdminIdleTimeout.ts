/**
 * Admin Idle Session Timeout Hook
 * Monitors user activity and forces re-authentication after idle period.
 * Pings the server periodically to update last_active_at.
 */
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

interface UseAdminIdleTimeoutOptions {
  userId: string | undefined;
  enabled: boolean;
  onTimeout: () => void;
}

export function useAdminIdleTimeout({ userId, enabled, onTimeout }: UseAdminIdleTimeoutOptions) {
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const hasTimedOut = useRef(false);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    hasTimedOut.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (!hasTimedOut.current) {
        hasTimedOut.current = true;
        toast.warning("Session expired due to inactivity", {
          description: "Please log in again to continue.",
          duration: 10000,
        });
        onTimeout();
      }
    }, IDLE_TIMEOUT_MS);
  }, [onTimeout]);

  // Ping server with activity
  const pingActivity = useCallback(async () => {
    if (!userId || hasTimedOut.current) return;
    
    try {
      await supabase.rpc("touch_admin_activity", { p_user_id: userId });
    } catch {
      // Silent fail - don't interrupt user
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Initial ping
    pingActivity();

    // Set up activity listeners
    const handleActivity = () => {
      const now = Date.now();
      // Debounce: only reset if >10 seconds since last activity
      if (now - lastActivityRef.current > 10000) {
        resetTimer();
      }
      lastActivityRef.current = now;
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    // Start timeout
    resetTimer();

    // Periodic server ping
    pingIntervalRef.current = setInterval(pingActivity, ACTIVITY_PING_INTERVAL);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [enabled, userId, resetTimer, pingActivity]);
}
