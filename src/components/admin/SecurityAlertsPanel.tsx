import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Ban,
  Clock,
  RefreshCw,
  Shield,
  User,
  Globe,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FailedAttempt {
  id: string;
  identifier: string;
  action_type: string;
  created_at: string;
  metadata: {
    ip_address?: string;
    user_agent?: string;
  } | null;
}

interface BlockedIdentifier {
  id: string;
  identifier: string;
  identifier_type: string;
  reason: string | null;
  blocked_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export function SecurityAlertsPanel() {
  const queryClient = useQueryClient();

  // Fetch recent failed login attempts
  const { data: failedAttempts, isLoading: loadingAttempts, refetch: refetchAttempts } = useQuery({
    queryKey: ["security-failed-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_limit_log")
        .select("*")
        .eq("success", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as FailedAttempt[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch active blocked identifiers
  const { data: blockedIdentifiers, isLoading: loadingBlocked, refetch: refetchBlocked } = useQuery({
    queryKey: ["security-blocked-identifiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_identifiers")
        .select("*")
        .eq("is_active", true)
        .order("blocked_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as BlockedIdentifier[];
    },
    refetchInterval: 30000,
  });

  // Real-time subscription for rate limit logs
  useEffect(() => {
    const rateLimitChannel = supabase
      .channel("security-rate-limit-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rate_limit_log" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["security-failed-attempts"] });
        }
      )
      .subscribe();

    const blockedChannel = supabase
      .channel("security-blocked-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_identifiers" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["security-blocked-identifiers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rateLimitChannel);
      supabase.removeChannel(blockedChannel);
    };
  }, [queryClient]);

  const handleRefresh = () => {
    refetchAttempts();
    refetchBlocked();
  };

  const failedCount = failedAttempts?.length ?? 0;
  const blockedCount = blockedIdentifiers?.length ?? 0;

  // Check if there are recent critical alerts (failures in last hour)
  const recentCriticalAlerts = failedAttempts?.filter((attempt) => {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(attempt.created_at) > hourAgo;
  }).length ?? 0;

  const isLoading = loadingAttempts || loadingBlocked;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={cn(
                "h-5 w-5",
                recentCriticalAlerts > 0 ? "text-red-500" : "text-amber-500"
              )} />
              Real-Time Security Alerts
            </CardTitle>
            {recentCriticalAlerts > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {recentCriticalAlerts} in last hour
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-1"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Monitor failed login attempts and blocked IPs in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Failed Login Attempts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Failed Login Attempts
              </h4>
              <Badge variant="secondary">{failedCount} recent</Badge>
            </div>
            <ScrollArea className="h-[280px] rounded-lg border">
              {loadingAttempts ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : failedAttempts && failedAttempts.length > 0 ? (
                <div className="p-2 space-y-2">
                  {failedAttempts.map((attempt) => {
                    const isRecent = new Date(attempt.created_at) > new Date(Date.now() - 60 * 60 * 1000);
                    const isEmail = attempt.identifier.includes("@");
                    
                    return (
                      <div
                        key={attempt.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          isRecent 
                            ? "bg-red-50 border-red-200" 
                            : "bg-muted/30 border-border"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isEmail ? (
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">
                              {attempt.identifier}
                            </span>
                          </div>
                          {isRecent && (
                            <Badge variant="destructive" className="shrink-0 text-xs">
                              Recent
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true })}
                          </span>
                          <span className="capitalize">
                            {attempt.action_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        {attempt.metadata?.ip_address && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            IP: {attempt.metadata.ip_address}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Shield className="h-10 w-10 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-700">All Clear</p>
                  <p className="text-xs text-muted-foreground">No recent failed login attempts</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Blocked Identifiers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Ban className="h-4 w-4 text-amber-500" />
                Active Blocked IPs/Emails
              </h4>
              <Badge variant="secondary">{blockedCount} active</Badge>
            </div>
            <ScrollArea className="h-[280px] rounded-lg border">
              {loadingBlocked ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : blockedIdentifiers && blockedIdentifiers.length > 0 ? (
                <div className="p-2 space-y-2">
                  {blockedIdentifiers.map((blocked) => {
                    const expiresAt = blocked.expires_at ? new Date(blocked.expires_at) : null;
                    const isExpiringSoon = expiresAt && expiresAt < new Date(Date.now() + 60 * 60 * 1000);
                    
                    return (
                      <div
                        key={blocked.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          isExpiringSoon 
                            ? "bg-amber-50 border-amber-200" 
                            : "bg-red-50 border-red-200"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Ban className={cn(
                              "h-4 w-4 shrink-0",
                              isExpiringSoon ? "text-amber-500" : "text-red-500"
                            )} />
                            <span className="text-sm font-medium truncate">
                              {blocked.identifier}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "shrink-0 text-xs",
                              blocked.identifier_type === "ip" 
                                ? "bg-slate-100 text-slate-700" 
                                : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {blocked.identifier_type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Blocked {formatDistanceToNow(new Date(blocked.blocked_at), { addSuffix: true })}
                          </span>
                        </div>
                        {expiresAt && (
                          <p className={cn(
                            "text-xs mt-1",
                            isExpiringSoon ? "text-amber-600" : "text-muted-foreground"
                          )}>
                            Expires: {formatDistanceToNow(expiresAt, { addSuffix: true })}
                          </p>
                        )}
                        {blocked.reason && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Reason: {blocked.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <Shield className="h-10 w-10 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-700">No Blocks Active</p>
                  <p className="text-xs text-muted-foreground">No IPs or emails are currently blocked</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{recentCriticalAlerts}</p>
            <p className="text-xs text-muted-foreground">Failures (1hr)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{blockedCount}</p>
            <p className="text-xs text-muted-foreground">Active Blocks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-600">{failedCount}</p>
            <p className="text-xs text-muted-foreground">Total Recent</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
