import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, 
  Mail, 
  Bell, 
  User, 
  CheckCircle, 
  Shield, 
  Key,
  Smartphone,
  Globe,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  LogOut,
  Activity,
  Clock,
  BellOff
} from "lucide-react";
import { ActivityLogTab } from "@/components/provider/settings/ActivityLogTab";
import { SessionManagementTab } from "@/components/provider/settings/SessionManagementTab";
import { useLogActivity } from "@/hooks/useActivityLog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useProviderData } from "@/hooks/useProviderData";

interface NotificationPreferences {
  email_lead_alerts: boolean;
  email_weekly_digest: boolean;
  email_product_updates: boolean;
  sms_lead_alerts: boolean;
  browser_notifications: boolean;
  lead_notification_frequency: 'instant' | 'daily_digest' | 'weekly_digest' | 'none';
  notify_new_leads: boolean;
  notify_lead_status_changes: boolean;
  notify_lead_limit_warnings: boolean;
  notify_facility_views: boolean;
  digest_time: string;
  followup_reminders_enabled: boolean;
  default_snooze_duration: string;
}

export default function ProviderSettingsPage() {
  const navigate = useNavigate();
  const { data: providerData, isLoading } = useProviderData();
  const [localProfile, setLocalProfile] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    job_title: string;
    primary_contact_name: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Delete account states
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Sign out all sessions state
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);
  
  // Notification states
  const [emailLeadAlerts, setEmailLeadAlerts] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(true);
  const [emailProductUpdates, setEmailProductUpdates] = useState(false);
  const [smsLeadAlerts, setSmsLeadAlerts] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [leadNotificationFrequency, setLeadNotificationFrequency] = useState<'instant' | 'daily_digest' | 'weekly_digest' | 'none'>('instant');
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [notifyLeadStatusChanges, setNotifyLeadStatusChanges] = useState(true);
  const [notifyLeadLimitWarnings, setNotifyLeadLimitWarnings] = useState(true);
  const [notifyFacilityViews, setNotifyFacilityViews] = useState(false);
  const [digestTime, setDigestTime] = useState('09:00');
  const [followupRemindersEnabled, setFollowupRemindersEnabled] = useState(true);
  const [defaultSnoozeDuration, setDefaultSnoozeDuration] = useState('1_day');
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationsSaved, setNotificationsSaved] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logActivity = useLogActivity();

  // Fetch notification preferences
  const { data: notificationPrefs, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching notification preferences:", error);
        return null;
      }

      return data as unknown as NotificationPreferences | null;
    },
  });

  // Sync notification preferences state when data loads
  useEffect(() => {
    if (notificationPrefs) {
      setEmailLeadAlerts(notificationPrefs.email_lead_alerts);
      setEmailWeeklyDigest(notificationPrefs.email_weekly_digest);
      setEmailProductUpdates(notificationPrefs.email_product_updates);
      setSmsLeadAlerts(notificationPrefs.sms_lead_alerts);
      setBrowserNotifications(notificationPrefs.browser_notifications);
      setLeadNotificationFrequency(notificationPrefs.lead_notification_frequency || 'instant');
      setNotifyNewLeads(notificationPrefs.notify_new_leads ?? true);
      setNotifyLeadStatusChanges(notificationPrefs.notify_lead_status_changes ?? true);
      setNotifyLeadLimitWarnings(notificationPrefs.notify_lead_limit_warnings ?? true);
      setNotifyFacilityViews(notificationPrefs.notify_facility_views ?? false);
      setDigestTime(notificationPrefs.digest_time || '09:00');
      setFollowupRemindersEnabled(notificationPrefs.followup_reminders_enabled ?? true);
      setDefaultSnoozeDuration(notificationPrefs.default_snooze_duration || '1_day');
    }
  }, [notificationPrefs]);

  // Save notification preferences
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsSavingNotifications(false);
      return;
    }

    const preferences = {
      user_id: session.user.id,
      email_lead_alerts: emailLeadAlerts,
      email_weekly_digest: emailWeeklyDigest,
      email_product_updates: emailProductUpdates,
      sms_lead_alerts: smsLeadAlerts,
      browser_notifications: browserNotifications,
      lead_notification_frequency: leadNotificationFrequency,
      notify_new_leads: notifyNewLeads,
      notify_lead_status_changes: notifyLeadStatusChanges,
      notify_lead_limit_warnings: notifyLeadLimitWarnings,
      notify_facility_views: notifyFacilityViews,
      digest_time: digestTime,
      followup_reminders_enabled: followupRemindersEnabled,
      default_snooze_duration: defaultSnoozeDuration,
    };

    // Check if preferences exist
    const { data: existing } = await supabase
      .from("notification_preferences")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing
      const result = await supabase
        .from("notification_preferences")
        .update({
          email_lead_alerts: emailLeadAlerts,
          email_weekly_digest: emailWeeklyDigest,
          email_product_updates: emailProductUpdates,
          sms_lead_alerts: smsLeadAlerts,
          browser_notifications: browserNotifications,
          lead_notification_frequency: leadNotificationFrequency,
          notify_new_leads: notifyNewLeads,
          notify_lead_status_changes: notifyLeadStatusChanges,
          notify_lead_limit_warnings: notifyLeadLimitWarnings,
          notify_facility_views: notifyFacilityViews,
          digest_time: digestTime,
          followup_reminders_enabled: followupRemindersEnabled,
          default_snooze_duration: defaultSnoozeDuration,
        })
        .eq("user_id", session.user.id);
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from("notification_preferences")
        .insert(preferences);
      error = result.error;
    }

    setIsSavingNotifications(false);

    if (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error saving preferences",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    } else {
      setNotificationsSaved(true);
      setTimeout(() => setNotificationsSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    }
  };

  // Use local state for edits, fall back to cached data
  const profile = localProfile || (providerData?.profile ? {
    first_name: providerData.profile.first_name,
    last_name: providerData.profile.last_name,
    email: providerData.profile.email,
    phone: providerData.profile.phone || "",
    job_title: providerData.profile.job_title || "",
    primary_contact_name: (providerData.profile as any).primary_contact_name || "",
  } : null);

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone || null,
        job_title: profile.job_title || null,
        primary_contact_name: profile.primary_contact_name || null,
      })
      .eq("user_id", session.user.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Error saving",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } else {
      // Log profile update activity
      logActivity.mutate({
        userId: session.user.id,
        eventType: "profile_update",
        eventDescription: "Profile information was updated",
      });
      
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      toast({
        title: "Profile updated",
        description: "Your account information has been saved.",
      });
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setIsUpdatingPassword(false);

    if (error) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Log password change activity
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        logActivity.mutate({
          userId: session.user.id,
          eventType: "password_change",
          eventDescription: "Password was changed successfully",
        });
      }
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: "Please type DELETE to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Delete user's facility and related data (cascades via FK)
      const { error: facilityError } = await supabase
        .from("facilities")
        .delete()
        .eq("user_id", session.user.id);

      if (facilityError) {
        console.error("Error deleting facility:", facilityError);
      }

      // Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", session.user.id);

      if (profileError) {
        console.error("Error deleting profile:", profileError);
      }

      // Delete notification preferences
      const { error: notifError } = await supabase
        .from("notification_preferences")
        .delete()
        .eq("user_id", session.user.id);

      if (notifError) {
        console.error("Error deleting notification preferences:", notifError);
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error deleting account",
        description: "Failed to delete your account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    setIsSigningOutAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Log session signout activity before signing out
      if (session) {
        logActivity.mutate({
          userId: session.user.id,
          eventType: "session_signout",
          eventDescription: "Signed out from all devices",
        });
      }
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You have been signed out from all devices.",
      });
      
      navigate("/provider-login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out from all sessions.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOutAll(false);
    }
  };

  const updateField = (field: string, value: string) => {
    if (profile) {
      setLocalProfile({ ...profile, [field]: value });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account, security, and notification preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="profile" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="notifications" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="sessions" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <Globe className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger 
            value="activity" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium"
          >
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          {/* Account Information */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              <CardDescription className="text-sm">
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={profile?.first_name || ""}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={profile?.last_name || ""}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-medium">
                  Job Title
                </Label>
                <Input
                  id="jobTitle"
                  value={profile?.job_title || ""}
                  onChange={(e) => updateField("job_title", e.target.value)}
                  placeholder="e.g., Facility Director"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryContactName" className="text-sm font-medium">
                  Primary Contact Name
                </Label>
                <Input
                  id="primaryContactName"
                  value={profile?.primary_contact_name || ""}
                  onChange={(e) => updateField("primary_contact_name", e.target.value)}
                  placeholder="Name shown in outgoing emails"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  This name will be used in emails sent to leads on your behalf
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="h-10 bg-muted/50 flex-1"
                  />
                  <Badge variant="secondary" className="h-10 px-3 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1.5" />
                    Verified
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile?.phone || ""}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  className="h-10"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving} 
                  className="gap-2"
                  size="sm"
                >
                  {showSaved ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timezone & Language */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Regional Settings
              </CardTitle>
              <CardDescription className="text-sm">
                Configure your timezone and language preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Timezone</Label>
                  <Input
                    value="America/New_York (EST)"
                    disabled
                    className="h-10 bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Language</Label>
                  <Input
                    value="English (US)"
                    disabled
                    className="h-10 bg-muted/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
          {/* Change Password */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                Change Password
              </CardTitle>
              <CardDescription className="text-sm">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium">
                  Current Password
                </Label>
                <div className="relative">
                  <Input 
                    id="currentPassword" 
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-10 pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input 
                      id="newPassword" 
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 pr-10" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10" 
                  />
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Minimum 8 characters</li>
                  <li>Include uppercase and lowercase letters</li>
                  <li>Include at least one number</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication - Planned Feature */}
          <Card className="border-border shadow-sm opacity-60">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Two-Factor Authentication
                <Badge variant="secondary" className="text-xs ml-2">Planned</Badge>
              </CardTitle>
              <CardDescription className="text-sm">
                Enhanced account security will be available in a future update
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Sessions */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Active Sessions</CardTitle>
              <CardDescription className="text-sm">
                Manage devices where you're currently logged in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      Current Session
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This device • Last active now
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 text-muted-foreground"
                  onClick={handleSignOutAllSessions}
                  disabled={isSigningOutAll}
                >
                  {isSigningOutAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Sign Out All Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-sm">
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <p>
                          This action cannot be undone. This will permanently delete your account, 
                          facility listing, leads, and all associated data from our servers.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="deleteConfirm" className="text-sm font-medium text-foreground">
                            Type DELETE to confirm
                          </Label>
                          <Input
                            id="deleteConfirm"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="font-mono"
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                      <Button 
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeletingAccount || deleteConfirmText !== "DELETE"}
                      >
                        {isDeletingAccount ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Deleting...
                          </>
                        ) : (
                          "Delete Account"
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          {/* Lead Notification Frequency */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Lead Email Delivery
              </CardTitle>
              <CardDescription className="text-sm">
                Choose how often you want to receive lead notification emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={leadNotificationFrequency} 
                onValueChange={(value) => setLeadNotificationFrequency(value as typeof leadNotificationFrequency)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="instant" id="instant" />
                  <Label htmlFor="instant" className="flex-1 cursor-pointer">
                    <span className="text-sm font-medium">Instant</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Get notified immediately when you receive a new lead</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="daily_digest" id="daily_digest" />
                  <Label htmlFor="daily_digest" className="flex-1 cursor-pointer">
                    <span className="text-sm font-medium">Daily Digest</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Receive a summary of all leads once per day</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="weekly_digest" id="weekly_digest" />
                  <Label htmlFor="weekly_digest" className="flex-1 cursor-pointer">
                    <span className="text-sm font-medium">Weekly Digest</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Receive a weekly summary with all leads</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="flex-1 cursor-pointer">
                    <span className="text-sm font-medium">None</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Don't send lead notification emails (still visible in dashboard)</p>
                  </Label>
                </div>
              </RadioGroup>
              
              {(leadNotificationFrequency === 'daily_digest' || leadNotificationFrequency === 'weekly_digest') && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Delivery Time</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">When should we send your digest?</p>
                    </div>
                    <Select value={digestTime} onValueChange={setDigestTime}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="07:00">7:00 AM</SelectItem>
                        <SelectItem value="08:00">8:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                        <SelectItem value="10:00">10:00 AM</SelectItem>
                        <SelectItem value="12:00">12:00 PM</SelectItem>
                        <SelectItem value="17:00">5:00 PM</SelectItem>
                        <SelectItem value="18:00">6:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Types to Notify */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Event Types
              </CardTitle>
              <CardDescription className="text-sm">
                Choose which events you want to be notified about
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">New Leads</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When someone submits an inquiry through your profile
                  </p>
                </div>
                <Switch
                  checked={notifyNewLeads}
                  onCheckedChange={setNotifyNewLeads}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Lead Status Changes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When a lead's status is updated (contacted, converted, etc.)
                  </p>
                </div>
                <Switch
                  checked={notifyLeadStatusChanges}
                  onCheckedChange={setNotifyLeadStatusChanges}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Lead Limit Warnings</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When you're approaching your monthly lead limit
                  </p>
                </div>
                <Switch
                  checked={notifyLeadLimitWarnings}
                  onCheckedChange={setNotifyLeadLimitWarnings}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Facility Views</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Weekly summary of how many people viewed your profile
                  </p>
                </div>
                <Switch
                  checked={notifyFacilityViews}
                  onCheckedChange={setNotifyFacilityViews}
                />
              </div>
            </CardContent>
          </Card>

          {/* Other Email Notifications */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Other Emails
              </CardTitle>
              <CardDescription className="text-sm">
                Additional email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Weekly Performance Digest</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Summary of your facility's performance metrics
                  </p>
                </div>
                <Switch
                  checked={emailWeeklyDigest}
                  onCheckedChange={setEmailWeeklyDigest}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Product Updates</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    New features, improvements, and platform news
                  </p>
                </div>
                <Switch
                  checked={emailProductUpdates}
                  onCheckedChange={setEmailProductUpdates}
                />
              </div>
            </CardContent>
          </Card>

          {/* SMS Notifications */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                SMS Notifications
              </CardTitle>
              <CardDescription className="text-sm">
                Text message alerts for urgent updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Lead Alerts via SMS</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive a text message when you get a new lead
                  </p>
                </div>
                <Switch
                  checked={smsLeadAlerts}
                  onCheckedChange={setSmsLeadAlerts}
                />
              </div>
              {!profile?.phone && (
                <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Add a phone number in your profile to enable SMS notifications
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Browser Notifications */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Browser Notifications
              </CardTitle>
              <CardDescription className="text-sm">
                Desktop push notifications while using the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get real-time browser notifications for new leads
                  </p>
                </div>
                <Switch
                  checked={browserNotifications}
                  onCheckedChange={setBrowserNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Reminders */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Follow-up Reminders
              </CardTitle>
              <CardDescription className="text-sm">
                Configure how lead follow-up reminders work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable Follow-up Reminders</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get reminded to follow up on leads you haven't contacted
                  </p>
                </div>
                <Switch
                  checked={followupRemindersEnabled}
                  onCheckedChange={setFollowupRemindersEnabled}
                />
              </div>
              
              {followupRemindersEnabled && (
                <div className="pt-2 border-t border-border">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Default Snooze Duration</Label>
                      <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                        When you snooze a lead reminder, how long should it wait?
                      </p>
                    </div>
                    <RadioGroup 
                      value={defaultSnoozeDuration} 
                      onValueChange={setDefaultSnoozeDuration}
                      className="grid grid-cols-2 gap-2"
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="4_hours" id="snooze_4h" />
                        <Label htmlFor="snooze_4h" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium">4 hours</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="1_day" id="snooze_1d" />
                        <Label htmlFor="snooze_1d" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium">1 day</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="3_days" id="snooze_3d" />
                        <Label htmlFor="snooze_3d" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium">3 days</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="1_week" id="snooze_1w" />
                        <Label htmlFor="snooze_1w" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium">1 week</span>
                        </Label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                      <BellOff className="h-3 w-3" />
                      Snoozed leads won't trigger follow-up reminders until the duration passes
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Notification Preferences */}
          <div className="flex justify-end">
            <Button 
              size="sm" 
              className="gap-2"
              onClick={handleSaveNotifications}
              disabled={isSavingNotifications}
            >
              {isSavingNotifications ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : notificationsSaved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6">
          <SessionManagementTab />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <ActivityLogTab />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}