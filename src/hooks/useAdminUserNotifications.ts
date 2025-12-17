import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminError } from "@/lib/adminErrorLogger";

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
        logAdminError("useAdminUserNotifications", "fetch_notifications", error, { queryKey: "admin-user-notifications" });
        return [];
      }
      return (data || []) as AdminUserNotification[];
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  // Log query errors
  useEffect(() => {
    if (error) {
      logAdminError("useAdminUserNotifications", "query_error", error, { queryKey: "admin-user-notifications" });
    }
  }, [error]);

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
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
    },
    onError: (error: Error) => {
      logAdminError("useAdminUserNotifications", "mark_as_read", error, { mutation: "markAsRead" });
      toast.error("Failed to mark as read", { description: error.message });
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
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: (error: Error) => {
      logAdminError("useAdminUserNotifications", "mark_all_as_read", error, { mutation: "markAllAsRead" });
      toast.error("Failed to mark all as read", { description: error.message });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("admin_user_notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
      toast.success("Notification deleted");
    },
    onError: (error: Error) => {
      logAdminError("useAdminUserNotifications", "delete_notification", error, { mutation: "deleteNotification" });
      toast.error("Failed to delete notification", { description: error.message });
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
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-notifications"] });
      toast.success("All notifications cleared");
    },
    onError: (error: Error) => {
      logAdminError("useAdminUserNotifications", "delete_all", error, { mutation: "deleteAll" });
      toast.error("Failed to clear notifications", { description: error.message });
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
