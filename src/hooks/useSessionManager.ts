import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  location: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
  revoked_at: string | null;
  expires_at: string | null;
}

interface UseSessionManagerOptions {
  enabled?: boolean;
  onSessionExpired?: () => void;
  activityUpdateInterval?: number; // ms
}

// Generate a cryptographically strong session token
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Get browser/device info
export function getBrowserInfo(): { browser: string; os: string; device: string } {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  // Detect browser
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Trident")) browser = "Internet Explorer";
  else if (ua.includes("Edge")) browser = "Edge";
  else if (ua.includes("Edg")) browser = "Edge (Chromium)";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  // Detect OS
  if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.2")) os = "Windows 8";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Detect device type
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "Tablet";

  return { browser, os, device };
}

/**
 * Unified session manager hook for all portals (admin, provider, seeker)
 * Handles:
 * - Session tracking with localStorage token
 * - Activity tracking (last_active_at updates)
 * - Session expiry detection
 * - Token refresh coordination
 * - Multi-device session listing and revocation
 */
export function useSessionManager(options: UseSessionManagerOptions = {}) {
  const { 
    enabled = true, 
    onSessionExpired,
    activityUpdateInterval = 60000 // Update activity every minute
  } = options;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityUpdateRef = useRef<number>(0);

  // Get current session token from localStorage
  const getCurrentSessionToken = useCallback(() => {
    return localStorage.getItem("current_session_token");
  }, []);

  // Fetch user sessions
  const { 
    data: sessions, 
    isLoading: isLoadingSessions, 
    error: sessionsError,
    refetch: refetchSessions 
  } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_sessions")
        .select("id, user_id, device_name, browser, os, location, ip_address, last_active_at, created_at, is_current, expires_at")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .order("last_active_at", { ascending: false });

      if (error) throw error;
      return data as Session[];
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Get current and other sessions
  const currentSession = sessions?.find(s => s.is_current);
  const otherSessions = sessions?.filter(s => !s.is_current) || [];

  // Update session activity
  const updateActivity = useCallback(async () => {
    const now = Date.now();
    // Throttle updates to prevent excessive DB calls
    if (now - lastActivityUpdateRef.current < activityUpdateInterval * 0.8) {
      return;
    }

    const sessionToken = getCurrentSessionToken();
    if (!sessionToken) return;

    try {
      const { error } = await supabase
        .from("user_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("session_token", sessionToken);

      if (!error) {
        lastActivityUpdateRef.current = now;
      }
    } catch (err) {
      // Silent fail - activity tracking is non-critical
      console.debug("[useSessionManager] Activity update failed:", err);
    }
  }, [getCurrentSessionToken, activityUpdateInterval]);

  // Check if current session is expired or revoked
  const checkSessionValidity = useCallback(async () => {
    const sessionToken = getCurrentSessionToken();
    if (!sessionToken) return { valid: false, reason: "no_token" };

    try {
      const { data: session, error } = await supabase
        .from("user_sessions")
        .select("id, revoked_at, expires_at")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (error || !session) {
        return { valid: false, reason: "not_found" };
      }

      if (session.revoked_at) {
        return { valid: false, reason: "revoked" };
      }

      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        return { valid: false, reason: "expired" };
      }

      return { valid: true, reason: null };
    } catch {
      return { valid: false, reason: "error" };
    }
  }, [getCurrentSessionToken]);

  // Revoke a specific session
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", sessionId);

      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: user.id,
            event_type: "session_revoked",
            event_description: "Revoked a session from another device",
          },
        }).catch(() => {}); // Fire and forget
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      toast({
        title: "Session Revoked",
        description: "The session has been signed out successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Revoke all other sessions
  const revokeAllOthersMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentToken = getCurrentSessionToken();

      // Revoke all sessions except current
      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .neq("session_token", currentToken || "");

      if (error) throw error;

      // Also sign out other Supabase auth sessions
      await supabase.auth.signOut({ scope: "others" });

      // Log activity
      supabase.functions.invoke("log-activity", {
        body: {
          user_id: user.id,
          event_type: "all_sessions_revoked",
          event_description: "Signed out all other devices",
        },
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
      toast({
        title: "All Other Sessions Revoked",
        description: "You have been signed out from all other devices.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to revoke sessions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create a new session record
  const createSession = useCallback(async (userId: string, rememberMe: boolean = false) => {
    const { browser, os, device } = getBrowserInfo();
    const sessionToken = generateSessionToken();
    
    // Store token locally
    localStorage.setItem("current_session_token", sessionToken);

    // Try to get location (non-blocking)
    let location: string | null = null;
    let ipAddress: string | null = null;
    
    try {
      const ipRes = await fetch("https://ipapi.co/json/", { 
        signal: AbortSignal.timeout(3000) 
      });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        ipAddress = ipData.ip || null;
        location = ipData.city && ipData.region 
          ? `${ipData.city}, ${ipData.region}` 
          : null;
      }
    } catch {
      // Silent fail - location is optional
    }

    // Insert session record
    await supabase.from("user_sessions").insert({
      user_id: userId,
      session_token: sessionToken,
      browser,
      os,
      device_name: device,
      ip_address: ipAddress,
      location,
      is_current: true,
      last_active_at: new Date().toISOString(),
      expires_at: rememberMe 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

    // Mark other sessions as not current
    await supabase
      .from("user_sessions")
      .update({ is_current: false })
      .eq("user_id", userId)
      .neq("session_token", sessionToken);

    return sessionToken;
  }, []);

  // Cleanup session on sign out
  const cleanupSession = useCallback(async () => {
    const sessionToken = getCurrentSessionToken();
    if (sessionToken) {
      await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("session_token", sessionToken);
      
      localStorage.removeItem("current_session_token");
    }
  }, [getCurrentSessionToken]);

  // Initialize and set up activity tracking
  useEffect(() => {
    if (!enabled) return;

    // Initial activity update
    updateActivity();
    setIsInitialized(true);

    // Set up periodic activity updates
    activityIntervalRef.current = setInterval(updateActivity, activityUpdateInterval);

    // Update activity on user interactions
    const handleActivity = () => {
      updateActivity();
    };

    // Throttled event listeners
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
    const throttledHandler = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        handleActivity();
        throttleTimeout = null;
      }, 10000); // 10 second throttle
    };

    window.addEventListener("click", throttledHandler, { passive: true });
    window.addEventListener("keydown", throttledHandler, { passive: true });
    window.addEventListener("scroll", throttledHandler, { passive: true });

    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      window.removeEventListener("click", throttledHandler);
      window.removeEventListener("keydown", throttledHandler);
      window.removeEventListener("scroll", throttledHandler);
    };
  }, [enabled, updateActivity, activityUpdateInterval]);

  // Check for session expiry on auth state changes
  useEffect(() => {
    if (!enabled || !onSessionExpired) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "TOKEN_REFRESHED") {
          // Token was refreshed - update activity
          updateActivity();
        } else if (event === "SIGNED_OUT") {
          // User signed out - cleanup
          cleanupSession();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [enabled, onSessionExpired, updateActivity, cleanupSession]);

  // Refresh token proactively before expiry
  useEffect(() => {
    if (!enabled) return;

    const checkAndRefreshToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if token expires within 5 minutes
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiryTime = expiresAt * 1000;
        const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
        
        if (expiryTime < fiveMinutesFromNow) {
          // Refresh the session
          await supabase.auth.refreshSession();
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefreshToken, 60000);
    
    // Initial check
    checkAndRefreshToken();

    return () => clearInterval(interval);
  }, [enabled]);

  return {
    // Session data
    sessions,
    currentSession,
    otherSessions,
    isLoadingSessions,
    sessionsError,
    isInitialized,
    
    // Actions
    refetchSessions,
    revokeSession: revokeSessionMutation.mutate,
    revokeAllOtherSessions: revokeAllOthersMutation.mutate,
    createSession,
    cleanupSession,
    checkSessionValidity,
    updateActivity,
    
    // Mutation states
    isRevokingSession: revokeSessionMutation.isPending,
    isRevokingAllOthers: revokeAllOthersMutation.isPending,
    
    // Utilities
    getCurrentSessionToken,
    generateSessionToken,
    getBrowserInfo,
  };
}
