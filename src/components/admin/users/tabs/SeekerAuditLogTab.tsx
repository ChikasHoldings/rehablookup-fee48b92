import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Shield, UserPlus, Settings, MessageSquare, Star, Ban, Trash2, KeyRound, Eye, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerAuditLogTabProps {
  userId: string;
}

export function SeekerAuditLogTab({ userId }: SeekerAuditLogTabProps) {
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

      if (activityRes.error) console.error("Activity audit error:", activityRes.error);
      if (adminAuditRes.error) console.error("Admin audit error:", adminAuditRes.error);

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
          description: typeof a.details === "object" ? JSON.stringify(a.details) : String(a.details || ""),
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
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  if (!auditEntries?.length) {
    return (
      <div className="p-5 text-center py-16">
        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No audit entries</p>
        <p className="text-xs text-muted-foreground mt-1">Audit events will appear as activities occur for this seeker.</p>
      </div>
    );
  }

  const actionIcons: Record<string, any> = {
    signup: UserPlus, login: Eye, sign_in: Eye, profile_updated: Settings, profile_update: Settings,
    inquiry_submitted: MessageSquare, review_submitted: Star,
    ban: Ban, delete: Trash2, send_password_reset: KeyRound,
    unban: Shield, seeker_note: FileText,
  };

  // Summary
  const adminActions = auditEntries.filter((e: any) => e.actor === "admin").length;
  const userActions = auditEntries.filter((e: any) => e.actor === "seeker").length;

  return (
    <div className="p-5 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums">{auditEntries.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Entries</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-primary">{userActions}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">User Actions</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-warning">{adminActions}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admin Actions</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Timestamp</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Actor</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Action</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">Details</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs">IP</th>
              </tr>
            </thead>
            <tbody>
              {auditEntries.map((entry: any) => {
                const Icon = actionIcons[entry.action] || FileText;
                return (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <p className="text-xs tabular-nums">{format(new Date(entry.date), "MMM d, yyyy")}</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">{format(new Date(entry.date), "h:mm:ss a")}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={entry.actor === "admin" ? "default" : "secondary"} className="text-xs">
                        {entry.actor === "admin" ? "Admin" : "Client"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="capitalize whitespace-nowrap text-xs">{entry.action.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[220px]">
                      <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {entry.ip || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
