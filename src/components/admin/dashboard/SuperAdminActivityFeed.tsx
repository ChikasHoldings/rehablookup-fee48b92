import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ShieldCheck,
  UserPlus,
  Building2,
  CreditCard,
  AlertTriangle,
  Settings,
  Eye,
  Trash2,
  CheckCircle2,
} from "lucide-react";

const actionIcons: Record<string, React.ElementType> = {
  login: ShieldCheck,
  admin_user_created: UserPlus,
  provider_deleted: Trash2,
  status_changed_to_approved: CheckCircle2,
  suspended: AlertTriangle,
  subscription_override: CreditCard,
  platform_settings_updated: Settings,
  impersonation_start: Eye,
  lead_assigned: Building2,
};

const actionColors: Record<string, string> = {
  login: "bg-success/10 text-success",
  admin_user_created: "bg-primary/10 text-primary",
  provider_deleted: "bg-destructive/10 text-destructive",
  status_changed_to_approved: "bg-success/10 text-success",
  suspended: "bg-warning/10 text-warning",
  subscription_override: "bg-accent/10 text-accent-foreground",
  platform_settings_updated: "bg-muted text-muted-foreground",
};

export function SuperAdminActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["super-admin-activity-feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("id, action_type, target_type, target_id, created_at, admin_user_id, details")
        .order("created_at", { ascending: false })
        .limit(15);

      if (!data) return [];

      // Get admin names
      const adminIds = [...new Set(data.map(a => a.admin_user_id))];
      const { data: profiles } = await supabase
        .from("admin_user_profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", adminIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => {
        nameMap[p.user_id] = p.first_name && p.last_name 
          ? `${p.first_name} ${p.last_name}` 
          : p.display_name || "Admin";
      });

      return data.map(a => ({
        ...a,
        adminName: nameMap[a.admin_user_id] || "Admin",
      }));
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  function formatAction(action: string): string {
    return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Platform Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="divide-y">
              {activities.map((activity: any) => {
                const Icon = actionIcons[activity.action_type] || Activity;
                const colorClass = actionColors[activity.action_type] || "bg-muted text-muted-foreground";
                return (
                  <div key={activity.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {formatAction(activity.action_type)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.adminName} · {activity.target_type}
                        {activity.target_id ? ` #${activity.target_id.slice(0, 8)}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
