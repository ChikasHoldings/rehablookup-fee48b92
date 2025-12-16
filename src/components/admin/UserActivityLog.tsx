import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LogIn,
  KeyRound,
  Ban,
  CheckCircle,
  Trash2,
  UserPlus,
  Settings,
  Shield,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  details: Json;
  created_at: string;
}

interface AdminUserInfo {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

const ACTION_CONFIG: Record<string, {
  icon: typeof LogIn;
  label: string;
  color: string;
  bgColor: string;
}> = {
  admin_login: {
    icon: LogIn,
    label: "Logged In",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  admin_user_created: {
    icon: UserPlus,
    label: "User Created",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  suspend: {
    icon: Ban,
    label: "Suspended",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  unsuspend: {
    icon: CheckCircle,
    label: "Unsuspended",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  delete: {
    icon: Trash2,
    label: "Deleted",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  reset_password: {
    icon: KeyRound,
    label: "Password Reset",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  resend_invitation: {
    icon: KeyRound,
    label: "Invitation Resent",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  update_role: {
    icon: Shield,
    label: "Role Updated",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  update_permissions: {
    icon: Settings,
    label: "Permissions Updated",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
};

const ITEMS_PER_PAGE = 10;

export function UserActivityLog() {
  const [page, setPage] = useState(1);
  const [adminUsers, setAdminUsers] = useState<Map<string, AdminUserInfo>>(new Map());

  // Fetch audit logs for admin_user target type
  const { data: logsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["user-activity-logs", page],
    queryFn: async () => {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from("admin_audit_log")
        .select("*", { count: "exact" })
        .eq("target_type", "admin_user")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data as AuditLogEntry[], total: count || 0 };
    },
  });

  // Fetch admin user details for display
  useEffect(() => {
    const fetchAdminUsers = async () => {
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("user_id, display_name, avatar_url")
        .then(async (result) => {
          if (result.error) return { data: [] };
          
          // Get emails from auth
          const userIds = result.data.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, email")
            .in("user_id", userIds);

          return {
            data: result.data.map(p => ({
              ...p,
              email: profiles?.find(pr => pr.user_id === p.user_id)?.email || "Unknown",
            })),
          };
        });

      const usersMap = new Map<string, AdminUserInfo>();
      data?.forEach((user: any) => {
        usersMap.set(user.user_id, user);
      });
      setAdminUsers(usersMap);
    };

    fetchAdminUsers();
  }, []);

  const totalPages = Math.max(1, Math.ceil((logsData?.total || 0) / ITEMS_PER_PAGE));

  const getActionConfig = (actionType: string) => {
    return ACTION_CONFIG[actionType] || {
      icon: Clock,
      label: actionType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      color: "text-slate-600",
      bgColor: "bg-slate-100",
    };
  };

  const getAdminInfo = (userId: string): AdminUserInfo => {
    return adminUsers.get(userId) || { user_id: userId, email: "Unknown User", display_name: null, avatar_url: null };
  };

  const getTargetInfo = (entry: AuditLogEntry) => {
    const details = entry.details as Record<string, any> || {};
    if (details.target_email) return details.target_email;
    if (entry.target_id) {
      const target = adminUsers.get(entry.target_id);
      return target?.email || entry.target_id.slice(0, 8);
    }
    return null;
  };

  const formatDetails = (entry: AuditLogEntry) => {
    const details = entry.details as Record<string, any> || {};
    const parts: string[] = [];

    if (details.new_role) {
      parts.push(`Role: ${details.new_role}`);
    }
    if (details.permissions_changed) {
      parts.push(`${details.permissions_changed} permissions changed`);
    }
    if (details.reason) {
      parts.push(details.reason);
    }

    return parts.join(" • ");
  };

  const getInitials = (info: AdminUserInfo) => {
    if (info.display_name) {
      return info.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return info.email?.slice(0, 2).toUpperCase() || "??";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            User Activity Log
          </CardTitle>
          <CardDescription>
            Track admin user logins, permission changes, and account actions
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : logsData?.logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No activity recorded yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logsData?.logs.map((entry) => {
                const config = getActionConfig(entry.action_type);
                const ActionIcon = config.icon;
                const adminInfo = getAdminInfo(entry.admin_user_id);
                const targetInfo = getTargetInfo(entry);
                const details = formatDetails(entry);

                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Actor Avatar */}
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={adminInfo.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-slate-100">
                        {getInitials(adminInfo)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {adminInfo.display_name || adminInfo.email}
                        </span>
                        <Badge variant="outline" className={cn(
                          "text-xs gap-1",
                          config.bgColor,
                          config.color,
                          "border-transparent"
                        )}>
                          <ActionIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        {targetInfo && entry.admin_user_id !== entry.target_id && (
                          <span className="text-sm text-muted-foreground">
                            → <span className="font-medium text-foreground">{targetInfo}</span>
                          </span>
                        )}
                      </div>
                      {details && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {details}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        <span className="mx-1.5">•</span>
                        {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({logsData?.total} total)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
