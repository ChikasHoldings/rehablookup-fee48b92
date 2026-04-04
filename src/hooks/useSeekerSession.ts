import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface SeekerOutletContext {
  isAuthenticated: boolean;
  userName?: string;
  userId?: string;
}

function getSupabaseStorageKey() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'plckxokpyiubuekvodtc';
  return `sb-${projectRef}-auth-token`;
}

function getStoredSession(): { user: User | null; } {
  try {
    const stored = localStorage.getItem(getSupabaseStorageKey());
    if (!stored) return { user: null };
    const parsed = JSON.parse(stored);
    const session = parsed?.currentSession || parsed;
    return { user: session?.user ?? null };
  } catch {
    return { user: null };
  }
}

/**
 * Non-blocking session hook for seeker panel child pages.
 * 
 * CRITICAL: This hook is designed to NEVER cause blank pages.
 * It trusts the parent SeekerShell's outlet context immediately,
 * restores from localStorage synchronously, and only uses
 * onAuthStateChange for live updates — never as a gate.
 */
export function useSeekerSession() {
  const context = useOutletContext<SeekerOutletContext | undefined>();
  const stored = getStoredSession();

  const [user, setUser] = useState<User | null>(stored.user);
  const subscribed = useRef(false);

  // The shell already verified auth — trust it immediately
  const outletAuthenticated = context?.isAuthenticated ?? false;
  const isAuthenticated = outletAuthenticated || !!user;

  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;

    // Get fresh session in background (non-blocking)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscribed.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    isAuthenticated,
    // ALWAYS ready — we either have stored session or shell context
    // Pages should never blank waiting for this
    isReady: true,
  };
}
