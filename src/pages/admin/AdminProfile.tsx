import { useState, useEffect } from "react";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  History, Bell, Save, Loader2, 
  UserCheck, FileText, ShieldCheck, CreditCard, FileWarning,
  Clock, Monitor, Smartphone, Laptop, Tablet, Globe, MapPin,
  LogOut, Trash2, Shield
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { ProfileInformationCard, SecurityCard, TwoFactorCard } from "@/components/admin/profile";

// Extended admin profile type
interface AdminProfile {
  avatar_url: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  last_login_at: string | null;
  notify_new_providers: boolean | null;
  notify_new_leads: boolean | null;
  notify_security_events: boolean | null;
  notify_system_alerts: boolean | null;
  notify_subscription_changes: boolean | null;
  email_digest_frequency: string | null;
}

// Get device icon based on device/browser info
const getDeviceIcon = (deviceName: string | null, browser: string | null) => {
  const name = (deviceName || browser || "").toLowerCase();
  if (name.includes("mobile") || name.includes("iphone") || name.includes("android")) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (name.includes("tablet") || name.includes("ipad")) {
    return <Tablet className="h-5 w-5" />;
  }
  if (name.includes("laptop")) {
    return <Laptop className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
};

// Action icons and labels for activity timeline
const getActionIcon = (actionType: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    profile_photo_updated: <History className="h-4 w-4" />,
    profile_name_updated: <History className="h-4 w-4" />,
    password_changed: <Shield className="h-4 w-4" />,
    notification_preferences_updated: <Bell className="h-4 w-4" />,
    mfa_enabled: <Shield className="h-4 w-4" />,
    mfa_disabled: <Shield className="h-4 w-4" />,
    mfa_recovery_codes_regenerated: <Shield className="h-4 w-4" />,
    login: <Shield className="h-4 w-4" />,
    session_revoked: <LogOut className="h-4 w-4" />,
  };
  return iconMap[actionType] || <History className="h-4 w-4" />;
};

const getActionLabel = (actionType: string) => {
  const labelMap: Record<string, string> = {
    profile_photo_updated: "Updated profile photo",
    profile_name_updated: "Updated display name",
    password_changed: "Changed password",
    notification_preferences_updated: "Updated notification preferences",
    mfa_enabled: "Enabled two-factor authentication",
    mfa_disabled: "Disabled two-factor authentication",
    mfa_recovery_codes_regenerated: "Regenerated recovery codes",
    login: "Signed in",
    session_revoked: "Revoked session",
  };
  return labelMap[actionType] || actionType.replace(/_/g, " ");
};

