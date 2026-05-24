import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
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
import {
  getNotificationEntry,
  getNotificationRoute,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/lib/providerNotificationTypes";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";

type NotificationTypeFilter = "all" | NotificationCategory;

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
  const entry = getNotificationEntry(notification.type);

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    // Registry-driven routing. Honours `metadata.link` first (per-row
    // deep link from the backend), then falls back to the type's
    // canonical route. Unknown types route to /provider/dashboard
    // (FALLBACK_ENTRY) and log in dev so missing types surface during
    // testing instead of becoming a silent no-op.
    navigate(getNotificationRoute(notification.type, notification.metadata));
  };

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-0.5">{entry.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className={cn("text-sm font-medium", !notification.read && "text-foreground")}>
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
            )}
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {entry.label}
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
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  } = useProviderNotifications();

  // Apply both tab filter and type filter
  const filteredNotifications = notifications.filter((n) => {
    const tabMatch = activeTab === "all" || !n.read;
    const typeMatch =
      typeFilter === "all" || NOTIFICATION_CATEGORIES[typeFilter].includes(n.type);
    return tabMatch && typeMatch;
  });

  const notifPagination = usePagination({
    tableId: "provider-notifications",
    defaultPageSize: 25,
    totalItems: filteredNotifications.length,
  });
  const visibleNotifications = notifPagination.paginate(filteredNotifications);

  // Reset to page 1 on tab OR type-filter change. Previously only
  // activeTab triggered the reset, so switching from "All / page 3" to
  // a category with fewer results stranded the user on an empty page.
  useEffect(() => {
    notifPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, typeFilter]);

  const groupedNotifications = visibleNotifications.reduce((groups, notification) => {
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

  if (error) {
    return (
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Notifications</h1>
          <Card>
            <CardContent className="py-14 flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Couldn't load notifications</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  We weren't able to reach the notifications service. Existing
                  notifications are still saved — this is just a display issue.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden />
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 md:py-8 lg:px-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#1B365D]/70">
            Activity
          </p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
            Notifications
          </h1>
          <p className="mt-1.5 max-w-xl text-[15px] text-slate-600">
            Stay updated with your leads, claim approvals, and account activity.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      {/* Toolbar row */}
      <div className="flex justify-end">
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
              <SelectItem value="listings">Listings</SelectItem>
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
                {filteredNotifications.length > notifPagination.pageSize && (
                  <div className="px-4 pb-4">
                    <PaginationFooter
                      page={notifPagination.page}
                      pageSize={notifPagination.pageSize}
                      totalPages={notifPagination.totalPages}
                      totalItems={filteredNotifications.length}
                      onPageChange={notifPagination.setPage}
                      onPageSizeChange={notifPagination.setPageSize}
                      itemLabel="notification"
                    />
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
