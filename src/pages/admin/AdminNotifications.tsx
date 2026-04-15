import { useState, useMemo } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminUserNotifications } from "@/hooks/useAdminUserNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CheckCheck,
  Trash2,
  UserPlus,
  CreditCard,
  AlertTriangle,
  Building2,
  Eye,
  Users,
  RefreshCw,
  Search,
  Mail,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "provider_signup":
      return <UserPlus className="h-5 w-5 text-primary" />;
    case "payment_failed":
    case "payment_delinquent":
    case "placement_payment_failed":
      return <CreditCard className="h-5 w-5 text-destructive" />;
    case "subscription_alert":
    case "subscription_change":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "new_subscription":
      return <CreditCard className="h-5 w-5 text-success" />;
    case "subscription_cancelled":
      return <CreditCard className="h-5 w-5 text-warning" />;
    case "facility_approved":
      return <Building2 className="h-5 w-5 text-success" />;
    case "new_lead":
      return <Users className="h-5 w-5 text-primary" />;
    case "lead_assigned":
      return <Users className="h-5 w-5 text-primary" />;
    case "system":
    case "welcome":
      return <Bell className="h-5 w-5 text-muted-foreground" />;
    case "email":
      return <Mail className="h-5 w-5 text-primary" />;
    case "brute_force":
    case "brute_force_alert":
    case "login_alert":
    case "security_event":
    case "security_block":
    case "security_unblock":
      return <ShieldAlert className="h-5 w-5 text-destructive" />;
    case "churn_alert":
    case "at_risk_provider":
    case "provider_health":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    case "new_review":
    case "review_disputed":
      return <Eye className="h-5 w-5 text-primary" />;
    case "flagged_image":
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const getNotificationBadge = (type: string) => {
  switch (type) {
    case "provider_signup":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">New Provider</Badge>;
    case "payment_failed":
    case "payment_delinquent":
    case "placement_payment_failed":
      return <Badge variant="destructive">Payment Failed</Badge>;
    case "subscription_alert":
    case "subscription_change":
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Subscription</Badge>;
    case "new_subscription":
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">New Subscription</Badge>;
    case "subscription_cancelled":
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Cancelled</Badge>;
    case "facility_approved":
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Approved</Badge>;
    case "new_lead":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">New Lead</Badge>;
    case "lead_assigned":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Lead Assigned</Badge>;
    case "system":
    case "welcome":
      return <Badge variant="secondary">System</Badge>;
    case "email":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Email</Badge>;
    case "brute_force":
    case "brute_force_alert":
    case "login_alert":
    case "security_event":
    case "security_block":
    case "security_unblock":
      return <Badge variant="destructive">Security</Badge>;
    case "churn_alert":
    case "at_risk_provider":
    case "provider_health":
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">At Risk</Badge>;
    case "new_review":
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">New Review</Badge>;
    case "review_disputed":
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Review Dispute</Badge>;
    case "flagged_image":
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Flagged Image</Badge>;
    default:
      return <Badge variant="secondary">Notification</Badge>;
  }
};

