import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  Mail,
  Play,
  Loader2,
  CheckCircle,
  Bell,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

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
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  // Fetch current admin's security notification preference
  const { data: adminProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["admin-security-notification-pref"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("notify_security_events, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch platform alert threshold settings
  const { data: alertSettings } = useQuery({
    queryKey: ["security-alert-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["alert_threshold", "auto_block_threshold", "alert_time_window"]);

      if (error) throw error;
      
      const settings: Record<string, any> = {};
      data?.forEach((s) => {
        settings[s.setting_key] = s.setting_value;
      });
      return settings;
    },
  });

  // Update security notification preference
  const updateNotificationPref = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("admin_user_profiles")
        .update({ notify_security_events: enabled })
        .eq("user_id", user.id);

      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ["admin-security-notification-pref"] });
      toast.success(enabled ? "Security email alerts enabled" : "Security email alerts disabled");
    },
    onError: (error: Error) => {
      toast.error("Failed to update preference", { description: error.message });
    },
  });

  // Update alert threshold setting
  const updateAlertSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("platform_settings")
        .upsert({ 
          setting_key: key,
          setting_value: value,
          updated_by: user?.id 
        }, { onConflict: "setting_key" });

      if (error) throw error;

      await logAdminAction({
        actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
        targetType: "platform_settings",
        details: { setting_key: key, new_value: value }
      });

      return { key, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-alert-settings"] });
      toast.success("Alert setting updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update setting", { description: error.message });
    },
  });

  // Run manual security check
  const runSecurityCheck = async () => {
    setIsRunningCheck(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-brute-force-alerts");

      if (error) throw error;

      await logAdminAction({
        actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
        targetType: "security",
        details: { action: "manual_security_check", result: data }
      });

      if (data?.alerts_sent > 0 || data?.auto_blocked > 0) {
        toast.warning("Security threats detected", {
          description: `${data.alerts_sent || 0} alert(s), ${data.auto_blocked || 0} IP(s) blocked`,
        });
      } else {
        toast.success("Security check complete", {
          description: "No threats detected",
        });
      }

      // Refresh data
      refetchAttempts();
      refetchBlocked();
    } catch (error: any) {
      console.error("Security check error:", error);
      toast.error("Security check failed", { description: error.message });
    } finally {
      setIsRunningCheck(false);
    }
  };

  // Fetch recent failed login attempts
  const { data: failedAttempts, isLoading: loadingAttempts, refetch: refetchAttempts } = useQuery({
    queryKey: ["security-failed-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_limit_log")
        .select("id, identifier, action_type, success, created_at, metadata")
        .eq("success", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as FailedAttempt[];
    },
    refetchInterval: 30000,
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runSecurityCheck}
              disabled={isRunningCheck}
              className="gap-1"
            >
              {isRunningCheck ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Check
            </Button>
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
        </div>
        <CardDescription>
          Monitor failed login attempts and blocked IPs in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Email Alert Settings */}
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="h-4 w-4 text-blue-500" />
            <h4 className="text-sm font-medium">Email Alert Settings</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Email Alerts Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive security alerts</p>
                </div>
              </div>
              {loadingProfile ? (
                <Skeleton className="h-5 w-9" />
              ) : (
                <Switch
                  checked={adminProfile?.notify_security_events !== false}
                  onCheckedChange={(checked) => updateNotificationPref.mutate(checked)}
                  disabled={updateNotificationPref.isPending}
                />
              )}
            </div>

            {/* Alert Threshold */}
            <div className="p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Alert Threshold</p>
              </div>
              <Select
                value={String((alertSettings?.alert_threshold as { attempts?: number })?.attempts || '10')}
                onValueChange={(value) => updateAlertSetting.mutate({
                  key: "alert_threshold",
                  value: { attempts: parseInt(value) }
                })}
                disabled={updateAlertSetting.isPending}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 failures</SelectItem>
                  <SelectItem value="10">10 failures</SelectItem>
                  <SelectItem value="15">15 failures</SelectItem>
                  <SelectItem value="20">20 failures</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Window */}
            <div className="p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Time Window</p>
              </div>
              <Select
                value={String((alertSettings?.alert_time_window as { hours?: number })?.hours || '1')}
                onValueChange={(value) => updateAlertSetting.mutate({
                  key: "alert_time_window",
                  value: { hours: parseInt(value) }
                })}
                disabled={updateAlertSetting.isPending}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Status */}
            <div className={cn(
              "p-3 rounded-lg border",
              adminProfile?.notify_security_events !== false
                ? "bg-green-50 border-green-200"
                : "bg-muted/50"
            )}>
              <div className="flex items-center gap-2 mb-1">
                {adminProfile?.notify_security_events !== false ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <p className="text-sm font-medium">Status</p>
              </div>
              <p className={cn(
                "text-xs",
                adminProfile?.notify_security_events !== false
                  ? "text-green-600"
                  : "text-muted-foreground"
              )}>
                {adminProfile?.notify_security_events !== false
                  ? "Alerts active - you'll receive emails"
                  : "Alerts disabled"}
              </p>
            </div>
          </div>
        </div>

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
