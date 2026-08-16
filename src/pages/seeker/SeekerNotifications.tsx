import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, ExternalLink, Settings, RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSeekerNotifications, SeekerNotification } from "@/hooks/useSeekerNotifications";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { cn } from "@/lib/utils";
import { notificationIconLarge, resolveNotificationRoute } from "@/lib/seekerNotificationRouting";

type FilterTab = "all" | "unread";

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
}: {
  notification: SeekerNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: SeekerNotification) => void;
}) {
  const handleViewClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onNavigate(notification);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-b border-border last:border-0 transition-colors",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="shrink-0 mt-0.5 flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-muted">
        {notificationIconLarge(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn(
              "text-sm sm:text-base font-medium truncate",
              !notification.read ? "text-foreground" : "text-muted-foreground"
            )}>
              {notification.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-[11px] sm:text-xs text-muted-foreground/70 mt-1 tabular-nums">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
          {!notification.read && (
            <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5 ring-2 ring-primary/20" />
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 flex-wrap">
          {notification.link && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleViewClick}>
              <ExternalLink className="h-3 w-3" />
              View
            </Button>
          )}
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <Check className="h-3 w-3" />
              <span className="hidden sm:inline">Mark Read</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive gap-1"
            onClick={() => onDelete(notification.id)}
          >
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SeekerNotifications() {
  const { isAuthenticated, isReady } = useSeekerSession();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);
  const {
    notifications, unreadCount, isLoading, fetchError,
    markAsRead, markAllAsRead, deleteNotification, refetch,
    requestNotificationPermission,
  } = useSeekerNotifications();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  const handleEnableBrowserNotifications = async () => {
    const result = await requestNotificationPermission();
    if (result === "unsupported") {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support desktop notifications.",
        variant: "destructive",
      });
      return;
    }
    setPermissionState(result);
    if (result === "granted") {
      toast({ title: "Browser notifications enabled" });
    } else if (result === "denied") {
      toast({
        title: "Notifications blocked",
        description: "Open your browser's site settings to re-enable.",
        variant: "destructive",
      });
    }
  };

  // URL state hydration once on mount + loop-guarded sync so the
  // ?filter=unread bookmark works.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const f = searchParams.get("filter");
    if (f === "unread" || f === "all") setFilter(f as FilterTab);
  }, [searchParams]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const next = new URLSearchParams(searchParams);
    if (filter === "unread") next.set("filter", "unread");
    else next.delete("filter");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [filter, searchParams, setSearchParams]);

  const filteredNotifications = filter === "unread"
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleNavigate = (notification: SeekerNotification) => {
    const route = resolveNotificationRoute(notification);
    navigate(route);
  };

  // Auth guard
  if (isReady && !isAuthenticated) {
    return (
      <AuthPrompt
        title="Sign in to view notifications"
        description="Create a free account to receive and manage your notifications."
        icon="lock"
        returnTo="/account/notifications"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-20 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Notifications | RehabLookup</title>
        <meta name="description" content="View your notifications about facility updates, request responses, and reviews." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-display font-bold">Notifications</h1>
              <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline ml-1.5">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:h-9 sm:w-9" asChild>
              <Link to="/account/notification-preferences">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Fetch error banner — surfaces underlying error.message so a
            transient network / RLS failure doesn't masquerade as
            "no notifications yet". */}
        {fetchError && (
          <Card className="border-destructive/50 bg-destructive/5 mb-4">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="text-sm min-w-0">
                <p className="font-medium text-destructive">Couldn't load notifications</p>
                <p className="text-xs text-muted-foreground mt-1 break-words">{fetchError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Desktop-notification opt-in. Only rendered when:
            - browser supports Notification API
            - permission is currently 'default' (never asked / never set)
            We never auto-prompt on mount (Chrome/Firefox penalize that)
            — this is a user-gesture trigger. Hidden once granted or
            denied; deny state surfaces a hint elsewhere. */}
        {permissionState === "default" && (
          <Card className="border-primary/30 bg-primary/5 mb-4">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="text-sm min-w-0">
                <p className="font-medium">Get desktop notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Hear a chime and see a popup when a facility responds or your review is approved — even while you're in another tab.
                </p>
              </div>
              <Button size="sm" onClick={handleEnableBrowserNotifications}>
                Enable
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs + Mark All Read */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                filter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{notifications.length}</Badge>
              )}
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                filter === "unread" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-1.5 text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">{unreadCount}</Badge>
              )}
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="h-8 text-xs gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mark All Read</span>
              <span className="sm:hidden">Read All</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 sm:py-16 text-center">
              <BellOff className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold text-base sm:text-lg mb-1">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm max-w-sm mx-auto">
                {filter === "unread"
                  ? "You're all caught up! Switch to 'All' to see past notifications."
                  : "When you receive updates about saved facilities, requests, or reviews, they'll appear here."}
              </p>
              {filter === "unread" && notifications.length > 0 && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setFilter("all")}>
                  View All Notifications
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                  onNavigate={handleNavigate}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
