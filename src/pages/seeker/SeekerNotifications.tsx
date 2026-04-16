import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, ExternalLink, Settings,
  Send, Heart, Star, Building2, MapPin, Calendar, HeartHandshake, UserCheck, CheckCircle,
  RefreshCw, Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSeekerNotifications, SeekerNotification } from "@/hooks/useSeekerNotifications";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { cn } from "@/lib/utils";

const notificationTypeIcons: Record<string, React.ReactNode> = {
  system: <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  welcome: <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  facility_update: <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  saved_facility: <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  facility_contacted: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  facility_contacted_you: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  request_update: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  request_confirmation: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  review_response: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />,
  review_approved: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  review_rejected: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
  tour_proposed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  tour_confirmed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  tour_cancelled: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
  concierge_tour_proposed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  concierge_tour_confirmed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  concierge_tour_cancelled: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
  concierge_intake_received: <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  concierge_matches_found: <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  concierge_provider_interested: <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  concierge_provider_confirmed: <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  concierge_placement_complete: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
  concierge_message_received: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
};

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
        {notificationTypeIcons[notification.type] || <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
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
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, refetch } =
    useSeekerNotifications();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredNotifications = filter === "unread"
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleNavigate = (notification: SeekerNotification) => {
    if (notification.link) {
      navigate(notification.link);
      return;
    }
    const metadata = notification.metadata as Record<string, unknown> | null;
    if (metadata?.link && typeof metadata.link === "string") {
      navigate(metadata.link);
      return;
    }
    // Type-based fallback routing
    const typeRoutes: Record<string, string> = {
      request_update: "/account/requests",
      request_confirmation: "/account/requests",
      review_response: "/account/reviews",
      review_approved: "/account/reviews",
      review_rejected: "/account/reviews",
      concierge_intake_received: "/account/concierge",
      concierge_matches_found: "/account/concierge",
      concierge_provider_interested: "/account/concierge",
      concierge_provider_confirmed: "/account/concierge",
      concierge_placement_complete: "/account/concierge",
      concierge_message_received: "/account/concierge",
      concierge_tour_proposed: "/account/concierge",
      concierge_tour_confirmed: "/account/concierge",
      concierge_tour_cancelled: "/account/concierge",
      saved_facility: "/account/saved",
      facility_update: "/account/saved",
      tour_proposed: "/account/requests",
      tour_confirmed: "/account/requests",
      tour_cancelled: "/account/requests",
    };
    const route = typeRoutes[notification.type];
    if (route) navigate(route);
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
        <meta name="description" content="View your notifications about facility updates, request responses, reviews, and concierge service updates." />
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
