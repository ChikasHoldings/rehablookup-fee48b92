import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export function useAdminUserNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["admin-user-notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("admin_user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching admin user notifications:", error);
        return [];
      }
      return (data || []) as AdminUserNotification[];
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("admin-user-notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("admin_user_notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) console.error("Error marking notification as read:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("admin_user_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) console.error("Error marking all as read:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("admin_user_notifications")
        .delete()
        .eq("id", notificationId);
      if (error) console.error("Error deleting notification:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("admin_user_notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) console.error("Error deleting all notifications:", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    deleteAll: deleteAllMutation.mutate,
  };
}
