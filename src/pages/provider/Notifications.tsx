import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  UserPlus,
  Shield,
  CreditCard,
  AlertTriangle,
  Settings,
  MessageSquare,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProviderNotifications, ProviderNotification } from "@/hooks/useProviderNotifications";
import { cn } from "@/lib/utils";

const notificationTypeIcons: Record<string, React.ReactNode> = {
  new_lead: <UserPlus className="h-5 w-5 text-primary" />,
  high_intent_lead: <UserPlus className="h-5 w-5 text-orange-500" />,
  lead_received: <UserPlus className="h-5 w-5 text-primary" />,
  lead_reminder: <Bell className="h-5 w-5 text-amber-500" />,
  lead_expired: <AlertTriangle className="h-5 w-5 text-red-500" />,
  lead_status_changed: <MessageSquare className="h-5 w-5 text-blue-500" />,
  lead_redistributed: <UserPlus className="h-5 w-5 text-primary" />,
  lead_unlocked: <UserPlus className="h-5 w-5 text-green-500" />,
  listing_approved: <Shield className="h-5 w-5 text-green-500" />,
  subscription_updated: <CreditCard className="h-5 w-5 text-purple-500" />,
  subscription_renewal: <CreditCard className="h-5 w-5 text-purple-500" />,
  low_credits_warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  lead_limit_warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  review_received: <MessageSquare className="h-5 w-5 text-yellow-500" />,
  image_flagged: <AlertTriangle className="h-5 w-5 text-red-500" />,
  placement_introduction: <UserPlus className="h-5 w-5 text-indigo-500" />,
  concierge_seeker_confirmed: <Check className="h-4 w-4 text-green-500" />,
  concierge_placement_complete: <Check className="h-4 w-4 text-green-500" />,
  concierge_invoice_issued: <CreditCard className="h-5 w-5 text-purple-500" />,
  concierge_invoice_paid: <CreditCard className="h-5 w-5 text-green-500" />,
  tour_request: <MessageSquare className="h-5 w-5 text-blue-500" />,
  tour_confirmed: <Check className="h-4 w-4 text-green-500" />,
  tour_cancelled: <AlertTriangle className="h-5 w-5 text-red-500" />,
  system: <Settings className="h-5 w-5 text-muted-foreground" />,
};

const notificationTypeLabels: Record<string, string> = {
  new_lead: "New Inquiry",
  high_intent_lead: "🔥 High Intent",
  lead_received: "New Inquiry",
  lead_reminder: "Reminder",
  lead_expired: "Lead Expired",
  lead_status_changed: "Inquiry Update",
  lead_redistributed: "New Inquiry",
  lead_unlocked: "Lead Unlocked",
  listing_approved: "Listing",
  subscription_updated: "Credits",
  subscription_renewal: "Subscription",
  low_credits_warning: "Low Credits",
  lead_limit_warning: "Low Credits",
  review_received: "Review",
  image_flagged: "Image Flagged",
  placement_introduction: "Placement",
  concierge_seeker_confirmed: "Placement",
  concierge_placement_complete: "Placement",
  concierge_invoice_issued: "Billing",
  concierge_invoice_paid: "Billing",
  tour_request: "Tour",
  tour_confirmed: "Tour",
  tour_cancelled: "Tour",
  system: "System",
};

type NotificationTypeFilter = "all" | "leads" | "billing" | "placements" | "system";

const typeFilterCategories: Record<NotificationTypeFilter, string[]> = {
  all: [],
  leads: ["new_lead", "high_intent_lead", "lead_received", "lead_reminder", "lead_expired", "lead_status_changed", "lead_redistributed", "lead_unlocked"],
  billing: ["subscription_updated", "subscription_renewal", "low_credits_warning", "lead_limit_warning", "concierge_invoice_issued", "concierge_invoice_paid"],
  placements: ["placement_introduction", "concierge_seeker_confirmed", "concierge_placement_complete", "tour_request", "tour_confirmed", "tour_cancelled"],
  system: ["listing_approved", "review_received", "image_flagged", "system"],
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: {
  notification: ProviderNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const icon = notificationTypeIcons[notification.type] || notificationTypeIcons.system;
  const label = notificationTypeLabels[notification.type] || "Notification";

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Check for explicit link in metadata
    const metadata = notification.metadata as Record<string, any> | null;
    if (metadata?.link) {
      navigate(metadata.link);
      return;
    }
    
    // Type-based routing
    const leadTypes = ["new_lead", "high_intent_lead", "lead_received", "lead_reminder", "lead_expired", "lead_status_changed", "lead_redistributed", "lead_unlocked"];
    const billingTypes = ["subscription_updated", "subscription_renewal", "low_credits_warning", "lead_limit_warning", "concierge_invoice_issued", "concierge_invoice_paid"];
    const placementTypes = ["placement_introduction", "concierge_seeker_confirmed", "concierge_placement_complete"];
    const tourTypes = ["tour_request", "tour_confirmed", "tour_cancelled"];

    if (leadTypes.includes(notification.type)) {
      navigate("/provider/inquiries");
    } else if (billingTypes.includes(notification.type)) {
      navigate("/provider/billing");
    } else if (notification.type === "listing_approved") {
      navigate("/provider/listings");
    } else if (placementTypes.includes(notification.type)) {
      navigate("/provider/placement-network");
    } else if (tourTypes.includes(notification.type)) {
      navigate("/provider/placement-network");
    } else if (notification.type === "review_received") {
      navigate("/provider/reviews");
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className={cn("text-sm font-medium", !notification.read && "text-foreground")}>
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!notification.read && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}>
              <Check className="h-4 w-4 mr-2" />
              Mark as read
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function ProviderNotificationsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<NotificationTypeFilter>("all");
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  } = useProviderNotifications();

  // Apply both tab filter and type filter
  const filteredNotifications = notifications.filter((n) => {
    const tabMatch = activeTab === "all" || !n.read;
    const typeMatch = typeFilter === "all" || typeFilterCategories[typeFilter].includes(n.type);
    return tabMatch && typeMatch;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = format(new Date(notification.created_at), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    
    let groupLabel: string;
    if (date === today) {
      groupLabel = "Today";
    } else if (date === yesterday) {
      groupLabel = "Yesterday";
    } else {
      groupLabel = format(new Date(notification.created_at), "MMMM d, yyyy");
    }

    if (!groups[groupLabel]) {
      groups[groupLabel] = [];
    }
    groups[groupLabel].push(notification);
    return groups;
  }, {} as Record<string, ProviderNotification[]>);

  if (isLoading) {
    return (
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 border-b">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Stay updated with your leads and account activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your notifications. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteAll()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Tabs and Type Filter */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "unread")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Bell className="h-4 w-4" />
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2">
              <Filter className="h-4 w-4" />
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as NotificationTypeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="placements">Placements</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            {filteredNotifications.length === 0 ? (
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <BellOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">
                      {typeFilter !== "all" 
                        ? `No ${typeFilter} notifications`
                        : activeTab === "unread" 
                          ? "No unread notifications" 
                          : "No notifications yet"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {typeFilter !== "all"
                        ? `No ${typeFilter} notifications match your current filter.`
                        : activeTab === "unread"
                          ? "You're all caught up!"
                          : "When you receive leads or updates, they'll appear here."}
                    </p>
                  </div>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-0">
                {Object.entries(groupedNotifications).map(([date, items]) => (
                  <div key={date}>
                    <div className="px-4 py-2 bg-muted/50 border-b">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {date}
                      </span>
                    </div>
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
