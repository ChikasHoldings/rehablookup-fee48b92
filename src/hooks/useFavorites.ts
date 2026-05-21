import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

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
      const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'mldbxpntzcjalgjmwnqa';
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

      // Migrate any guest-mode favorites collected before signin into the
      // user's account. The previous behavior unconditionally cleared
      // localStorage, dropping a favorite list a user had built while
      // browsing anonymously and then signed up. We now upsert the
      // difference and only clear local once the merge succeeded.
      let guestFavorites: string[] = [];
      try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) guestFavorites = parsed.filter((v) => typeof v === "string");
        }
      } catch {
        // Storage unavailable / corrupt JSON — skip merge.
      }

      const toMigrate = guestFavorites.filter((id) => !dbFavoriteIds.includes(id));
      let mergedIds = dbFavoriteIds;
      if (toMigrate.length > 0) {
        const rows = toMigrate.map((facility_id) => ({ user_id: user.id, facility_id }));
        const { error: mergeErr } = await supabase
          .from('user_favorites')
          .upsert(rows, { onConflict: 'user_id,facility_id', ignoreDuplicates: true });
        if (!mergeErr) {
          mergedIds = [...dbFavoriteIds, ...toMigrate];
        } else {
          console.warn('[useFavorites] guest-favorite migrate failed; keeping local copy', mergeErr.message);
        }
      }

      // Only clear local copy once we know the DB write succeeded (or there
      // was nothing to migrate). On a failed merge we leave the local copy
      // so the next sign-in attempt can retry.
      if (toMigrate.length === 0 || mergedIds.length > dbFavoriteIds.length) {
        try { localStorage.removeItem(FAVORITES_STORAGE_KEY); } catch { /* ignore */ }
      }

      setFavorites(mergedIds);
      setIsSynced(true);

      syncedUserIdRef.current = user.id;
      isSyncingRef.current = false;
      setIsLoading(false);
    };

    syncFavorites();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depends only on user.id; re-running on the full user object would cause unnecessary re-syncs
  }, [user?.id]);

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

  // Returns true on success (state matches what the user intended) and
  // false on persisted failure. Callers like SeekerSaved use the result
  // to decide whether to apply local-state optimistic edits + success
  // toasts; the failure toast itself is emitted from inside the hook.
  const toggleFavorite = useCallback(async (centerId: string): Promise<boolean> => {
    const isFavorited = favorites.includes(centerId);

    // Optimistic update
    setFavorites(prev => {
      if (isFavorited) {
        return prev.filter(id => id !== centerId);
      }
      return [...prev, centerId];
    });

    // Guest mode: localStorage write happens via the effect; nothing
    // can fail at the network layer, so signal success.
    if (!user) return true;

    if (isFavorited) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('facility_id', centerId);

      if (error) {
        console.error('Error removing favorite:', error);
        setFavorites(prev => (prev.includes(centerId) ? prev : [...prev, centerId]));
        toast({
          title: "Couldn't remove from saved",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    }

    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: user.id, facility_id: centerId });

    // 23505 is a unique-violation — already saved (e.g. tab race).
    // Don't surface that as an error; the desired state is reached.
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('Error adding favorite:', error);
      setFavorites(prev => prev.filter(id => id !== centerId));
      toast({
        title: "Couldn't save facility",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [favorites, user]);

  // Realtime cross-device sync. user_favorites was added to
  // supabase_realtime in migration 20260702000000 so this subscription
  // actually receives events. INSERT and DELETE both feed back into
  // `favorites` so the bookmark toggled on one device shows up on
  // another within ~200ms. Filtered server-side by user_id; RLS also
  // gates the row visibility independently.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-favorites-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_favorites', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const fid = (payload.new as { facility_id?: string }).facility_id;
          if (!fid) return;
          setFavorites(prev => (prev.includes(fid) ? prev : [...prev, fid]));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'user_favorites', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const fid = (payload.old as { facility_id?: string }).facility_id;
          if (!fid) return;
          setFavorites(prev => prev.filter(id => id !== fid));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
