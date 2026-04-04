import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionActivity {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  metadata: {
    facility_name?: string;
    provider_name?: string;
    plan_name?: string;
    amount?: string;
    currency?: string;
    customer_email?: string;
  } | null;
}

const activityConfig: Record<string, { icon: typeof CreditCard; color: string; bgColor: string }> = {
  new_subscription: { 
    icon: Sparkles, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-100" 
  },
  subscription_cancelled: { 
    icon: XCircle, 
    color: "text-amber-600", 
    bgColor: "bg-amber-100" 
  },
  payment_failed: { 
    icon: AlertTriangle, 
    color: "text-red-600", 
    bgColor: "bg-red-100" 
  },
  subscription_renewed: { 
    icon: CheckCircle2, 
    color: "text-blue-600", 
    bgColor: "bg-blue-100" 
  },
};

const SubscriptionActivityWidget = forwardRef<HTMLDivElement>(function SubscriptionActivityWidget(_, ref) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["admin-subscription-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("id, type, title, message, metadata, read, created_at")
        .in("type", ["new_subscription", "subscription_cancelled", "payment_failed", "subscription_renewed"])
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching subscription activity:", error);
        return [];
      }
      return data as SubscriptionActivity[];
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case "new_subscription": return "New";
      case "subscription_cancelled": return "Cancelled";
      case "payment_failed": return "Failed";
      case "subscription_renewed": return "Renewed";
      default: return "Activity";
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "new_subscription": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "subscription_cancelled": return "bg-amber-50 text-amber-700 border-amber-200";
      case "payment_failed": return "bg-red-50 text-red-700 border-red-200";
      case "subscription_renewed": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "";
    }
  };

  return (
    <Card ref={ref} className="border-0 shadow-card bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">Subscription Activity</CardTitle>
            <CardDescription>Recent subscription events</CardDescription>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shadow-none" asChild>
          <Link to="/admin/subscriptions">
            View All
            <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="divide-y divide-border">
            {activities.map((activity) => {
              const config = activityConfig[activity.type] || activityConfig.new_subscription;
              const Icon = config.icon;
              const facilityName = activity.metadata?.facility_name || "Unknown Provider";
              const planName = activity.metadata?.plan_name;
              const amount = activity.metadata?.amount;
              const currency = activity.metadata?.currency || "USD";

              return (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {facilityName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {planName && `${planName}`}
                        {amount && ` • ${currency} ${amount}/mo`}
                        {!planName && !amount && activity.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getBadgeVariant(activity.type)}`}>
                      {getActivityLabel(activity.type)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CreditCard className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">No subscription activity yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

SubscriptionActivityWidget.displayName = "SubscriptionActivityWidget";

export default SubscriptionActivityWidget;
