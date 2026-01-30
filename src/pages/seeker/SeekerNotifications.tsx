import { formatDistanceToNow } from "date-fns";
import { Helmet } from "react-helmet-async";
import { Bell, BellOff, Check, CheckCheck, Trash2, ExternalLink, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSeekerNotifications, SeekerNotification } from "@/hooks/useSeekerNotifications";
import { cn } from "@/lib/utils";

const notificationTypeIcons: Record<string, string> = {
  // System & Welcome
  system: "🔔",
  welcome: "👋",
  // Facility Related
  facility_update: "🏥",
  saved_facility: "❤️",
  facility_contacted: "📞",
  facility_contacted_you: "📞",
  // Request Related
  request_update: "📋",
  request_confirmation: "📝",
  // Review Related
  review_response: "💬",
  review_approved: "✅",
  review_rejected: "❌",
  // Tour Related
  tour_proposed: "📅",
  tour_confirmed: "✅",
  tour_cancelled: "❌",
  concierge_tour_proposed: "📅",
  concierge_tour_confirmed: "✅",
  concierge_tour_cancelled: "❌",
  // Concierge Related
  concierge_intake_received: "💙",
  concierge_matches_found: "📍",
  concierge_provider_interested: "👤",
  concierge_provider_confirmed: "🏥",
  concierge_placement_complete: "🎉",
  concierge_message_received: "💬",
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: SeekerNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 border-b border-border last:border-0 transition-colors",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="text-2xl shrink-0">
        {notificationTypeIcons[notification.type] || "🔔"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className={cn("font-medium", !notification.read && "text-foreground")}>
              {notification.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-3">
          {notification.link && (
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link to={notification.link}>
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Link>
            </Button>
          )}
          {!notification.read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onMarkAsRead(notification.id)}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark Read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(notification.id)}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SeekerNotifications() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } =
    useSeekerNotifications();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-24 bg-muted rounded-lg" />
          <div className="h-24 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Notifications | RehabLookup</title>
        <meta name="description" content="View your notifications about facility updates, request responses, reviews, and concierge service updates." />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild>
              <Link to="/account/notification-preferences">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BellOff className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No notifications yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              When you receive updates about saved facilities, requests, or reviews, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
