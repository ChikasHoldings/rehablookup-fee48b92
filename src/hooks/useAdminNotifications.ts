import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAdminError } from "@/lib/adminErrorLogger";

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
        .select("id, title, message, type, read, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error('[useAdminNotifications] Fetch error:', error);
        logAdminError("useAdminNotifications", "fetch_notifications", error, { queryKey: "admin-notifications" });
        return [];
      }
      
      return (data || []) as AdminNotification[];
    },
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Log query errors
  useEffect(() => {
    if (error) {
      logAdminError("useAdminNotifications", "query_error", error, { queryKey: "admin-notifications" });
    }
  }, [error]);

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
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-notifications"] });
      const previousNotifications = queryClient.getQueryData<AdminNotification[]>(["admin-notifications"]);
      
      // Optimistically update
      queryClient.setQueryData<AdminNotification[]>(["admin-notifications"], (old) => {
        if (!old) return old;
        return old.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      });
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["admin-notifications"], context.previousNotifications);
      }
      logAdminError("useAdminNotifications", "mark_as_read", error, { mutation: "markAsRead" });
      toast.error("Failed to mark as read", { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["admin-notifications"] });
      const previousNotifications = queryClient.getQueryData<AdminNotification[]>(["admin-notifications"]);
      
      // Optimistically update all as read
      queryClient.setQueryData<AdminNotification[]>(["admin-notifications"], (old) => {
        if (!old) return old;
        return old.map((n) => ({ ...n, read: true }));
      });
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["admin-notifications"], context.previousNotifications);
      }
      logAdminError("useAdminNotifications", "mark_all_as_read", error, { mutation: "markAllAsRead" });
      toast.error("Failed to mark all as read", { description: error.message });
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-notifications"] });
      const previousNotifications = queryClient.getQueryData<AdminNotification[]>(["admin-notifications"]);
      
      // Optimistically remove
      queryClient.setQueryData<AdminNotification[]>(["admin-notifications"], (old) => {
        if (!old) return old;
        return old.filter((n) => n.id !== notificationId);
      });
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["admin-notifications"], context.previousNotifications);
      }
      logAdminError("useAdminNotifications", "delete_notification", error, { mutation: "deleteNotification" });
      toast.error("Failed to delete notification", { description: error.message });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      // Delete all notifications - use gte on created_at to ensure we get all records
      const { error } = await supabase
        .from("admin_notifications")
        .delete()
        .gte("created_at", "1970-01-01T00:00:00Z");
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["admin-notifications"] });
      const previousNotifications = queryClient.getQueryData<AdminNotification[]>(["admin-notifications"]);
      
      // Optimistically clear all
      queryClient.setQueryData<AdminNotification[]>(["admin-notifications"], []);
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["admin-notifications"], context.previousNotifications);
      }
      logAdminError("useAdminNotifications", "delete_all", error, { mutation: "deleteAll" });
      toast.error("Failed to clear notifications", { description: error.message });
    },
    onSuccess: () => {
      toast.success("All notifications cleared");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
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
      logAdminError("useAdminNotifications", "create_notification", error, { mutation: "createNotification" });
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
