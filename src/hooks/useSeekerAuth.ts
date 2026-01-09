import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SeekerProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  zipcode: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
}

export function useSeekerAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SeekerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeker, setIsSeeker] = useState(false);
  
  // Derive email verification from user's email_confirmed_at
  const isEmailVerified = !!user?.email_confirmed_at;

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('seeker_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data);
      setIsSeeker(true);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsSeeker(false);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    });
    
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Log successful sign-in
    if (!error && data.user) {
      try {
        await supabase.from("account_activity_log").insert([{
          user_id: data.user.id,
          event_type: "sign_in",
          event_description: "Signed in to account",
          metadata: {},
        }]);
      } catch {
        // Silently fail - don't break sign-in if logging fails
      }
    }
    
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsSeeker(false);
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Pick<SeekerProfile, 'display_name' | 'avatar_url'>>) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { data, error } = await supabase
      .from('seeker_profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (data) {
      setProfile(data);
    }
    
    return { data, error };
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return { error: new Error('No email found') };
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    
    return { error };
  };

  return {
    user,
    session,
    profile,
    isLoading,
    isSeeker,
    isAuthenticated: !!user,
    isEmailVerified,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resendVerificationEmail
  };
}
