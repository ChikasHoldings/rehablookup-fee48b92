import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export function useAdminNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching admin notifications:", error);
        return [];
      }
      return (data || []) as AdminNotification[];
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_notifications",
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
          
          // Show toast for new notifications
          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as AdminNotification;
            toast.info(newNotif.title, {
              description: newNotif.message,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to mark as read", { description: error.message });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: (error: Error) => {
      toast.error("Failed to mark all as read", { description: error.message });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete notification", { description: error.message });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("All notifications cleared");
    },
    onError: (error: Error) => {
      toast.error("Failed to clear notifications", { description: error.message });
    },
  });

  // Create a new notification (for manual/testing purposes)
  const createNotificationMutation = useMutation({
    mutationFn: async (notification: { type: string; title: string; message: string; metadata?: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("admin_notifications")
        .insert([{
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: (notification.metadata || {}) as any,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create notification", { description: error.message });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    deleteAll: deleteAllMutation.mutate,
    createNotification: createNotificationMutation.mutate,
    isCreating: createNotificationMutation.isPending,
  };
}
