import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type AlertFrequency = "off" | "daily" | "weekly";

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  criteria: Record<string, unknown>;
  search_url: string;
  alert_frequency: AlertFrequency;
  last_alert_sent_at: string | null;
  last_match_count: number;
  created_at: string;
  updated_at: string;
}

export interface SavedSearchInput {
  name: string;
  criteria: Record<string, unknown>;
  search_url: string;
  alert_frequency?: AlertFrequency;
}

const QUERY_KEY = ["saved-searches"];

function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  return user;
}

export function useSavedSearches() {
  const user = useAuthUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SavedSearch[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedSearch[];
    },
  });

  // Cross-device realtime sync. saved_searches was added to
  // supabase_realtime in migration 20260702000000. Any insert /
  // update / delete from another tab / device propagates here within
  // ~200ms. We just invalidate the query and let React Query refetch;
  // optimistic updates from the mutations above keep the local view
  // snappy for same-tab writes.
  useEffect(() => {
    if (!user) return;
    // Per-instance random suffix: this hook is also called by every
    // SavedSearchCard, so a shared channel name would collide ("cannot add
    // postgres_changes callbacks after subscribe") on the 2nd+ mount.
    const channel = supabase
      .channel(`saved-searches-${user.id}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saved_searches", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const create = useMutation({
    mutationFn: async (input: SavedSearchInput): Promise<SavedSearch> => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        name: input.name,
        criteria: input.criteria,
        search_url: input.search_url,
        alert_frequency: input.alert_frequency ?? "off",
      };
      const { data, error } = await supabase
        .from("saved_searches")
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as SavedSearch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SavedSearchInput> }): Promise<SavedSearch> => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("saved_searches")
        .update(patch as never)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as SavedSearch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("saved_searches")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const findByUrl = useCallback((url: string): SavedSearch | undefined => {
    return (query.data ?? []).find((s) => s.search_url === url);
  }, [query.data]);

  return {
    user,
    isAuthenticated: !!user,
    searches: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    create,
    update,
    remove,
    findByUrl,
  };
}
