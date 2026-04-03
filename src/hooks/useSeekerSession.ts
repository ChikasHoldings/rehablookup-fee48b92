import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface SeekerOutletContext {
  isAuthenticated: boolean;
  userName?: string;
}

function getSupabaseStorageKey() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'plckxokpyiubuekvodtc';
  return `sb-${projectRef}-auth-token`;
}

/**
 * Non-blocking session hook for seeker panel child pages.
 * Uses outlet context for isAuthenticated (from SeekerShell)
 * and restores user from localStorage synchronously to avoid getSession deadlocks.
 */
export function useSeekerSession() {
  const context = useOutletContext<SeekerOutletContext>();
  const isAuthenticated = context?.isAuthenticated ?? false;

  // Restore user synchronously from localStorage
  const getStoredUser = (): User | null => {
    try {
      const stored = localStorage.getItem(getSupabaseStorageKey());
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const session = parsed?.currentSession || parsed;
      return session?.user ?? null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState<User | null>(getStoredUser);
  const [isReady, setIsReady] = useState(!!getStoredUser());

  useEffect(() => {
    // Listen for auth changes (non-blocking)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsReady(true);
      }
    );

    // If we didn't get a user from storage, mark ready after a short timeout
    if (!getStoredUser()) {
      const t = setTimeout(() => setIsReady(true), 1500);
      return () => {
        clearTimeout(t);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAuthenticated,
    isReady: isReady || isAuthenticated,
  };
}