export default function AdminProfile() {
  const { toast } = useToast();
  const { logError } = useAdminErrorHandler("AdminProfile");
  const queryClient = useQueryClient();
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    notify_new_providers: true,
    notify_new_leads: true,
    notify_security_events: true,
    notify_system_alerts: true,
    notify_subscription_changes: true,
    email_digest_frequency: 'daily',
  });

  // Fetch current user
  const { data: userData, error: userError } = useQuery({
    queryKey: ["admin-profile-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch profile
  const { data: profile, isLoading, refetch: refetchProfile, error: profileError } = useQuery({
    queryKey: ["admin-profile", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return null;
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, display_name, first_name, last_name, avatar_url, admin_role, status, force_password_change, mfa_enabled, mfa_skip, last_login_at, created_at, updated_at, notify_new_leads, notify_new_providers, notify_security_events, notify_subscription_changes, notify_system_alerts, email_digest_frequency")
        .eq("user_id", userData.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as AdminProfile | null;
    },
    enabled: !!userData?.id,
  });

  // Fetch active sessions
  const { data: sessions, isLoading: isLoadingSessions, refetch: refetchSessions, error: sessionsError } = useQuery({
    queryKey: ["admin-sessions", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      const { data, error } = await supabase
        .from("user_sessions")
        .select("id, user_id, device_name, browser, os, location, ip_address, last_active_at, created_at, is_current")
        .eq("user_id", userData.id)
        .is("revoked_at", null)
        .order("last_active_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.id,
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: isLoadingActivity, error: activityError } = useQuery({
    queryKey: ["admin-activity", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, admin_user_id, action_type, target_type, target_id, details, created_at")
        .eq("admin_user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.id,
  });

  // Log query errors
  useEffect(() => {
    if (userError) logError("fetch_user", userError, { queryKey: "admin-profile-user" });
  }, [userError, logError]);

  useEffect(() => {
    if (profileError) logError("fetch_profile", profileError, { queryKey: "admin-profile" });
  }, [profileError, logError]);

  useEffect(() => {
    if (sessionsError) logError("fetch_sessions", sessionsError, { queryKey: "admin-sessions" });
  }, [sessionsError, logError]);

  useEffect(() => {
    if (activityError) logError("fetch_activity", activityError, { queryKey: "admin-activity" });
  }, [activityError, logError]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userData?.id) return;

    const activityChannel = supabase
      .channel('admin-profile-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_audit_log',
          filter: `admin_user_id=eq.${userData.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-activity", userData.id] });
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel('admin-profile-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userData.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-sessions", userData.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [userData?.id, queryClient]);

  // Load notification preferences from profile
  useEffect(() => {
    if (profile) {
      setNotificationPrefs({
        notify_new_providers: profile.notify_new_providers ?? true,
        notify_new_leads: profile.notify_new_leads ?? true,
        notify_security_events: profile.notify_security_events ?? true,
        notify_system_alerts: profile.notify_system_alerts ?? true,
        notify_subscription_changes: profile.notify_subscription_changes ?? true,
        email_digest_frequency: profile.email_digest_frequency ?? 'daily',
      });
    }
  }, [profile]);

  const handleSaveNotificationPrefs = async () => {
    if (!userData?.id) return;

    setIsSavingNotifications(true);
    try {
      const { error } = await supabase
        .from("admin_user_profiles")
        .update({
          notify_new_providers: notificationPrefs.notify_new_providers,
          notify_new_leads: notificationPrefs.notify_new_leads,
          notify_security_events: notificationPrefs.notify_security_events,
          notify_system_alerts: notificationPrefs.notify_system_alerts,
          notify_subscription_changes: notificationPrefs.notify_subscription_changes,
          email_digest_frequency: notificationPrefs.email_digest_frequency,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userData.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      
      await logAdminAction({
        actionType: AdminAuditActions.NOTIFICATION_PREFERENCES_UPDATED,
        targetType: "admin_profile",
        targetId: userData.id,
        details: { preferences: notificationPrefs },
      });

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (err) {
      console.error("Error saving notification preferences:", err);
      toast({
        title: "Save failed",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!userData?.id) return;

    setRevokingSessionId(sessionId);
    try {
      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("user_id", userData.id);

      if (error) throw error;

      await refetchSessions();
      
      await logAdminAction({
        actionType: AdminAuditActions.SESSION_REVOKED,
        targetType: "user_session",
        targetId: sessionId,
        details: { revokedAt: new Date().toISOString() },
      });

      toast({
        title: "Session revoked",
        description: "The session has been terminated.",
      });
    } catch (err) {
      console.error("Error revoking session:", err);
      toast({
        title: "Failed to revoke session",
        description: "Could not revoke the session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!userData?.id || !sessions) return;

    setIsRevokingAll(true);
    try {
      const currentSession = sessions.find(s => s.is_current) || sessions[0];
      const otherSessionIds = sessions
        .filter(s => s.id !== currentSession?.id)
        .map(s => s.id);

      if (otherSessionIds.length === 0) {
        toast({
          title: "No other sessions",
          description: "There are no other active sessions to revoke.",
        });
        setIsRevokingAll(false);
        return;
      }

      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .in("id", otherSessionIds)
        .eq("user_id", userData.id);

      if (error) throw error;

      await refetchSessions();
      
      await logAdminAction({
        actionType: AdminAuditActions.SESSION_REVOKED,
        targetType: "user_sessions",
        targetId: userData.id,
        details: { 
          revokedCount: otherSessionIds.length,
          revokedAt: new Date().toISOString() 
        },
      });

      toast({
        title: "Sessions revoked",
        description: `${otherSessionIds.length} other session(s) have been terminated.`,
      });
    } catch (err) {
      console.error("Error revoking sessions:", err);
      toast({
        title: "Failed to revoke sessions",
        description: "Could not revoke sessions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRevokingAll(false);
    }
  };

  const currentSession = sessions?.find(s => s.is_current) || sessions?.[0];
  const otherSessions = sessions?.filter(s => s.id !== currentSession?.id) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Manage your admin account settings and security</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Account Status Card */}
      <Card className="border-l-4 border-l-success">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-success/10">
                <Shield className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium">Account Status: Active</p>
                <p className="text-sm text-muted-foreground">
                  Last login: {profile?.last_login_at 
                    ? format(new Date(profile.last_login_at), "PPp")
                    : "Recently"}
                </p>
              </div>
            </div>
            <Badge className="bg-success/10 text-success hover:bg-success/10">
              {profile?.status || "active"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      {userData?.id && userData?.email && (
        <ProfileInformationCard
          userId={userData.id}
          userEmail={userData.email}
          profile={profile ? {
            avatar_url: profile.avatar_url,
            first_name: profile.first_name,
            last_name: profile.last_name,
          } : null}
          onProfileUpdated={refetchProfile}
        />
      )}

      {/* Session Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>Manage your active sessions across devices</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {otherSessions.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                      <LogOut className="h-4 w-4" />
                      Revoke All Others
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will sign you out from all other devices. You will remain signed in on this device only.
                        {otherSessions.length > 0 && (
                          <span className="block mt-2 font-medium">
                            {otherSessions.length} session(s) will be terminated.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRevokeAllOtherSessions}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={isRevokingAll}
                      >
                        {isRevokingAll ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Revoking...
                          </>
                        ) : (
                          "Revoke All"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="space-y-4">
              {/* Current Session */}
              {currentSession && (
                <div className="border rounded-lg p-4 bg-success/5 border-success/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-success/10 text-success">
                        {getDeviceIcon(currentSession.device_name, currentSession.browser)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {currentSession.browser || "Unknown Browser"}
                            {currentSession.os && ` on ${currentSession.os}`}
                          </p>
                          <Badge className="bg-success/10 text-success text-xs">Current</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {currentSession.ip_address && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {currentSession.ip_address}
                            </span>
                          )}
                          {currentSession.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {currentSession.location}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Active now
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Sessions */}
              {otherSessions.length > 0 && (
                <>
                  <Separator />
                  <p className="text-sm font-medium text-muted-foreground">Other Sessions ({otherSessions.length})</p>
                  <div className="space-y-3">
                    {otherSessions.map((session) => (
                      <div key={session.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                              {getDeviceIcon(session.device_name, session.browser)}
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium">
                                {session.browser || "Unknown Browser"}
                                {session.os && ` on ${session.os}`}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {session.ip_address && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    {session.ip_address}
                                  </span>
                                )}
                                {session.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {session.location}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last active {session.last_active_at 
                                  ? formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true })
                                  : "unknown"}
                              </p>
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/5"
                                disabled={revokingSessionId === session.id}
                              >
                                {revokingSessionId === session.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will sign you out from this device. You can sign in again anytime.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevokeSession(session.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Revoke Session
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active sessions found</p>
              <p className="text-xs mt-1">Session tracking starts with your next login</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Section */}
      {userData?.id && userData?.email && (
        <SecurityCard userId={userData.id} userEmail={userData.email} />
      )}

      {/* Two-Factor Authentication */}
      {userData?.id && (
        <TwoFactorCard userId={userData.id} />
      )}

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Control what notifications you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Categories */}
          <div className="space-y-4">
            {/* New Providers */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">New Provider Signups</p>
                  <p className="text-xs text-muted-foreground">Get notified when new providers register</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.notify_new_providers}
                onCheckedChange={(checked) => 
                  setNotificationPrefs(prev => ({ ...prev, notify_new_providers: checked }))
                }
              />
            </div>

            {/* New Leads */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10 text-success">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">New Lead Submissions</p>
                  <p className="text-xs text-muted-foreground">Get notified when new leads are submitted</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.notify_new_leads}
                onCheckedChange={(checked) => 
                  setNotificationPrefs(prev => ({ ...prev, notify_new_leads: checked }))
                }
              />
            </div>

            {/* Security Events */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Security Events</p>
                  <p className="text-xs text-muted-foreground">Get notified about suspicious activities and security alerts</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.notify_security_events}
                onCheckedChange={(checked) => 
                  setNotificationPrefs(prev => ({ ...prev, notify_security_events: checked }))
                }
              />
            </div>

            {/* Subscription Changes */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent text-accent-foreground">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Subscription Changes</p>
                  <p className="text-xs text-muted-foreground">Get notified when providers upgrade, downgrade, or cancel</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.notify_subscription_changes}
                onCheckedChange={(checked) => 
                  setNotificationPrefs(prev => ({ ...prev, notify_subscription_changes: checked }))
                }
              />
            </div>

            {/* System Alerts */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <FileWarning className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">System Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified about system issues and important updates</p>
                </div>
              </div>
              <Switch
                checked={notificationPrefs.notify_system_alerts}
                onCheckedChange={(checked) => 
                  setNotificationPrefs(prev => ({ ...prev, notify_system_alerts: checked }))
                }
              />
            </div>
          </div>

          {/* Email Digest Frequency */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Email Digest Frequency</Label>
            <Select
              value={notificationPrefs.email_digest_frequency}
              onValueChange={(value) => 
                setNotificationPrefs(prev => ({ ...prev, email_digest_frequency: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant (Real-time)</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
                <SelectItem value="never">Never (Disable all emails)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {notificationPrefs.email_digest_frequency === 'instant' && 
                "You'll receive emails immediately as events occur."}
              {notificationPrefs.email_digest_frequency === 'daily' && 
                "You'll receive a daily summary email with all events."}
              {notificationPrefs.email_digest_frequency === 'weekly' && 
                "You'll receive a weekly summary email with all events."}
              {notificationPrefs.email_digest_frequency === 'never' && 
                "You won't receive any email notifications."}
            </p>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSaveNotificationPrefs} 
            disabled={isSavingNotifications}
            className="w-full"
          >
            {isSavingNotifications ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Notification Preferences
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your recent actions in the admin panel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className={`relative flex gap-4 pl-10 ${index === 0 ? "animate-fade-in" : ""}`}
                  >
                    <div className="absolute left-2 p-1.5 rounded-full bg-background border border-border">
                      {getActionIcon(activity.action_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {getActionLabel(activity.action_type)}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {activity.target_type && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {activity.target_type.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {activity.target_id && (
                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                            {activity.target_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs mt-1">Your actions will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
