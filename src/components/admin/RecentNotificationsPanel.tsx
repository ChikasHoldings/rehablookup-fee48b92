import { useState, useEffect, forwardRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  RefreshCw,
  Mail,
  AlertTriangle,
  Users,
  Zap,
  Shield,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, any> | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "security":
      return <Shield className="h-4 w-4 text-red-500" />;
    case "lead":
      return <Zap className="h-4 w-4 text-amber-500" />;
    case "provider":
      return <Users className="h-4 w-4 text-blue-500" />;
    case "system":
      return <Bell className="h-4 w-4 text-slate-500" />;
    case "email":
      return <Mail className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-slate-500" />;
  }
};

const getNotificationBadge = (type: string) => {
  const config: Record<string, { label: string; className: string }> = {
    security: { label: "Security", className: "bg-red-100 text-red-700 border-red-200" },
    lead: { label: "Lead", className: "bg-amber-100 text-amber-700 border-amber-200" },
    provider: { label: "Provider", className: "bg-blue-100 text-blue-700 border-blue-200" },
    system: { label: "System", className: "bg-slate-100 text-slate-700 border-slate-200" },
    email: { label: "Email", className: "bg-green-100 text-green-700 border-green-200" },
  };
  return config[type] || config.system;
};

export const RecentNotificationsPanel = forwardRef<HTMLDivElement>(function RecentNotificationsPanel(_, ref) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch recent admin notifications
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["recent-admin-notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("admin_user_notifications")
        .select("id, type, title, message, link, read, created_at, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data as Notification[]) || [];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("recent-notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_user_notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["recent-admin-notifications"] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("admin_user_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      toast.success("All notifications marked as read");
      refetch();
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleClearAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("admin_user_notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("read", true);

      if (error) throw error;
      toast.success("Read notifications cleared");
      refetch();
    } catch (error) {
      toast.error("Failed to clear notifications");
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <Card ref={ref}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-purple-500" />
              Recent Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Your latest admin notifications</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="gap-1 text-xs"
            >
              <CheckCircle className="h-3 w-3" />
              Mark All Read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="gap-1 text-xs text-muted-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear Read
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {notifications.map((notification) => {
                const badge = getNotificationBadge(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      !notification.read && "bg-blue-50/50 border-blue-200"
                    )}
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {notification.title}
                        </span>
                        <Badge variant="outline" className={cn("text-xs shrink-0", badge.className)}>
                          {badge.label}
                        </Badge>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No recent notifications</p>
            <p className="text-xs mt-1">New notifications will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
