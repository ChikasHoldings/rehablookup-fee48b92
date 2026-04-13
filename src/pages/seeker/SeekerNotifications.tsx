import { formatDistanceToNow } from "date-fns";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, ExternalLink, Settings,
  Send, Heart, Star, Building2, MapPin, Calendar, HeartHandshake, UserCheck, CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSeekerNotifications, SeekerNotification } from "@/hooks/useSeekerNotifications";
import { cn } from "@/lib/utils";

const notificationTypeIcons: Record<string, React.ReactNode> = {
  system: <Bell className="h-5 w-5 text-primary" />,
  welcome: <Bell className="h-5 w-5 text-success" />,
  facility_update: <Building2 className="h-5 w-5 text-primary" />,
  saved_facility: <Heart className="h-5 w-5 text-primary" />,
  facility_contacted: <Send className="h-5 w-5 text-primary" />,
  facility_contacted_you: <Send className="h-5 w-5 text-primary" />,
  request_update: <Send className="h-5 w-5 text-success" />,
  request_confirmation: <Send className="h-5 w-5 text-success" />,
  review_response: <Star className="h-5 w-5 text-warning" />,
  review_approved: <Star className="h-5 w-5 text-success" />,
  review_rejected: <Star className="h-5 w-5 text-destructive" />,
  tour_proposed: <Calendar className="h-5 w-5 text-primary" />,
  tour_confirmed: <Calendar className="h-5 w-5 text-success" />,
  tour_cancelled: <Calendar className="h-5 w-5 text-destructive" />,
  concierge_tour_proposed: <Calendar className="h-5 w-5 text-primary" />,
  concierge_tour_confirmed: <Calendar className="h-5 w-5 text-success" />,
  concierge_tour_cancelled: <Calendar className="h-5 w-5 text-destructive" />,
  concierge_intake_received: <HeartHandshake className="h-5 w-5 text-primary" />,
  concierge_matches_found: <MapPin className="h-5 w-5 text-success" />,
  concierge_provider_interested: <UserCheck className="h-5 w-5 text-primary" />,
  concierge_provider_confirmed: <Building2 className="h-5 w-5 text-success" />,
  concierge_placement_complete: <CheckCircle className="h-5 w-5 text-success" />,
  concierge_message_received: <Send className="h-5 w-5 text-primary" />,
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
      <div className="shrink-0 mt-0.5 flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
        {notificationTypeIcons[notification.type] || <Bell className="h-5 w-5 text-muted-foreground" />}
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
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification, isAuthenticated } =
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
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Notifications</h1>
              <p className="text-sm text-muted-foreground tabular-nums">
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
