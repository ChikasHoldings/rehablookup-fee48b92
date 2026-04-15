import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Shield, UserPlus, Settings, MessageSquare, Star, Ban, Trash2, KeyRound, Eye,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SeekerAuditLogTabProps {
  userId: string;
}

export function SeekerAuditLogTab({ userId }: SeekerAuditLogTabProps) {
  // Combine account activity + admin audit log entries targeting this user
  const { data: auditEntries, isLoading } = useQuery({
    queryKey: ["admin-seeker-audit-log", userId],
    queryFn: async () => {
      const [activityRes, adminAuditRes] = await Promise.all([
        supabase
          .from("account_activity_log")
          .select("id, event_type, event_description, created_at, ip_address, user_agent")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("admin_audit_log")
          .select("id, action_type, admin_user_id, target_type, target_id, details, created_at")
          .eq("target_id", userId)
          .eq("target_type", "seeker")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const entries = [
        ...(activityRes.data || []).map((a: any) => ({
          id: a.id,
          type: "user_activity",
          action: a.event_type,
          description: a.event_description,
          date: a.created_at,
          ip: a.ip_address,
          userAgent: a.user_agent,
          actor: "seeker",
        })),
        ...(adminAuditRes.data || []).map((a: any) => ({
          id: a.id,
          type: "admin_action",
          action: a.action_type,
          description: JSON.stringify(a.details),
          date: a.created_at,
          ip: null,
          userAgent: null,
          actor: "admin",
          adminId: a.admin_user_id,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return entries;
    },
  });

  if (isLoading) {
    return <div className="p-5 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (!auditEntries?.length) {
    return (
      <div className="p-5 text-center py-16">
        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No audit entries</p>
      </div>
    );
  }

  const actionIcons: Record<string, any> = {
    signup: UserPlus, login: Eye, profile_updated: Settings,
    inquiry_submitted: MessageSquare, review_submitted: Star,
    ban: Ban, delete: Trash2, send_password_reset: KeyRound,
    unban: Shield,
  };

  return (
    <div className="p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium text-muted-foreground">Timestamp</th>
              <th className="pb-2 font-medium text-muted-foreground">Actor</th>
              <th className="pb-2 font-medium text-muted-foreground">Action</th>
              <th className="pb-2 font-medium text-muted-foreground">Details</th>
              <th className="pb-2 font-medium text-muted-foreground">IP</th>
            </tr>
          </thead>
          <tbody>
            {auditEntries.map((entry: any) => {
              const Icon = actionIcons[entry.action] || FileText;
              return (
                <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <div>
                      <p className="text-xs">{format(new Date(entry.date), "MMM d, yyyy")}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(entry.date), "h:mm:ss a")}</p>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={entry.actor === "admin" ? "default" : "secondary"} className="text-xs">
                      {entry.actor === "admin" ? "Admin" : "Seeker"}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="capitalize whitespace-nowrap">{entry.action.replace(/_/g, " ")}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 max-w-[200px]">
                    <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {entry.ip || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
