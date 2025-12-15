import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ClipboardList,
  User,
  Building2,
  Users,
  Shield,
  Star,
  Ban,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type AuditLog = {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const actionIcons: Record<string, React.ReactNode> = {
  verified: <Shield className="h-4 w-4 text-blue-500" />,
  unverified: <Shield className="h-4 w-4 text-slate-400" />,
  featured: <Star className="h-4 w-4 text-amber-500" />,
  unfeatured: <Star className="h-4 w-4 text-slate-400" />,
  suspended: <Ban className="h-4 w-4 text-red-500" />,
  unsuspended: <CheckCircle className="h-4 w-4 text-green-500" />,
  status_changed_to_approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  status_changed_to_pending: <CheckCircle className="h-4 w-4 text-amber-500" />,
  lead_assigned: <ArrowRight className="h-4 w-4 text-blue-500" />,
  notes_updated: <ClipboardList className="h-4 w-4 text-slate-500" />,
};

const actionLabels: Record<string, string> = {
  verified: "Marked as Verified",
  unverified: "Removed Verified Status",
  featured: "Added to Featured",
  unfeatured: "Removed from Featured",
  suspended: "Suspended Provider",
  unsuspended: "Unsuspended Provider",
  status_changed_to_approved: "Approved Provider",
  status_changed_to_pending: "Set to Pending",
  lead_assigned: "Assigned Lead to Provider",
  notes_updated: "Updated Admin Notes",
};

export default function AdminAuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case "facility":
        return <Building2 className="h-4 w-4" />;
      case "lead":
        return <Users className="h-4 w-4" />;
      default:
        return <ClipboardList className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-muted-foreground">Track all administrative actions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Recent Actions
          </CardTitle>
          <CardDescription>
            Chronological log of all admin activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-background"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    {actionIcons[log.action_type] || <ClipboardList className="h-4 w-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">
                        {actionLabels[log.action_type] || log.action_type}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {getTargetIcon(log.target_type)}
                        <span className="ml-1 capitalize">{log.target_type}</span>
                      </Badge>
                    </div>

                    {log.target_id && (
                      <p className="text-sm text-muted-foreground truncate">
                        Target ID: {log.target_id}
                      </p>
                    )}

                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No audit logs yet</p>
              <p className="text-sm">Admin actions will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
