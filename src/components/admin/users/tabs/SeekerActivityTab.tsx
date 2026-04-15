import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, LogIn, UserPlus, MessageSquare, Star, Heart, MapPin, Send, Shield, Settings, CheckCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerActivityTabProps {
  userId: string;
}

const eventIcons: Record<string, any> = {
  signup: UserPlus,
  login: LogIn,
  inquiry_submitted: MessageSquare,
  placement_submitted: Shield,
  review_submitted: Star,
  favorite_added: Heart,
  favorite_removed: Heart,
  tour_requested: MapPin,
  profile_updated: Settings,
  phone_verified: CheckCircle,
  email_sent: Send,
};

const eventColors: Record<string, string> = {
  signup: "bg-primary/10 text-primary",
  login: "bg-muted text-muted-foreground",
  inquiry_submitted: "bg-chart-3/10 text-chart-3",
  placement_submitted: "bg-purple-500/10 text-purple-600",
  review_submitted: "bg-amber-500/10 text-amber-600",
  favorite_added: "bg-destructive/10 text-destructive",
  tour_requested: "bg-blue-500/10 text-blue-600",
  profile_updated: "bg-muted text-muted-foreground",
  phone_verified: "bg-success/10 text-success",
};

export function SeekerActivityTab({ userId }: SeekerActivityTabProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["admin-seeker-activity-full", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("account_activity_log")
        .select("id, event_type, event_description, created_at, metadata, ip_address, user_agent")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  if (!activities?.length) {
    return (
      <div className="p-5 text-center py-16">
        <Clock className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Timeline */}
      <div className="relative space-y-0">
        {activities.map((activity: any, index: number) => {
          const IconComponent = eventIcons[activity.event_type] || Clock;
          const colorClass = eventColors[activity.event_type] || "bg-muted text-muted-foreground";

          return (
            <div key={activity.id} className="flex gap-3 pb-4 relative">
              {/* Timeline line */}
              {index < activities.length - 1 && (
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
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
                {activity.ip_address && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">IP: {activity.ip_address}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
