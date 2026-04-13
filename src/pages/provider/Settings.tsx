import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeText, sanitizePersonName, sanitizeJobTitle, validateEmail, validatePhone as validatePhoneSanitize } from "@/lib/facilitySanitization";
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
  BellOff,
  HelpCircle,
  RotateCcw,
  History
} from "lucide-react";
import { PhoneVerificationStep } from "@/components/ui/PhoneVerificationStep";
import { formatPhoneNumber, isValidPhoneNumber } from "@/lib/phoneUtils";
import { ActivityLogTab } from "@/components/provider/settings/ActivityLogTab";
import { SessionManagementTab } from "@/components/provider/settings/SessionManagementTab";
import { UnlockHistoryTab } from "@/components/provider/settings/UnlockHistoryTab";
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
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator";

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

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  job_title: string;
  primary_contact_name: string;
  timezone: string;
}

// Common timezone options for US treatment centers
const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5/4" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6/5" },
  { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7/6" },
  { value: "America/Phoenix", label: "Arizona (MST)", offset: "UTC-7" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8/7" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)", offset: "UTC-9/8" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)", offset: "UTC-10" },
  { value: "America/Puerto_Rico", label: "Atlantic Time (AST)", offset: "UTC-4" },
] as const;

// Password validation helpers
const validatePassword = (password: string) => {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
  const isValid = Object.values(checks).every(Boolean);
  return { checks, isValid };
};

// Phone validation
const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

