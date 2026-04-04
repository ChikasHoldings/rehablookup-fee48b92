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

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(getSupabaseStorageKey());
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const session = parsed?.currentSession || parsed;
    return session?.user ?? null;
  } catch {
    return null;
  }
}

/**
 * Non-blocking session hook for seeker panel child pages.
 * Trusts restored local session immediately, then reconciles with live auth events.
 */
export function useSeekerSession() {
  const context = useOutletContext<SeekerOutletContext | undefined>();
  const initialUser = getStoredUser();

  const [user, setUser] = useState<User | null>(initialUser);
  const [isReady, setIsReady] = useState(!!initialUser);

  const outletAuthenticated = context?.isAuthenticated ?? false;
  const isAuthenticated = outletAuthenticated || !!user;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setIsReady(true);
      }
    );

    if (!initialUser) {
      const t = setTimeout(() => setIsReady(true), 1500);
      return () => {
        clearTimeout(t);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, [initialUser]);

  return {
    user,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAuthenticated,
    isReady: isReady || isAuthenticated,
  };
}
