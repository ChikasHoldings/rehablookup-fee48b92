import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const FAVORITES_STORAGE_KEY = 'treatment-center-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

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
      console.log('[useFavorites] Syncing favorites for user:', user.id);

      setIsLoading(true);

      // Fetch user's favorites from database
      const { data: dbFavorites, error } = await supabase
        .from('user_favorites')
        .select('facility_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('[useFavorites] Error fetching favorites:', error);
        setIsLoading(false);
        return;
      }
      
      console.log('[useFavorites] Loaded', dbFavorites?.length || 0, 'favorites from DB');

      const dbFavoriteIds = dbFavorites?.map(f => f.facility_id) || [];
      
      // Get local favorites that aren't already in database
      let localFavoritesToSync: string[] = [];
      try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        const localFavorites = stored ? JSON.parse(stored) : [];
        localFavoritesToSync = localFavorites.filter((id: string) => !dbFavoriteIds.includes(id));
      } catch {
        // Ignore parse errors
      }
      
      // Merge: add local favorites to database that aren't already there
      if (localFavoritesToSync.length > 0) {
        const insertPromises = localFavoritesToSync.map(facilityId =>
          supabase
            .from('user_favorites')
            .insert({ user_id: user.id, facility_id: facilityId })
            .select()
        );

        await Promise.allSettled(insertPromises);
      }

      // Set combined favorites
      const allFavorites = [...new Set([...dbFavoriteIds, ...localFavoritesToSync])];
      setFavorites(allFavorites);
      setIsSynced(true);
      
      // Mark as synced for this user
      syncedUserIdRef.current = user.id;
      isSyncingRef.current = false;
      setIsLoading(false);

      // Update localStorage
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(allFavorites));
      } catch {
        // Storage quota exceeded or unavailable
      }
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
