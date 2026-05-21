import { useState, useEffect, useCallback, useRef } from "react";
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

// Window-scoped dedup set. The hook is mounted in TWO places when the
// user is on /account/notifications (the SeekerHeader dropdown AND the
// page itself), and Supabase realtime delivers the INSERT event to
// BOTH subscriptions. Without dedup, the audio beep doubles and a
// second browser-Notification fires. Using a window-scoped Set keys
// the dedup by notification id across every hook instance in the
// process, and we cap its size so a long session can't grow it
// unboundedly. The actual STATE updates still run per-instance — only
// the audible / desktop side effects are deduped.
const SIDE_EFFECT_DEDUP_LIMIT = 500;
const seenNotificationSideEffects: Set<string> = ((): Set<string> => {
  const w = window as unknown as { __seekerNotifSeen?: Set<string> };
  if (!w.__seekerNotifSeen) w.__seekerNotifSeen = new Set<string>();
  return w.__seekerNotifSeen;
})();

function recordSideEffect(id: string): boolean {
  if (seenNotificationSideEffects.has(id)) return false;
  seenNotificationSideEffects.add(id);
  // Bound the set so long sessions don't accumulate forever. Cheap
  // FIFO eviction via the iterator.
  if (seenNotificationSideEffects.size > SIDE_EFFECT_DEDUP_LIMIT) {
    const it = seenNotificationSideEffects.values();
    const oldest = it.next().value;
    if (oldest) seenNotificationSideEffects.delete(oldest);
  }
  return true;
}

// Get stored user ID from localStorage (non-blocking)
function getStoredUserId(): string | null {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const projectRef = supabaseUrl?.split('//')[1]?.split('.')[0] || 'mldbxpntzcjalgjmwnqa';
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userIdRef = useRef<string | null>(getStoredUserId());

  // Initialize audio element on mount. Browser-notification permission is
  // NO LONGER auto-requested here — Chrome/Firefox both penalize sites that
  // ask immediately. Surface a user-gesture-triggered "Enable notifications"
  // button instead via `requestNotificationPermission()` returned from the
  // hook so consumers can wire it to a settings toggle or the bell icon.
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported" as const;
    if (Notification.permission === "granted") return "granted" as const;
    if (Notification.permission === "denied") return "denied" as const;
    return await Notification.requestPermission();
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
        if (link && link.startsWith("/")) {
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
      setFetchError(null);
      setIsLoading(false);
      return;
    }
    userIdRef.current = uid;

    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("seeker_notifications")
        .select("id, user_id, type, title, message, link, metadata, read, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[useSeekerNotifications] Fetch error:", error);
        setFetchError(error.message || "Couldn't load notifications.");
        return;
      }

      const notifs = (data || []) as SeekerNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      // Seed the side-effect dedup set with the existing rows so a
      // realtime INSERT that races the initial fetch doesn't double-
      // play sound for an id that was already in the fetched list.
      for (const n of notifs) seenNotificationSideEffects.add(n.id);
    } catch (err) {
      console.error("[useSeekerNotifications] Unexpected error:", err);
      setFetchError(err instanceof Error ? err.message : "Couldn't load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auth-change listener: when the user signs in mid-session (e.g. lands on
  // /account from the concierge thank-you page that called signInWithPassword),
  // refresh the cached userId AND re-run the subscription effect. Without this,
  // a session established AFTER mount left `userIdRef.current` null and
  // realtime never subscribed, so the bell never lit.
  const [authUserId, setAuthUserId] = useState<string | null>(() => userIdRef.current);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const next = session?.user?.id ?? null;
        userIdRef.current = next;
        setAuthUserId(next);
      },
    );
    // Pick up any session that finished establishing between mount and this effect.
    supabase.auth.getSession().then(({ data }) => {
      const sessionUid = data.session?.user?.id ?? null;
      if (sessionUid && sessionUid !== userIdRef.current) {
        userIdRef.current = sessionUid;
        setAuthUserId(sessionUid);
      }
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      // Update user ID from auth state change or stored value
      const uid = authUserId || userIdRef.current || getStoredUserId();
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

            // Per-instance state update — always run (header + page each
            // maintain their own notifications array; both need to be
            // in sync with realtime). De-dupe inside the setter so a
            // refetch racing with the realtime event can't create a
            // visible duplicate in either array.
            setNotifications(prev => {
              if (prev.some(n => n.id === newNotification.id)) return prev;
              return [newNotification, ...prev];
            });
            setUnreadCount(prev => prev + 1);

            // Audio + desktop notification: ONCE per id across every
            // hook instance in the window (header + page when both
            // mounted). recordSideEffect returns false on the second
            // call so the beep doesn't double.
            if (recordSideEffect(newNotification.id)) {
              playNotificationSound();
              showBrowserNotification(
                newNotification.title,
                newNotification.message,
                newNotification.link,
              );
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
            // Drop from the side-effect set so if the same id is
            // hypothetically re-issued (it shouldn't be, but the row
            // could be re-inserted with a fresh uuid that happens to
            // collide), the audio fires again.
            seenNotificationSideEffects.delete(deletedId);
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
  // Re-run on authUserId change so the subscription rebinds to the new user id.
  }, [authUserId, fetchNotifications, playNotificationSound, showBrowserNotification]);

  // Surface mutation failures to the user instead of swallowing them
  // with only a console.error. Prior code silently refetched on
  // failure — the user couldn't tell their click did nothing.
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
      toast({
        title: "Couldn't mark as read",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      fetchNotifications();
    }
  }, [toast, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      const uid = userIdRef.current;
      if (!uid) return;

      const { error } = await supabase
        .from("seeker_notifications")
        .update({ read: true })
        .eq("user_id", uid)
        .eq("read", false);

      if (error) throw error;

      toast({
        title: "All notifications marked as read",
      });
    } catch (err) {
      console.error("Error marking all as read:", err);
      toast({
        title: "Couldn't mark all as read",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
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
      const uid = userIdRef.current;
      if (!uid) return;

      const { error } = await supabase
        .from("seeker_notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", uid);

      if (error) throw error;
    } catch (err) {
      console.error("Error deleting notification:", err);
      toast({
        title: "Couldn't delete notification",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      fetchNotifications();
    }
  }, [toast, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
    requestNotificationPermission,
  };
}