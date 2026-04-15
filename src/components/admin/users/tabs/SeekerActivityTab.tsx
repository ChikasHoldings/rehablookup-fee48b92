import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, LogIn, UserPlus, MessageSquare, Star, Heart, MapPin, Send, Shield, Settings, CheckCircle, FileText, Eye, KeyRound, LogOut, Trash2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerActivityTabProps {
  userId: string;
}

const eventIcons: Record<string, any> = {
  signup: UserPlus,
  login: LogIn,
  logout: LogOut,
  sign_in: LogIn,
  sign_out: LogOut,
  inquiry_submitted: MessageSquare,
  placement_submitted: Shield,
  review_submitted: Star,
  favorite_added: Heart,
  favorite_removed: Heart,
  tour_requested: MapPin,
  profile_updated: Settings,
  profile_update: Settings,
  phone_verified: CheckCircle,
  email_sent: Send,
  password_change: KeyRound,
  email_change: Send,
  avatar_update: Eye,
  account_deleted: Trash2,
};

const eventColors: Record<string, string> = {
  signup: "bg-primary/10 text-primary",
  login: "bg-blue-500/10 text-blue-600",
  sign_in: "bg-blue-500/10 text-blue-600",
  logout: "bg-muted text-muted-foreground",
  sign_out: "bg-muted text-muted-foreground",
  inquiry_submitted: "bg-chart-3/10 text-chart-3",
  placement_submitted: "bg-purple-500/10 text-purple-600",
  review_submitted: "bg-amber-500/10 text-amber-600",
  favorite_added: "bg-destructive/10 text-destructive",
  favorite_removed: "bg-muted text-muted-foreground",
  tour_requested: "bg-blue-500/10 text-blue-600",
  profile_updated: "bg-muted text-muted-foreground",
  profile_update: "bg-muted text-muted-foreground",
  phone_verified: "bg-success/10 text-success",
  password_change: "bg-amber-500/10 text-amber-600",
};

export function SeekerActivityTab({ userId }: SeekerActivityTabProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["admin-seeker-activity-full", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_activity_log")
        .select("id, event_type, event_description, created_at, metadata, ip_address, user_agent")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) console.error("Activity fetch error:", error);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities?.length) {
    return (
      <div className="p-5 text-center py-16">
        <Clock className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No activity recorded</p>
        <p className="text-xs text-muted-foreground mt-1">Activity events will appear here as the client interacts with the platform.</p>
      </div>
    );
  }

  // Group by date
  const groupedByDate: Record<string, typeof activities> = {};
  activities.forEach((activity: any) => {
    const dateKey = format(new Date(activity.created_at), "yyyy-MM-dd");
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(activity);
  });

  // Summary KPIs
  const loginCount = activities.filter((a: any) => a.event_type === "login" || a.event_type === "sign_in").length;
  const uniqueTypes = [...new Set(activities.map((a: any) => a.event_type))].length;

  return (
    <div className="p-5 space-y-5">
      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums">{activities.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Events</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-blue-600">{loginCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Logins</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-primary">{uniqueTypes}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Event Types</p>
        </div>
      </div>

      {/* Grouped Timeline */}
      {Object.entries(groupedByDate).map(([dateKey, dayActivities]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground px-2">
              {format(new Date(dateKey), "EEEE, MMM d, yyyy")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="relative space-y-0">
            {(dayActivities as any[]).map((activity: any, index: number) => {
              const IconComponent = eventIcons[activity.event_type] || Clock;
              const colorClass = eventColors[activity.event_type] || "bg-muted text-muted-foreground";

              return (
                <div key={activity.id} className="flex gap-3 pb-4 relative group">
                  {/* Timeline line */}
                  {index < (dayActivities as any[]).length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                  )}
                  {/* Icon */}
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10", colorClass)}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{activity.event_type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.event_description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 tabular-nums">
                        {format(new Date(activity.created_at), "h:mm:ss a")}
                      </span>
                    </div>
                    {/* IP/UA on hover */}
                    {activity.ip_address && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        IP: {activity.ip_address}
                        {activity.user_agent && ` • ${activity.user_agent.slice(0, 60)}...`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