export default function ProviderSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: providerData, isLoading } = useProviderData();
  const [localProfile, setLocalProfile] = useState<ProfileFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
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
  
  // Tab state & unsaved changes
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || "profile");
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Sync tab from URL
  useEffect(() => {
    if (urlTab && ["profile", "security", "notifications", "sessions", "activity", "unlock-history"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logActivity = useLogActivity();

  // Fetch user ID and notification preferences
  const { data: notificationPrefs, isLoading: isLoadingNotifications } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      // Set userId for phone verification
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("email_lead_alerts, email_weekly_digest, email_product_updates, sms_lead_alerts, browser_notifications, lead_notification_frequency, notify_new_leads, notify_lead_status_changes, notify_lead_limit_warnings, notify_facility_views, digest_time, followup_reminders_enabled, default_snooze_duration")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching notification preferences:", error);
        return null;
      }

      return data as unknown as NotificationPreferences | null;
    },
  });

  // Initial profile from providerData
  const initialProfile = useMemo(() => {
    if (!providerData?.profile) return null;
    return {
      first_name: providerData.profile.first_name,
      last_name: providerData.profile.last_name,
      email: providerData.profile.email,
      phone: providerData.profile.phone || "",
      job_title: providerData.profile.job_title || "",
      primary_contact_name: providerData.profile.primary_contact_name || "",
      timezone: providerData.profile.timezone || "America/New_York",
    };
  }, [providerData?.profile]);

  // Use local state for edits, fall back to initial data
  const profile = localProfile || initialProfile;

  // Check if profile has unsaved changes
  const hasProfileChanges = useMemo(() => {
    if (!localProfile || !initialProfile) return false;
    return (
      localProfile.first_name !== initialProfile.first_name ||
      localProfile.last_name !== initialProfile.last_name ||
      localProfile.phone !== initialProfile.phone ||
      localProfile.job_title !== initialProfile.job_title ||
      localProfile.primary_contact_name !== initialProfile.primary_contact_name ||
      localProfile.timezone !== initialProfile.timezone
    );
  }, [localProfile, initialProfile]);

  // Check if notifications have unsaved changes
  const initialNotificationState = useMemo(() => {
    if (!notificationPrefs) return null;
    return {
      emailLeadAlerts: notificationPrefs.email_lead_alerts,
      emailWeeklyDigest: notificationPrefs.email_weekly_digest,
      emailProductUpdates: notificationPrefs.email_product_updates,
      smsLeadAlerts: notificationPrefs.sms_lead_alerts,
      browserNotifications: notificationPrefs.browser_notifications,
      leadNotificationFrequency: notificationPrefs.lead_notification_frequency || 'instant',
      notifyNewLeads: notificationPrefs.notify_new_leads ?? true,
      notifyLeadStatusChanges: notificationPrefs.notify_lead_status_changes ?? true,
      notifyLeadLimitWarnings: notificationPrefs.notify_lead_limit_warnings ?? true,
      notifyFacilityViews: notificationPrefs.notify_facility_views ?? false,
      digestTime: notificationPrefs.digest_time || '09:00',
      followupRemindersEnabled: notificationPrefs.followup_reminders_enabled ?? true,
      defaultSnoozeDuration: notificationPrefs.default_snooze_duration || '1_day',
    };
  }, [notificationPrefs]);

  const hasNotificationChanges = useMemo(() => {
    if (!initialNotificationState) return false;
    return (
      emailLeadAlerts !== initialNotificationState.emailLeadAlerts ||
      emailWeeklyDigest !== initialNotificationState.emailWeeklyDigest ||
      emailProductUpdates !== initialNotificationState.emailProductUpdates ||
      smsLeadAlerts !== initialNotificationState.smsLeadAlerts ||
      browserNotifications !== initialNotificationState.browserNotifications ||
      leadNotificationFrequency !== initialNotificationState.leadNotificationFrequency ||
      notifyNewLeads !== initialNotificationState.notifyNewLeads ||
      notifyLeadStatusChanges !== initialNotificationState.notifyLeadStatusChanges ||
      notifyLeadLimitWarnings !== initialNotificationState.notifyLeadLimitWarnings ||
      notifyFacilityViews !== initialNotificationState.notifyFacilityViews ||
      digestTime !== initialNotificationState.digestTime ||
      followupRemindersEnabled !== initialNotificationState.followupRemindersEnabled ||
      defaultSnoozeDuration !== initialNotificationState.defaultSnoozeDuration
    );
  }, [
    emailLeadAlerts, emailWeeklyDigest, emailProductUpdates, smsLeadAlerts,
    browserNotifications, leadNotificationFrequency, notifyNewLeads,
    notifyLeadStatusChanges, notifyLeadLimitWarnings, notifyFacilityViews,
    digestTime, followupRemindersEnabled, defaultSnoozeDuration,
    initialNotificationState
  ]);

  // Has any unsaved changes in current tab
  const hasUnsavedChanges = useMemo(() => {
    if (activeTab === 'profile') return hasProfileChanges;
    if (activeTab === 'notifications') return hasNotificationChanges;
    return false;
  }, [activeTab, hasProfileChanges, hasNotificationChanges]);

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

  // Handle tab change with unsaved changes check
  const handleTabChange = useCallback((newTab: string) => {
    if (hasUnsavedChanges && newTab !== activeTab) {
      setPendingTab(newTab);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(newTab);
    }
  }, [hasUnsavedChanges, activeTab]);

  const handleDiscardChanges = () => {
    // Reset to initial state
    setLocalProfile(null);
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
    if (pendingTab) {
      setActiveTab(pendingTab);
    }
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  // Save notification preferences
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsSavingNotifications(false);
      toast({
        title: "Session expired",
        description: "Please log in again to save your preferences.",
        variant: "destructive",
      });
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

    try {
      // Use upsert for atomic, race-condition-free save
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(preferences, { onConflict: "user_id" });

      if (error) throw error;

      setNotificationsSaved(true);
      setTimeout(() => setNotificationsSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error saving preferences",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Validate profile form
  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!profile?.first_name?.trim()) {
      errors.first_name = "First name is required";
    }
    if (!profile?.last_name?.trim()) {
      errors.last_name = "Last name is required";
    }
    if (profile?.phone && !validatePhone(profile.phone)) {
      errors.phone = "Please enter a valid phone number";
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Rate limiting for profile save
  const lastProfileSaveRef = useRef<number>(0);

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!validateProfileForm()) return;

    // Rate limit: 5 second cooldown
    const now = Date.now();
    if (now - lastProfileSaveRef.current < 5000) {
      toast({
        title: "Please wait",
        description: "You're saving too quickly. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }
    lastProfileSaveRef.current = now;

    setIsSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsSaving(false);
      toast({
        title: "Session expired",
        description: "Please log in again to save your profile.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Sanitize all text fields before saving
      const sanitizedFirstName = sanitizePersonName(profile.first_name);
      const sanitizedLastName = sanitizePersonName(profile.last_name);
      const sanitizedJobTitle = sanitizeJobTitle(profile.job_title);
      const sanitizedContactName = profile.primary_contact_name?.trim()
        ? sanitizeText(profile.primary_contact_name).slice(0, 100)
        : null;

      if (!sanitizedFirstName || !sanitizedLastName) {
        toast({
          title: "Invalid input",
          description: "First and last name are required.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          phone: profile.phone ? formatPhone(profile.phone) : null,
          job_title: sanitizedJobTitle,
          primary_contact_name: sanitizedContactName,
          timezone: profile.timezone,
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      logActivity.mutate({
        userId: session.user.id,
        eventType: "profile_update",
        eventDescription: "Profile information was updated",
      });
      
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
      setLocalProfile(null);
      queryClient.invalidateQueries({ queryKey: ["provider-data"] });
      toast({
        title: "Profile updated",
        description: "Your account information has been saved.",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Rate limiting for password changes
  const lastPasswordChangeRef = useRef<number>(0);

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    
    // Rate limit: 10 second cooldown
    const now = Date.now();
    if (now - lastPasswordChangeRef.current < 10000) {
      setPasswordError("Please wait before trying again");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields");
      return;
    }

    // Prevent excessively long passwords (DoS protection)
    if (newPassword.length > 128) {
      setPasswordError("Password must be 128 characters or less");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation must match");
      return;
    }

    const { isValid, checks } = validatePassword(newPassword);
    if (!isValid) {
      const missing = [];
      if (!checks.minLength) missing.push("at least 8 characters");
      if (!checks.hasUppercase) missing.push("an uppercase letter");
      if (!checks.hasLowercase) missing.push("a lowercase letter");
      if (!checks.hasNumber) missing.push("a number");
      setPasswordError(`Password must contain ${missing.join(", ")}`);
      return;
    }

    lastPasswordChangeRef.current = now;
    setIsUpdatingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

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
    } catch (error: any) {
      setPasswordError(error?.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
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

      // Call edge function to delete account and all associated data
      const response = await supabase.functions.invoke("delete-provider-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete account");
      }

      // Log activity before sign out
      await logActivity.mutateAsync({
        userId: session.user.id,
        eventType: "account_deleted",
        eventDescription: "Account permanently deleted",
      }).catch(() => {}); // Ignore errors as account is being deleted

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      
      // Sign out and redirect
      await supabase.auth.signOut();
      queryClient.clear();
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error deleting account",
        description: error.message || "Failed to delete your account. Please contact support.",
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
      
      navigate("/login");
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
    const current = profile || initialProfile;
    if (current) {
      setLocalProfile({ ...current, [field]: value });
      // Clear error for this field
      if (profileErrors[field]) {
        setProfileErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-96 w-full mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account, security, and notification preferences
          </p>
        </div>

        {/* Unsaved Changes Dialog */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Would you like to save them before switching tabs?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowUnsavedDialog(false);
                setPendingTab(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="outline"
                onClick={handleDiscardChanges}
              >
                Discard
              </Button>
              <Button
                onClick={async () => {
                  if (activeTab === 'profile') {
                    await handleSaveProfile();
                  } else if (activeTab === 'notifications') {
                    await handleSaveNotifications();
                  }
                  if (pendingTab) {
                    setActiveTab(pendingTab);
                  }
                  setShowUnsavedDialog(false);
                  setPendingTab(null);
                }}
              >
                Save & Continue
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="w-max md:w-full justify-start border-b border-border bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="profile" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap"
              >
                <User className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Profile
                {hasProfileChanges && <span className="ml-1.5 h-2 w-2 rounded-full bg-primary" />}
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap"
              >
                <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap"
              >
                <Bell className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Notifications
                {hasNotificationChanges && <span className="ml-1.5 h-2 w-2 rounded-full bg-primary" />}
              </TabsTrigger>
              <TabsTrigger 
                value="sessions" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap"
              >
                <Globe className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Sessions
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap"
              >
                <Activity className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Activity
              </TabsTrigger>
              <TabsTrigger 
                value="unlock-history" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap"
              >
                <History className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Unlock History
              </TabsTrigger>
            </TabsList>
          </div>

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
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={profile?.first_name || ""}
                      onChange={(e) => updateField("first_name", e.target.value)}
                      maxLength={50}
                      className={`h-10 ${profileErrors.first_name ? "border-destructive" : ""}`}
                    />
                    {profileErrors.first_name && (
                      <p className="text-xs text-destructive">{profileErrors.first_name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={profile?.last_name || ""}
                      onChange={(e) => updateField("last_name", e.target.value)}
                      maxLength={50}
                      className={`h-10 ${profileErrors.last_name ? "border-destructive" : ""}`}
                    />
                    {profileErrors.last_name && (
                      <p className="text-xs text-destructive">{profileErrors.last_name}</p>
                    )}
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
                    maxLength={100}
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
                    maxLength={100}
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

                <PhoneVerificationStep
                  phone={profile?.phone || ""}
                  onPhoneChange={(value) => updateField("phone", value)}
                  userId={userId || undefined}
                  userType="provider"
                  isVerified={!!providerData?.profile?.phone_verified}
                  onVerified={() => {
                    queryClient.invalidateQueries({ queryKey: ["provider-data"] });
                  }}
                />

                <div className="flex items-center justify-end pt-2">
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving || !hasProfileChanges} 
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
                    <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
                    <Select
                      value={profile?.timezone || "America/New_York"}
                      onValueChange={(value) => updateField("timezone", value)}
                    >
                      <SelectTrigger id="timezone" className="h-10">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            <span className="flex items-center gap-2">
                              <span>{tz.label}</span>
                              <span className="text-xs text-muted-foreground">({tz.offset})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Used for displaying times in your dashboard and email notifications
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Language</Label>
                    <Input
                      value="English (US)"
                      disabled
                      className="h-10 bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      English (US) is currently supported
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help & Support */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Help & Support
                </CardTitle>
                <CardDescription className="text-sm">
                  Get help with your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a 
                  href="mailto:support@rehablookup.com" 
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Email Support</p>
                    <p className="text-xs text-muted-foreground">support@rehablookup.com</p>
                  </div>
                </a>
                <p className="text-xs text-muted-foreground pt-2">
                  Our team typically responds within 24 hours during business days.
                </p>
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
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError(null);
                        }}
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
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      className="h-10" 
                    />
                  </div>
                </div>

                {newPassword && (
                  <PasswordStrengthIndicator password={newPassword} />
                )}

                {passwordError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {passwordError}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                    className="gap-2"
                  >
                    {isUpdatingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
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
          <TabsContent value="notifications" className="mt-6">
            {isLoadingNotifications ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Lead Notifications - Consolidated Card */}
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Lead Notifications</CardTitle>
                    <CardDescription className="text-sm">
                      Configure how and when you receive lead alerts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Email Frequency */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Email Delivery Frequency</Label>
                      <RadioGroup 
                        value={leadNotificationFrequency} 
                        onValueChange={(value) => setLeadNotificationFrequency(value as typeof leadNotificationFrequency)}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                      >
                        {[
                          { value: "instant", label: "Instant" },
                          { value: "daily_digest", label: "Daily" },
                          { value: "weekly_digest", label: "Weekly" },
                          { value: "none", label: "Off" },
                        ].map((opt) => (
                          <div key={opt.value} className="flex items-center space-x-2 p-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value={opt.value} id={opt.value} />
                            <Label htmlFor={opt.value} className="flex-1 cursor-pointer text-sm">{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Digest Time - Only show if digest is selected */}
                    {(leadNotificationFrequency === 'daily_digest' || leadNotificationFrequency === 'weekly_digest') && (
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div>
                          <p className="text-sm font-medium">Delivery Time</p>
                          <p className="text-xs text-muted-foreground">When to send your digest</p>
                        </div>
                        <Select value={digestTime} onValueChange={setDigestTime}>
                          <SelectTrigger className="w-28 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["06:00", "07:00", "08:00", "09:00", "10:00", "12:00", "14:00", "18:00"].map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Notification Types */}
                    <div className="pt-3 border-t border-border space-y-0">
                      <Label className="text-sm font-medium mb-3 block">What to notify</Label>
                      {[
                        { checked: notifyNewLeads, onChange: setNotifyNewLeads, label: "New Leads", desc: "When a new lead is available" },
                        { checked: notifyLeadStatusChanges, onChange: setNotifyLeadStatusChanges, label: "Status Changes", desc: "When lead status updates" },
                        { checked: notifyLeadLimitWarnings, onChange: setNotifyLeadLimitWarnings, label: "Low Balance", desc: "When credits are running low" },
                        { checked: notifyFacilityViews, onChange: setNotifyFacilityViews, label: "Profile Views", desc: "Weekly view summary" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                          <Switch checked={item.checked} onCheckedChange={item.onChange} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Other Channels - Consolidated */}
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Other Channels</CardTitle>
                    <CardDescription className="text-sm">
                      Additional notification methods and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {/* SMS */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">SMS Lead Alerts</p>
                          <p className="text-xs text-muted-foreground">Text message for new leads</p>
                        </div>
                      </div>
                      <Switch checked={smsLeadAlerts} onCheckedChange={setSmsLeadAlerts} disabled={!profile?.phone} />
                    </div>
                    {!profile?.phone && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 pb-3 pl-7">
                        Add a phone number in Profile to enable SMS
                      </p>
                    )}
                    
                    <Separator />
                    
                    {/* Browser */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Browser Notifications</p>
                          <p className="text-xs text-muted-foreground">Desktop push alerts</p>
                        </div>
                      </div>
                      <Switch checked={browserNotifications} onCheckedChange={setBrowserNotifications} />
                    </div>
                    
                    <Separator />
                    
                    {/* Weekly Digest */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Weekly Digest</p>
                          <p className="text-xs text-muted-foreground">Performance summary email</p>
                        </div>
                      </div>
                      <Switch checked={emailWeeklyDigest} onCheckedChange={setEmailWeeklyDigest} />
                    </div>
                    
                    <Separator />
                    
                    {/* Product Updates */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Product Updates</p>
                          <p className="text-xs text-muted-foreground">New features and news</p>
                        </div>
                      </div>
                      <Switch checked={emailProductUpdates} onCheckedChange={setEmailProductUpdates} />
                    </div>
                  </CardContent>
                </Card>

                {/* Follow-up Reminders - Compact */}
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">Follow-up Reminders</CardTitle>
                        <CardDescription className="text-sm">
                          Get reminded about uncontacted leads
                        </CardDescription>
                      </div>
                      <Switch checked={followupRemindersEnabled} onCheckedChange={setFollowupRemindersEnabled} />
                    </div>
                  </CardHeader>
                  {followupRemindersEnabled && (
                    <CardContent className="pt-0">
                      <div className="pt-3 border-t border-border">
                        <Label className="text-sm font-medium mb-2 block">Default Snooze Duration</Label>
                        <RadioGroup 
                          value={defaultSnoozeDuration} 
                          onValueChange={setDefaultSnoozeDuration}
                          className="grid grid-cols-4 gap-2"
                        >
                          {[
                            { value: "4_hours", label: "4h" },
                            { value: "1_day", label: "1d" },
                            { value: "3_days", label: "3d" },
                            { value: "1_week", label: "1w" },
                          ].map((opt) => (
                            <div key={opt.value} className="flex items-center justify-center p-2 rounded-md border border-border hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value={opt.value} id={`snooze_${opt.value}`} className="sr-only" />
                              <Label 
                                htmlFor={`snooze_${opt.value}`} 
                                className={`cursor-pointer text-sm font-medium ${defaultSnoozeDuration === opt.value ? 'text-primary' : ''}`}
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <Button 
                    size="sm" 
                    className="gap-2"
                    onClick={handleSaveNotifications}
                    disabled={isSavingNotifications || !hasNotificationChanges}
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
              </div>
            )}
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="mt-6">
            <SessionManagementTab />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <ActivityLogTab />
          </TabsContent>

          {/* Unlock History Tab */}
          <TabsContent value="unlock-history" className="mt-6">
            <UnlockHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
