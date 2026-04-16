import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const FAVORITES_STORAGE_KEY = 'treatment-center-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  // We no longer initialize from localStorage — DB is the source of truth for logged-in users.
  // Guest favorites are loaded from localStorage only after confirming no user session.
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  
  // Track synced user ID to prevent duplicate syncs
  const syncedUserIdRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  // Listen for auth changes
  useEffect(() => {
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
        }
      }
    );

    // Restore user from localStorage synchronously to avoid getSession deadlock
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'plckxokpyiubuekvodtc';
      const storageKey = `sb-${projectRef}-auth-token`;
      const stored = localStorage.getItem(storageKey);
      if (stored && mounted) {
        const parsed = JSON.parse(stored);
        const session = parsed?.currentSession || parsed;
        if (session?.user) {
          setUser(session.user);
        }
      }
    } catch {
      // Ignore storage errors
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sync favorites with database when user logs in
  useEffect(() => {
    const syncFavorites = async () => {
      // Skip if no user or already synced for this user
      if (!user) {
        // Guest mode: load from localStorage
        try {
          const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
          setFavorites(stored ? JSON.parse(stored) : []);
        } catch {
          setFavorites([]);
        }
        setIsLoading(false);
        setIsSynced(false);
        syncedUserIdRef.current = null;
        return;
      }
      
      // Prevent duplicate syncs for the same user
      if (syncedUserIdRef.current === user.id || isSyncingRef.current) {
        return;
      }
      
      isSyncingRef.current = true;
      setIsLoading(true);

      // Fetch user's favorites from database
      const { data: dbFavorites, error } = await supabase
        .from('user_favorites')
        .select('facility_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('[useFavorites] Error fetching favorites:', error);
        setIsLoading(false);
        isSyncingRef.current = false;
        return;
      }

      const dbFavoriteIds = dbFavorites?.map(f => f.facility_id) || [];
      
      // DB is the absolute source of truth for authenticated users.
      // Clear any stale localStorage immediately — never inherit guest favorites.
      try {
        localStorage.removeItem(FAVORITES_STORAGE_KEY);
      } catch {
        // Storage unavailable
      }

      setFavorites(dbFavoriteIds);
      setIsSynced(true);
      
      // Mark as synced for this user
      syncedUserIdRef.current = user.id;
      isSyncingRef.current = false;
      setIsLoading(false);
    };

    syncFavorites();
  }, [user?.id]); // Only re-run when user ID changes, not the entire user object

  // Persist to localStorage when favorites change (for guests)
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      } catch {
        // Storage quota exceeded or unavailable
      }
    }
  }, [favorites, user]);

  const toggleFavorite = useCallback(async (centerId: string) => {
    const isFavorited = favorites.includes(centerId);
    
    // Optimistic update
    setFavorites(prev => {
      if (isFavorited) {
        return prev.filter(id => id !== centerId);
      }
      return [...prev, centerId];
    });

    // If user is logged in, sync with database
    if (user) {
      if (isFavorited) {
        // Remove from database
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('facility_id', centerId);
        
        if (error) {
          console.error('Error removing favorite:', error);
          // Revert on error
          setFavorites(prev => [...prev, centerId]);
        }
      } else {
        // Add to database
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, facility_id: centerId });
        
        if (error) {
          console.error('Error adding favorite:', error);
          // Revert on error
          setFavorites(prev => prev.filter(id => id !== centerId));
        }
      }
    }
  }, [favorites, user]);

  const isFavorite = useCallback((centerId: string) => {
    return favorites.includes(centerId);
  }, [favorites]);

  const clearFavorites = useCallback(async () => {
    if (user) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id);
    }
    setFavorites([]);
    try {
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  }, [user]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    favoritesCount: favorites.length,
    isLoading,
    isSynced,
    isAuthenticated: !!user
  };
}