const PAYMENT_TYPES = ["payment_failed", "payment_delinquent", "placement_payment_failed"];
const SECURITY_TYPES = ["brute_force", "brute_force_alert", "login_alert", "security_event", "security_block", "security_unblock"];

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { logError } = useAdminErrorHandler("AdminNotifications");
  const { adminRole, isSuperAdmin, hasPermission } = useAdminAuth();
  const {
    notifications: globalNotifications,
    unreadCount: globalUnreadCount,
    isLoading: globalLoading,
    markAsRead: markGlobalAsRead,
    markAllAsRead: markAllGlobalAsRead,
    deleteNotification: deleteGlobalNotification,
    deleteAll: deleteAllGlobal,
    refetch: refetchGlobal,
  } = useAdminNotifications();

  const {
    notifications: userNotifications,
    unreadCount: userUnreadCount,
    isLoading: userLoading,
    markAsRead: markUserAsRead,
    markAllAsRead: markAllUserAsRead,
    deleteNotification: deleteUserNotification,
    deleteAll: deleteAllUser,
    refetch: refetchUser,
  } = useAdminUserNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "global" | "personal">("all");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = globalLoading || userLoading;

  // Role-based notification type filtering
  // Advisors only see placement-related and system notifications
  // Customer reps see reviews, support, leads
  // Managers see everything except security-admin-only
  const isRelevantNotification = useMemo(() => {
    if (isSuperAdmin) return () => true;
    
    const ADVISOR_TYPES = new Set([
      "welcome", "system", "placement_assigned", "placement_update",
      "concierge_update", "tour_request", "new_review", "review_disputed",
    ]);
    const LEAD_TYPES = new Set(["new_lead", "lead_assigned"]);
    const SECURITY_ADMIN_TYPES = new Set([
      "brute_force", "brute_force_alert", "login_alert", 
      "security_event", "security_block", "security_unblock",
    ]);
    
    return (type: string) => {
      if (adminRole === "advisor") {
        return ADVISOR_TYPES.has(type) || !LEAD_TYPES.has(type) && !SECURITY_ADMIN_TYPES.has(type);
      }
      // Customer reps don't see security-admin types
      if (adminRole === "customer_rep") {
        return !SECURITY_ADMIN_TYPES.has(type);
      }
      return true;
    };
  }, [isSuperAdmin, adminRole]);

  // Memoize combined notifications - filtered by role relevance
  const allNotifications = useMemo(() => [
    ...globalNotifications.filter(n => isRelevantNotification(n.type)).map(n => ({ ...n, source: "global" as const })),
    ...userNotifications.map(n => ({ ...n, source: "personal" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [globalNotifications, userNotifications, isRelevantNotification]);

  const totalUnreadCount = globalUnreadCount + userUnreadCount;

  // Memoize filtered notifications
  const filteredNotifications = useMemo(() => {
    let notifications = activeTab === "global"
      ? globalNotifications.map(n => ({ ...n, source: "global" as const }))
      : activeTab === "personal"
      ? userNotifications.map(n => ({ ...n, source: "personal" as const }))
      : allNotifications;

    if (filter === "unread") {
      notifications = notifications.filter(n => !n.read);
    }

    if (typeFilter === "payment_types") {
      notifications = notifications.filter(n => PAYMENT_TYPES.includes(n.type));
    } else if (typeFilter === "security_types") {
      notifications = notifications.filter(n => SECURITY_TYPES.includes(n.type));
    } else if (typeFilter !== "all") {
      notifications = notifications.filter(n => n.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      notifications = notifications.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    return notifications;
  }, [activeTab, filter, typeFilter, searchQuery, allNotifications, globalNotifications, userNotifications]);

  // Get unique notification types for filter
  const notificationTypes = useMemo(() => Array.from(new Set(allNotifications.map(n => n.type))), [allNotifications]);

  const handleMarkAsRead = (id: string, source: "global" | "personal") => {
    if (source === "global") {
      markGlobalAsRead(id);
    } else {
      markUserAsRead(id);
    }
  };

  const handleDelete = (id: string, source: "global" | "personal") => {
    if (source === "global") {
      deleteGlobalNotification(id);
    } else {
      deleteUserNotification(id);
    }
  };

  const handleMarkAllAsRead = () => {
    if (activeTab === "global") {
      markAllGlobalAsRead();
    } else if (activeTab === "personal") {
      markAllUserAsRead();
    } else {
      markAllGlobalAsRead();
      markAllUserAsRead();
    }
    logAdminAction({
      actionType: AdminAuditActions.NOTIFICATIONS_MARKED_READ,
      targetType: "admin_notifications",
      details: { tab: activeTab },
    });
  };

  const handleDeleteAll = () => {
    if (activeTab === "global") {
      deleteAllGlobal();
    } else if (activeTab === "personal") {
      deleteAllUser();
    } else {
      deleteAllGlobal();
      deleteAllUser();
    }
    logAdminAction({
      actionType: AdminAuditActions.NOTIFICATIONS_CLEARED,
      targetType: "admin_notifications",
      details: { tab: activeTab },
    });
  };

  const getNotificationLink = (notification: typeof allNotifications[0]) => {
    const metadata = notification.metadata as Record<string, any> | null;

    if ((notification as any).link) return (notification as any).link;
    if (metadata?.link) return metadata.link;

    switch (notification.type) {
      case "provider_signup":
        return hasPermission("providers") ? "/admin/providers?status=pending" : null;
      case "payment_failed":
      case "payment_delinquent":
      case "placement_payment_failed":
      case "subscription_change":
      case "new_subscription":
      case "subscription_cancelled":
      case "churn_alert":
      case "at_risk_provider":
      case "provider_health":
        return hasPermission("subscriptions") ? "/admin/subscriptions" : null;
      case "new_lead":
      case "lead_assigned":
        return hasPermission("leads") ? (metadata?.lead_id ? `/admin/leads?id=${metadata.lead_id}` : "/admin/leads") : null;
      case "facility_approved":
      case "flagged_image":
        return hasPermission("providers") ? "/admin/providers" : null;
      case "brute_force":
      case "brute_force_alert":
      case "login_alert":
      case "security_event":
      case "security_block":
      case "security_unblock":
        return hasPermission("security_logs") ? "/admin/security-logs" : null;
      case "new_review":
      case "review_disputed":
        return hasPermission("reviews") ? "/admin/reviews" : null;
      case "welcome":
      case "system":
        return "/admin/profile";
      default:
        return null;
    }
  };

  const handleNotificationClick = (notification: typeof allNotifications[0], link: string | null) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id, notification.source);
    }
    if (link) {
      navigate(link);
    }
  };

  const paymentIssuesCount = useMemo(() => allNotifications.filter((n) => PAYMENT_TYPES.includes(n.type)).length, [allNotifications]);
  const securityAlertsCount = useMemo(() => allNotifications.filter((n) => SECURITY_TYPES.includes(n.type)).length, [allNotifications]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { refetchGlobal(); refetchUser(); }}
            disabled={isLoading}
            className="h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          {totalUnreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="h-8 text-xs">
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark All Read
            </Button>
          )}
          {allNotifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {activeTab === "all" ? "" : activeTab} notifications. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border text-sm overflow-x-auto">
        <Button
          variant={filter === "all" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs font-medium shrink-0"
          onClick={() => setFilter("all")}
        >
          <Bell className="h-3.5 w-3.5 mr-1.5" />
          All
          <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-[10px] tabular-nums">{allNotifications.length}</Badge>
        </Button>
        <Button
          variant={filter === "unread" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs font-medium shrink-0"
          onClick={() => setFilter("unread")}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Unread
          {totalUnreadCount > 0 && (
            <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-primary tabular-nums">{totalUnreadCount}</Badge>
          )}
        </Button>
        <div className="h-4 w-px bg-border mx-1 shrink-0" />
        <Button
          variant={typeFilter === "payment_types" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs font-medium shrink-0"
          onClick={() => setTypeFilter(typeFilter === "payment_types" ? "all" : "payment_types")}
        >
          <CreditCard className="h-3.5 w-3.5 mr-1.5 text-destructive" />
          Payments
          {paymentIssuesCount > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px] tabular-nums">{paymentIssuesCount}</Badge>
          )}
        </Button>
        <Button
          variant={typeFilter === "security_types" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs font-medium shrink-0"
          onClick={() => setTypeFilter(typeFilter === "security_types" ? "all" : "security_types")}
        >
          <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-destructive" />
          Security
          {securityAlertsCount > 0 && (
            <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px] tabular-nums">{securityAlertsCount}</Badge>
          )}
        </Button>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {notificationTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="h-7 px-2.5 text-xs">All</TabsTrigger>
              <TabsTrigger value="global" className="h-7 px-2.5 text-xs">Global</TabsTrigger>
              <TabsTrigger value="personal" className="h-7 px-2.5 text-xs">Personal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Notification List */}
      <NotificationList
        notifications={filteredNotifications}
        isLoading={isLoading}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDelete}
        onNotificationClick={handleNotificationClick}
        getNotificationLink={getNotificationLink}
      />
    </div>
  );
}

interface NotificationListProps {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    source: "global" | "personal";
    metadata?: Record<string, unknown> | null;
  }>;
  isLoading: boolean;
  onMarkAsRead: (id: string, source: "global" | "personal") => void;
  onDelete: (id: string, source: "global" | "personal") => void;
  onNotificationClick: (notification: NotificationListProps["notifications"][0], link: string | null) => void;
  getNotificationLink: (notification: NotificationListProps["notifications"][0]) => string | null;
}

function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onDelete,
  onNotificationClick,
  getNotificationLink,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground">You're all caught up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-3">
        {notifications.map((notification) => {
          const link = getNotificationLink(notification);

          return (
            <Card
              key={`${notification.source}-${notification.id}`}
              className={cn(
                "transition-colors hover:bg-muted/50",
                !notification.read && "border-l-4 border-l-primary bg-primary/5",
                link && "cursor-pointer"
              )}
              onClick={() => onNotificationClick(notification, link)}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getNotificationBadge(notification.type)}
                    {notification.source === "personal" && (
                      <Badge variant="outline" className="text-xs">Personal</Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm text-foreground">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                    {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onMarkAsRead(notification.id, notification.source)}
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(notification.id, notification.source)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
