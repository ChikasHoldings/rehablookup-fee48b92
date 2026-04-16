import { useState, useEffect, forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { LogIn, LogOut, Key, User, Bell, Shield, Trash2, Activity, Monitor, Smartphone } from "lucide-react";
interface ActivityLogEntry {
  id: string;
  user_id: string;
  event_type: string;
  event_description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LogIn,
  LogOut,
  Key,
  User,
  Bell,
  Shield,
  Trash2,
  Activity,
};

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "login":
      return "LogIn";
    case "logout":
      return "LogOut";
    case "password_change":
      return "Key";
    case "profile_update":
      return "User";
    case "notification_settings":
      return "Bell";
    case "session_signout":
      return "Shield";
    case "account_delete_attempt":
      return "Trash2";
    default:
      return "Activity";
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case "login":
      return "text-green-600";
    case "logout":
      return "text-muted-foreground";
    case "password_change":
      return "text-orange-600";
    case "session_signout":
      return "text-red-600";
    case "account_delete_attempt":
      return "text-red-600";
    default:
      return "text-primary";
  }
};

const parseUserAgent = (userAgent: string | null) => {
  if (!userAgent || userAgent === "Unknown") return { device: "Unknown", browser: "Unknown" };
  
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const device = isMobile ? "Mobile" : "Desktop";
  
  let browser = "Unknown";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";
  
  return { device, browser };
};

export const ActivityLogTab = forwardRef<HTMLDivElement>((_, ref) => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const session = await getCachedSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-log", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("account_activity_log")
        .select("id, user_id, event_type, event_description, ip_address, user_agent, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActivityLogEntry[];
    },
    enabled: !!userId,
  });

  if (isLoading || !userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Recent account activity and security events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>Recent account activity and security events</CardDescription>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No activity recorded yet</p>
            <p className="text-sm mt-1">Your login history and security events will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const iconName = getEventIcon(activity.event_type);
                const IconComponent = iconMap[iconName] || Activity;
                const colorClass = getEventColor(activity.event_type);
                const { device, browser } = parseUserAgent(activity.user_agent);
                const DeviceIcon = device === "Mobile" ? Smartphone : Monitor;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 pb-4 border-b border-border last:border-0"
                  >
                    <div className={`p-2 rounded-full bg-muted ${colorClass}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.event_description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span title={format(new Date(activity.created_at), "PPpp")}>
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                        {activity.ip_address && activity.ip_address !== "Unknown" && (
                          <>
                            <span>•</span>
                            <span>{activity.ip_address}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <DeviceIcon className="h-3 w-3" />
                          {device} ({browser})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});

ActivityLogTab.displayName = "ActivityLogTab";
