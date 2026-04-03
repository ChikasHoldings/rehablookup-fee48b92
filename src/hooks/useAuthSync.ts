import { useState, useEffect, useCallback, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Check our custom email_verification_codes table (not Supabase's email_confirmed_at)
async function checkCustomEmailVerified(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from('email_verification_codes')
    .select('verified')
    .eq('email', email.toLowerCase())
    .eq('verified', true)
    .maybeSingle();
  return !!data;
}

interface AuthSyncState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  error: Error | null;
}

interface UseAuthSyncOptions {
  onAuthChange?: (event: string, session: Session | null) => void;
  onTokenRefreshed?: () => void;
  onSessionExpired?: () => void;
}

/**
 * Low-level auth synchronization hook that provides reliable session state
 * across the entire application. This hook:
 * 
 * 1. Establishes auth state listener BEFORE checking existing session
 * 2. Handles race conditions with proper initialization ordering
 * 3. Implements safety timeouts to prevent infinite loading
 * 4. Provides proactive token refresh before expiry
 * 5. Broadcasts auth changes across tabs using BroadcastChannel
 */
export function useAuthSync(options: UseAuthSyncOptions = {}): AuthSyncState {
  const { onAuthChange, onTokenRefreshed, onSessionExpired } = options;
  
  const [state, setState] = useState<AuthSyncState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isEmailVerified: false,
    error: null,
  });

  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Broadcast auth state changes to other tabs
  const broadcastAuthChange = useCallback((event: string, session: Session | null) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ event, hasSession: !!session });
      } catch {
        // BroadcastChannel may not be supported
      }
    }
  }, []);

  // Proactive token refresh
  const checkAndRefreshToken = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if token expires within 5 minutes
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiryTime = expiresAt * 1000;
        const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
        
        if (expiryTime < fiveMinutesFromNow) {
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.warn("[useAuthSync] Token refresh failed:", error.message);
            onSessionExpired?.();
          } else if (data.session && mountedRef.current) {
            setState(prev => ({
              ...prev,
              session: data.session,
              user: data.session?.user ?? null,
            }));
            onTokenRefreshed?.();
          }
        }
      }
    } catch (err) {
      console.error("[useAuthSync] Error checking token:", err);
    }
  }, [onSessionExpired, onTokenRefreshed]);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Initialize BroadcastChannel for cross-tab sync
    try {
      broadcastChannelRef.current = new BroadcastChannel("auth_sync");
      broadcastChannelRef.current.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        // Another tab signed in/out - refetch session
        if (event.data.event === "SIGNED_IN" || event.data.event === "SIGNED_OUT") {
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (mountedRef.current) {
              const verified = await checkCustomEmailVerified(session?.user?.email ?? undefined);
              setState(prev => ({
                ...prev,
                session,
                user: session?.user ?? null,
                isAuthenticated: !!session,
                isEmailVerified: verified,
              }));
            }
          });
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    // CRITICAL: Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return;

        // Skip during initialization - initializeAuth handles it
        if (!initializedRef.current && event !== "INITIAL_SESSION") {
          return;
        }

        // Update state
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
          isEmailVerified: !!session?.user?.email_confirmed_at,
          isLoading: false,
          error: null,
        }));

        // Broadcast to other tabs
        broadcastAuthChange(event, session);

        // Call external handler
        onAuthChange?.(event, session);

        // Handle specific events
        if (event === "TOKEN_REFRESHED") {
          onTokenRefreshed?.();
        } else if (event === "SIGNED_OUT") {
          onSessionExpired?.();
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;

        if (error) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error,
          }));
          initializedRef.current = true;
          return;
        }

        setState({
          session,
          user: session?.user ?? null,
          isLoading: false,
          isAuthenticated: !!session,
          isEmailVerified: !!session?.user?.email_confirmed_at,
          error: null,
        });
        
        initializedRef.current = true;
      } catch (err) {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err : new Error("Auth initialization failed"),
          }));
          initializedRef.current = true;
        }
      }
    };

    initializeAuth();

    // Safety timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mountedRef.current && !initializedRef.current) {
        console.warn("[useAuthSync] Auth initialization timed out");
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
        initializedRef.current = true;
      }
    }, 5000);

    // Set up proactive token refresh
    refreshIntervalRef.current = setInterval(checkAndRefreshToken, 60000); // Every minute
    
    // Initial token check
    checkAndRefreshToken();

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [onAuthChange, onTokenRefreshed, onSessionExpired, broadcastAuthChange, checkAndRefreshToken]);

  return state;
}

/**
 * Hook to sync auth state across components without re-initializing
 * Uses a simple polling approach for components that don't need real-time updates
 */
export function useAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setIsAuthenticated(!!session);
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        if (mounted) {
          setIsAuthenticated(!!session);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAuthenticated, isLoading };
}
