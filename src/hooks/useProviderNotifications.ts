import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProviderNotification {
  id: string;
  user_id: string;
  facility_id: string | null;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// Simple notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA0AFQN/kI6sxr2UXQAAxuzXooRCBgmQx+/FeSQNTfj3vE8PFq3s7qF1IkJ1wdbhoF4XLpG/xaCJTitdoNm6qXlPVYCgzcDBm2s5RnKUwdDFvJFfRFZ9l7bRzcKqeE1Laz5LWnSUqbXCzL+pgV1AMDlXboSZq7q+xb6uhFk6LkNedI6iu8XDu65/VDAsOlV5lq3Cx7+0qIhfQC8yTGJ+mbO/wruzqopiQy4sRV12j6S2wcS7t6+JYEQsKUBYcoabrrzAuba1qotgRCsmP1RvgoySnaWtsLe4ubaxqp+ThntuZV5bXmNqc4CQnq20uLy6tq+ij3xrX1NLSkpOVl9sdIiXpay0trStpJqOgnZqYFhTUldaX2hxgI2Zoa2ys7Cvqp2PhHpvZ2JfX2FlaXJ5g4+Yoqqvs7OvrKaclIqBd3FtaWpsb3R5gImRmqGnq66vraqknpaNhH15dnV1dnh7foSKkJebnqOlp6elo5+blo+JhIB9fHt7fH6Bh4yRlpmcnqCgo6OioJ2ZlpKOioeDgYGBgoWIjJCTlpmbnZ+goaKioaCemZaRjYqIhoWEhYaHioyPkpWYmpydn5+goKCfnpyZl5SSj4yLioqKi4yNj5KUlpianJ2en5+fnp2cm5mWk5GQjo2NjY2OjpCSlJaYmZudnZ6enp2cm5qYlpSTkZCPj4+Pj5CRkpSVl5mam5ycnZ2dnJuamJeVk5KRkJCQkJCRkpOUlZaXmJmanJycnJybmpmYl5WUk5KRkZGRkZGSkpOUlZaXmJmampubm5uamZiXlpWUk5OSkpKSkpOTk5SVlpaXmJmZmpqampqZmZiXlpWVlJSUk5OTk5SUlJWVlpaXl5iYmZmZmZmYmJeWlpWVlJSUlJSUlJSVlZWWlpeXl5iYmJiYmJeXlpaWlZWVlZWVlZWVlZaWlpaWl5eXl5eXl5eXlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpeXl5eXl5eXl5aWlpaWlpaWlpaWlpaWlpaWlpaWlpeXl5eXl5eX";

export function useProviderNotifications() {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element on mount
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      audioRef.current = null;
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        if (import.meta.env.DEV) console.log("Could not play notification sound:", err);
      });
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.svg",
        tag: "rehablookup-lead",
      });
      notification.onclick = () => {
        window.focus();
        window.location.href = "/provider/inquiries";
        notification.close();
      };
      setTimeout(() => notification.close(), 5000);
    }
  }, []);

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["provider-notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("provider_notifications")
        .select("id, user_id, facility_id, title, message, type, read, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as ProviderNotification[];
    },
    staleTime: 30 * 1000,
  });

  // Real-time subscription for instant updates - filtered by user_id
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel("provider-notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "provider_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as ProviderNotification;
            
            // Play sound and show browser notification
            playNotificationSound();
            showBrowserNotification(newNotification.title, newNotification.message);
            
            // Update cache immediately for instant UI update
            queryClient.setQueryData<ProviderNotification[]>(["provider-notifications"], (old) => {
              if (!old) return [newNotification];
              // Avoid duplicates
              if (old.some(n => n.id === newNotification.id)) return old;
              return [newNotification, ...old];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "provider_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedNotification = payload.new as ProviderNotification;
            queryClient.setQueryData<ProviderNotification[]>(["provider-notifications"], (old) => {
              if (!old) return old;
              return old.map(n => n.id === updatedNotification.id ? updatedNotification : n);
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "provider_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id;
            queryClient.setQueryData<ProviderNotification[]>(["provider-notifications"], (old) => {
              if (!old) return old;
              return old.filter(n => n.id !== deletedId);
            });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient, playNotificationSound, showBrowserNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("provider_notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["provider-notifications"] });
      const previousNotifications = queryClient.getQueryData<ProviderNotification[]>(["provider-notifications"]);
      
      // Optimistically update
      queryClient.setQueryData<ProviderNotification[]>(["provider-notifications"], (old) => {
        if (!old) return old;
        return old.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      });
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["provider-notifications"], context.previousNotifications);
      }
      toast.error("Failed to mark as read");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("provider_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["provider-notifications"] });
      const previousNotifications = queryClient.getQueryData<ProviderNotification[]>(["provider-notifications"]);
      
      // Optimistically update all as read
      queryClient.setQueryData<ProviderNotification[]>(["provider-notifications"], (old) => {
        if (!old) return old;
        return old.map((n) => ({ ...n, read: true }));
      });
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["provider-notifications"], context.previousNotifications);
      }
      toast.error("Failed to mark all as read");
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("provider_notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["provider-notifications"] });
      const previousNotifications = queryClient.getQueryData<ProviderNotification[]>(["provider-notifications"]);
      
      // Optimistically remove
      queryClient.setQueryData<ProviderNotification[]>(["provider-notifications"], (old) => {
        if (!old) return old;
        return old.filter((n) => n.id !== notificationId);
      });
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["provider-notifications"], context.previousNotifications);
      }
      toast.error("Failed to delete notification");
    },
    onSuccess: () => {
      toast.success("Notification deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-notifications"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("provider_notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["provider-notifications"] });
      const previousNotifications = queryClient.getQueryData<ProviderNotification[]>(["provider-notifications"]);
      
      // Optimistically clear all
      queryClient.setQueryData<ProviderNotification[]>(["provider-notifications"], []);
      
      return { previousNotifications };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["provider-notifications"], context.previousNotifications);
      }
      toast.error("Failed to clear notifications");
    },
    onSuccess: () => {
      toast.success("All notifications cleared");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-notifications"] });
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
