import { useState } from "react";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminUserNotifications } from "@/hooks/useAdminUserNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Filter,
  Search,
  Mail,
  Clock,
  Loader2,
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
      return <UserPlus className="h-5 w-5 text-blue-500" />;
    case "payment_failed":
      return <CreditCard className="h-5 w-5 text-red-500" />;
    case "subscription_alert":
    case "subscription_change":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "facility_approved":
      return <Building2 className="h-5 w-5 text-green-500" />;
    case "new_lead":
      return <Users className="h-5 w-5 text-purple-500" />;
    case "lead_assigned":
      return <Users className="h-5 w-5 text-indigo-500" />;
    case "system":
      return <Bell className="h-5 w-5 text-slate-500" />;
    case "email":
      return <Mail className="h-5 w-5 text-cyan-500" />;
    case "brute_force":
    case "login_alert":
    case "security_event":
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case "churn_alert":
    case "at_risk_provider":
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const getNotificationBadge = (type: string) => {
  switch (type) {
    case "provider_signup":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">New Provider</Badge>;
    case "payment_failed":
      return <Badge variant="destructive">Payment Failed</Badge>;
    case "subscription_alert":
    case "subscription_change":
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Subscription</Badge>;
    case "facility_approved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
    case "new_lead":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">New Lead</Badge>;
    case "lead_assigned":
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Lead Assigned</Badge>;
    case "system":
      return <Badge variant="secondary">System</Badge>;
    case "email":
      return <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">Email</Badge>;
    case "brute_force":
    case "login_alert":
    case "security_event":
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-300">Security</Badge>;
    case "churn_alert":
    case "at_risk_provider":
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">At Risk</Badge>;
    default:
      return <Badge variant="secondary">Notification</Badge>;
  }
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const { logError } = useAdminErrorHandler("AdminNotifications");
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
  } = useAdminUserNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "global" | "personal">("all");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Combine notifications
  const allNotifications = [
    ...globalNotifications.map(n => ({ ...n, source: "global" as const })),
    ...userNotifications.map(n => ({ ...n, source: "personal" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalUnreadCount = globalUnreadCount + userUnreadCount;
  const isLoading = globalLoading || userLoading;

  // Filter notifications
  const getFilteredNotifications = () => {
    let notifications = activeTab === "global" 
      ? globalNotifications.map(n => ({ ...n, source: "global" as const }))
      : activeTab === "personal"
      ? userNotifications.map(n => ({ ...n, source: "personal" as const }))
      : allNotifications;

    if (filter === "unread") {
      notifications = notifications.filter(n => !n.read);
    }

    if (typeFilter !== "all") {
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
  };

  const filteredNotifications = getFilteredNotifications();

  // Get unique notification types for filter
  const notificationTypes = Array.from(new Set(allNotifications.map(n => n.type)));

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
    
    // Check for explicit link in notification or metadata
    if ((notification as any).link) {
      return (notification as any).link;
    }
    if (metadata?.link) {
      return metadata.link;
    }
    
    // Type-based routing
    if (notification.type === "provider_signup") {
      return "/admin/providers?status=pending";
    }
    if (notification.type === "payment_failed" || notification.type === "subscription_change") {
      return "/admin/subscriptions";
    }
    if (notification.type === "new_lead" || notification.type === "lead_assigned") {
      return metadata?.lead_id ? `/admin/leads?id=${metadata.lead_id}` : "/admin/leads";
    }
    if (notification.type === "facility_approved") {
      return "/admin/providers";
    }
    if (notification.type === "brute_force" || notification.type === "login_alert" || notification.type === "security_event") {
      return "/admin/security-logs";
    }
    if (notification.type === "churn_alert" || notification.type === "at_risk_provider") {
      return "/admin/subscriptions";
    }
    if (notification.type === "flagged_image") {
      return "/admin/flagged-images";
    }
    return null;
  };

  const handleNotificationClick = (notification: typeof allNotifications[0], link: string | null) => {
    // Mark as read when clicking
    if (!notification.read) {
      handleMarkAsRead(notification.id, notification.source);
    }
    // Navigate if there's a link
    if (link) {
      navigate(link);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            System notifications and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchGlobal()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {totalUnreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          {allNotifications.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allNotifications.length}</div>
            <p className="text-xs text-muted-foreground">
              {globalNotifications.length} global, {userNotifications.length} personal
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalUnreadCount}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Issues</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {allNotifications.filter((n) => n.type === "payment_failed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Failed payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {allNotifications.filter((n) => ["brute_force", "login_alert", "security_event"].includes(n.type)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Security events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All
            <Badge variant="secondary" className="ml-1">{allNotifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2">
            Global
            <Badge variant="secondary" className="ml-1">{globalNotifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-2">
            Personal
            <Badge variant="secondary" className="ml-1">{userNotifications.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <NotificationList
            notifications={filteredNotifications}
            isLoading={isLoading}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            onNotificationClick={handleNotificationClick}
            getNotificationLink={getNotificationLink}
          />
        </TabsContent>
      </Tabs>
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
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
