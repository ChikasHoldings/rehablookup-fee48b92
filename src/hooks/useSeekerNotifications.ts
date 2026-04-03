import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SeekerNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

// Simple notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA0AFQN/kI6sxr2UXQAAxuzXooRCBgmQx+/FeSQNTfj3vE8PFq3s7qF1IkJ1wdbhoF4XLpG/xaCJTitdoNm6qXlPVYCgzcDBm2s5RnKUwdDFvJFfRFZ9l7bRzcKqeE1Laz5LWnSUqbXCzL+pgV1AMDlXboSZq7q+xb6uhFk6LkNedI6iu8XDu65/VDAsOlV5lq3Cx7+0qIhfQC8yTGJ+mbO/wruzqopiQy4sRV12j6S2wcS7t6+JYEQsKUBYcoabrrzAuba1qotgRCsmP1RvgoySnaWtsLe4ubaxqp+ThntuZV5bXmNqc4CQnq20uLy6tq+ij3xrX1NLSkpOVl9sdIiXpay0trStpJqOgnZqYFhTUldaX2hxgI2Zoa2ys7Cvqp2PhHpvZ2JfX2FlaXJ5g4+Yoqqvs7OvrKaclIqBd3FtaWpsb3R5gImRmqGnq66vraqknpaNhH15dnV1dnh7foSKkJebnqOlp6elo5+blo+JhIB9fHt7fH6Bh4yRlpmcnqCgo6OioJ2ZlpKOioeDgYGBgoWIjJCTlpmbnZ+goaKioaCemZaRjYqIhoWEhYaHioyPkpWYmpydn5+goKCfnpyZl5SSj4yLioqKi4yNj5KUlpianJ2en5+fnp2cm5mWk5GQjo2NjY2OjpCSlJaYmZudnZ6enp2cm5qYlpSTkZCPj4+Pj5CRkpSVl5mam5ycnZ2dnJuamJeVk5KRkJCQkJCRkpOUlZaXmJmanJycnJybmpmYl5WUk5KRkZGRkZGSkpOUlZaXmJmampubm5uamZiXlpWUk5OSkpKSkpOTk5SVlpaXmJmZmpqampqZmZiXlpWVlJSUk5OTk5SUlJWVlpaXl5iYmZmZmZmYmJeWlpWVlJSUlJSUlJSVlZWWlpeXl5iYmJiYmJeXlpaWlZWVlZWVlZWVlZaWlpaWl5eXl5eXl5eXlpaWlpaWlpaWlpaWlpaWlpaWlpaWlpeXl5eXl5eXl5aWlpaWlpaWlpaWlpaWlpaWlpaWlpeXl5eXl5eX";

// Get stored user ID from localStorage (non-blocking)
function getStoredUserId(): string | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'plckxokpyiubuekvodtc';
    const storageKey = `sb-${projectRef}-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const session = parsed?.currentSession || parsed;
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export function useSeekerNotifications() {
  const [notifications, setNotifications] = useState<SeekerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousNotificationsRef = useRef<string[]>([]);
  const userIdRef = useRef<string | null>(getStoredUserId());

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
        console.log("Could not play notification sound:", err);
      });
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, link?: string | null) => {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.svg",
        tag: "rehablookup-seeker",
      });
      notification.onclick = () => {
        window.focus();
        if (link) {
          window.location.href = link;
        }
        notification.close();
      };
      setTimeout(() => notification.close(), 5000);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const uid = userIdRef.current || getStoredUserId();
    if (!uid) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    userIdRef.current = uid;

    try {
      const { data, error } = await supabase
        .from("seeker_notifications")
        .select("id, user_id, type, title, message, link, metadata, read, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[useSeekerNotifications] Fetch error:", error);
        return;
      }

      const notifs = (data || []) as SeekerNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      previousNotificationsRef.current = notifs.map(n => n.id);
    } catch (err) {
      console.error("[useSeekerNotifications] Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      // Update user ID from auth state change or stored value
      const uid = userIdRef.current || getStoredUserId();
      if (!uid) {
        setIsLoading(false);
        return;
      }
      userIdRef.current = uid;

      await fetchNotifications();

      // Subscribe to realtime updates filtered by user_id
      channel = supabase
        .channel("seeker-notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "seeker_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const newNotification = payload.new as SeekerNotification;
            
            // Check if this is a genuinely new notification
            if (!previousNotificationsRef.current.includes(newNotification.id)) {
              playNotificationSound();
              showBrowserNotification(
                newNotification.title,
                newNotification.message,
                newNotification.link
              );
              
              // Update local state immediately
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
              previousNotificationsRef.current = [newNotification.id, ...previousNotificationsRef.current];
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "seeker_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const updatedNotification = payload.new as SeekerNotification;
            setNotifications(prev => {
              const updated = prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n));
              setUnreadCount(updated.filter(n => !n.read).length);
              return updated;
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "seeker_notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id;
            setNotifications(prev => {
              const updated = prev.filter(n => n.id !== deletedId);
              setUnreadCount(updated.filter(n => !n.read).length);
              return updated;
            });
            previousNotificationsRef.current = previousNotificationsRef.current.filter(id => id !== deletedId);
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
  }, [fetchNotifications, playNotificationSound, showBrowserNotification]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const uid = userIdRef.current;
      if (!uid) return;

      const { error } = await supabase
        .from("seeker_notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", uid);

      if (error) throw error;
    } catch (err) {
      console.error("Error marking notification as read:", err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("seeker_notifications")
        .update({ read: true })
        .eq("user_id", session.user.id)
        .eq("read", false);

      if (error) throw error;
      
      toast({
        title: "All notifications marked as read",
      });
    } catch (err) {
      console.error("Error marking all as read:", err);
      // Revert on error
      fetchNotifications();
    }
  }, [toast, fetchNotifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    // Optimistic update — capture unread status before removing
    setNotifications(prev => {
      const target = prev.find(n => n.id === notificationId);
      if (target && !target.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("seeker_notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", session.user.id);

      if (error) throw error;
    } catch (err) {
      console.error("Error deleting notification:", err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}