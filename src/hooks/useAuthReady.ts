import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Single source of truth for authentication readiness.
 * 
 * 1. Synchronously reads localStorage for instant initial state (no blank flash)
 * 2. Calls getSession() to restore the real session
 * 3. Subscribes to onAuthStateChange for live updates
 * 
 * isReady becomes true after getSession resolves (or immediately if stored session exists).
 * Pages should gate authenticated queries on `enabled: isReady && !!user`.
 */

function getSupabaseStorageKey() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'plckxokpyiubuekvodtc';
  return `sb-${projectRef}-auth-token`;
}

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(getSupabaseStorageKey());
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const session = parsed?.currentSession || parsed;
    return (session?.user as User) ?? null;
  } catch {
    return null;
  }
}

export function useAuthReady() {
  const storedUser = getStoredUser();
  const [user, setUser] = useState<User | null>(storedUser);
  // If we have a stored user, we're immediately "ready enough" to render
  const [isReady, setIsReady] = useState(!!storedUser);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // 1. Restore session from Supabase storage (authoritative)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted.current) return;
      setUser(session?.user ?? null);
      setIsReady(true);
    }).catch(() => {
      if (mounted.current) setIsReady(true);
    });

    // 2. Subscribe to live auth changes (sign in/out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted.current) return;
        setUser(session?.user ?? null);
        // Always ready after any auth event
        setIsReady(true);
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAuthenticated: !!user,
    isReady,
  };
}
