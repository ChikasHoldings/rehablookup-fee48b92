import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Bell, Info, Save, Loader2, RotateCcw, Eye, Clock, CheckCircle2, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

type NotificationSettings = {
  rotation_notifications_enabled: boolean;
  notify_on_featured: boolean;
  notify_on_unfeatured: boolean;
  notification_timing: "immediate" | "daily_digest" | "weekly_digest";
  admin_email_recipients: string[];
};

type PlatformSettings = {
  max_homepage_featured: number;
};

const defaultNotificationSettings: NotificationSettings = {
  rotation_notifications_enabled: true,
  notify_on_featured: true,
  notify_on_unfeatured: false,
  notification_timing: "immediate",
  admin_email_recipients: ["help@rehablookup.com"],
};

const defaultPlatformSettings: PlatformSettings = {
  max_homepage_featured: 6,
};

export function FeaturedSettingsTab() {
  const queryClient = useQueryClient();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(defaultPlatformSettings);
  const [newEmail, setNewEmail] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Fetch notification settings from platform_settings
  const { data: savedNotificationSettings, isLoading: loadingNotifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["featured-notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value, updated_at")
        .eq("setting_key", "featured_notification_settings")
        .maybeSingle();
      
      if (error) throw error;
      if (data?.updated_at) {
        setLastSaved(new Date(data.updated_at));
      }
      return (data?.setting_value as NotificationSettings) || defaultNotificationSettings;
    },
  });

  // Fetch platform settings (max homepage featured)
  const { data: savedPlatformSettings, isLoading: loadingPlatform, refetch: refetchPlatform } = useQuery({
    queryKey: ["featured-platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value, updated_at")
        .eq("setting_key", "featured_platform_settings")
        .maybeSingle();
      
      if (error) throw error;
      return (data?.setting_value as PlatformSettings) || defaultPlatformSettings;
    },
  });

  // Real-time subscription for settings updates
  useEffect(() => {
    const channel = supabase
      .channel("featured-settings-updates")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "platform_settings"
        },
        (payload) => {
          const settingKey = (payload.new as { setting_key?: string })?.setting_key;
          if (settingKey === "featured_notification_settings") {
            refetchNotifications();
          } else if (settingKey === "featured_platform_settings") {
            refetchPlatform();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchNotifications, refetchPlatform]);

  // Initialize settings when data loads
  useEffect(() => {
    if (savedNotificationSettings) {
      setNotificationSettings(savedNotificationSettings);
    }
  }, [savedNotificationSettings]);

  useEffect(() => {
    if (savedPlatformSettings) {
      setPlatformSettings(savedPlatformSettings);
    }
  }, [savedPlatformSettings]);

  // Save all settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Save notification settings
      const { data: existingNotification } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("setting_key", "featured_notification_settings")
        .maybeSingle();

      const notificationValue: Json = {
        rotation_notifications_enabled: notificationSettings.rotation_notifications_enabled,
        notify_on_featured: notificationSettings.notify_on_featured,
        notify_on_unfeatured: notificationSettings.notify_on_unfeatured,
        notification_timing: notificationSettings.notification_timing,
        admin_email_recipients: notificationSettings.admin_email_recipients,
      };

      if (existingNotification) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ 
            setting_value: notificationValue,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null
          })
          .eq("setting_key", "featured_notification_settings");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .insert([{
            setting_key: "featured_notification_settings",
            setting_value: notificationValue,
            description: "Email notification settings for featured rotation",
            updated_by: user?.id || null
          }]);
        if (error) throw error;
      }

      // Save platform settings (max homepage featured)
      const { data: existingPlatform } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("setting_key", "featured_platform_settings")
        .maybeSingle();

      const platformValue: Json = {
        max_homepage_featured: platformSettings.max_homepage_featured,
      };

      if (existingPlatform) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ 
            setting_value: platformValue,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null
          })
          .eq("setting_key", "featured_platform_settings");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .insert([{
            setting_key: "featured_platform_settings",
            setting_value: platformValue,
            description: "Platform settings for featured placement",
            updated_by: user?.id || null
          }]);
        if (error) throw error;
      }

      // Audit log
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: "featured_settings_updated",
        target_type: "platform_settings",
        details: { 
          notification_settings: notificationSettings,
          platform_settings: platformSettings,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured-notification-settings"] });
      queryClient.invalidateQueries({ queryKey: ["featured-platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auto-featured-ids"] });
      setHasChanges(false);
      setLastSaved(new Date());
      toast.success("Settings saved", { description: "All settings updated successfully" });
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings", { description: "Please try again" });
    },
  });

  const updateNotificationSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updatePlatformSetting = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    setPlatformSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email", { description: "Please enter a valid email address" });
      return;
    }
    
    if (notificationSettings.admin_email_recipients.includes(email)) {
      toast.error("Duplicate email", { description: "This email is already in the list" });
      return;
    }
    
    updateNotificationSetting("admin_email_recipients", [...notificationSettings.admin_email_recipients, email]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    if (notificationSettings.admin_email_recipients.length <= 1) {
      toast.error("Cannot remove", { description: "At least one recipient is required" });
      return;
    }
    updateNotificationSetting(
      "admin_email_recipients",
      notificationSettings.admin_email_recipients.filter(e => e !== email)
    );
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    setNotificationSettings(defaultNotificationSettings);
    setPlatformSettings(defaultPlatformSettings);
    setHasChanges(true);
    setShowResetDialog(false);
    toast.info("Settings reset", { description: "Click Save to apply default settings" });
  };

  const isLoading = loadingNotifications || loadingPlatform;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <strong>Featured Settings</strong> control how featured providers are displayed and how notifications are sent. 
          Changes take effect immediately after saving.
        </AlertDescription>
      </Alert>

      {/* Last Saved Indicator */}
      {lastSaved && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Last saved: {lastSaved.toLocaleString()}</span>
        </div>
      )}

      {/* Platform Settings Card (Editable) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Platform Settings
                  <Badge variant="outline" className="text-purple-600 border-purple-200">Editable</Badge>
                </CardTitle>
                <CardDescription>
                  Configure featured placement behavior
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Homepage Featured - Editable */}
          <div className="p-4 border-2 rounded-lg bg-gradient-to-r from-purple-50 to-white border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4 text-purple-600" />
                  Max Homepage Featured
                </Label>
                <p className="text-sm text-muted-foreground">
                  Maximum number of featured providers shown on the homepage at once
                </p>
              </div>
              <Badge variant="outline" className="text-2xl px-4 py-2 font-bold text-purple-700 border-purple-300 bg-purple-50">
                {platformSettings.max_homepage_featured}
              </Badge>
            </div>
            <div className="space-y-3">
              <Slider
                value={[platformSettings.max_homepage_featured]}
                onValueChange={([value]) => updatePlatformSetting("max_homepage_featured", value)}
                min={1}
                max={12}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>3</span>
                <span>6</span>
                <span>9</span>
                <span>12</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Recommended: 6 providers for optimal homepage layout
            </p>
          </div>

          {/* Read-only settings grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Daily Rotation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Rotate featured providers daily
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200">Enabled</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Featured Plan Price</Label>
                <p className="text-sm text-muted-foreground">
                  Monthly subscription
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 font-semibold text-amber-700 border-amber-200 bg-amber-50">$1,099/mo</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Pinned Priority</Label>
                <p className="text-sm text-muted-foreground">
                  Pinned providers always shown
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Fairness Algorithm</Label>
                <p className="text-sm text-muted-foreground">
                  Equal exposure tracking
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notification Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Email Notification Settings</CardTitle>
                <CardDescription>
                  Configure email notifications for featured rotation events
                </CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowResetDialog(true)}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between p-4 border-2 rounded-lg bg-gradient-to-r from-emerald-50 to-white border-emerald-200">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-600" />
                  Rotation Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Master switch for all featured rotation email notifications
                </p>
              </div>
              <Switch 
                checked={notificationSettings.rotation_notifications_enabled}
                onCheckedChange={(checked) => updateNotificationSetting("rotation_notifications_enabled", checked)}
              />
            </div>

            {notificationSettings.rotation_notifications_enabled && (
              <>
                <Separator />
                
                {/* Provider notification options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Provider Notifications
                  </Label>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Notify When Featured</Label>
                      <p className="text-sm text-muted-foreground">
                        Email providers when they appear on homepage rotation
                      </p>
                    </div>
                    <Switch 
                      checked={notificationSettings.notify_on_featured}
                      onCheckedChange={(checked) => updateNotificationSetting("notify_on_featured", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Notify When Rotated Out</Label>
                      <p className="text-sm text-muted-foreground">
                        Email providers when rotated off the homepage
                      </p>
                    </div>
                    <Switch 
                      checked={notificationSettings.notify_on_unfeatured}
                      onCheckedChange={(checked) => updateNotificationSetting("notify_on_unfeatured", checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Notification timing */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Notification Timing
                  </Label>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Email Delivery Schedule</Label>
                      <p className="text-sm text-muted-foreground">
                        When to send featured rotation notifications to providers
                      </p>
                    </div>
                    <Select 
                      value={notificationSettings.notification_timing}
                      onValueChange={(value) => updateNotificationSetting("notification_timing", value as NotificationSettings["notification_timing"])}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Immediate
                          </span>
                        </SelectItem>
                        <SelectItem value="daily_digest">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Daily Digest
                          </span>
                        </SelectItem>
                        <SelectItem value="weekly_digest">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            Weekly Digest
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Timing explanation */}
                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                    {notificationSettings.notification_timing === "immediate" && (
                      <p>Providers receive emails instantly when featured or rotated.</p>
                    )}
                    {notificationSettings.notification_timing === "daily_digest" && (
                      <p>Providers receive a daily summary of their featured status changes.</p>
                    )}
                    {notificationSettings.notification_timing === "weekly_digest" && (
                      <p>Providers receive a weekly summary of their featured activity.</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Admin recipients */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Admin Notification Recipients
                  </Label>
                  
                  <div className="p-4 border rounded-lg space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Admin team members who receive copies of all rotation notifications
                    </p>
                    
                    {/* Email list */}
                    <div className="flex flex-wrap gap-2">
                      {notificationSettings.admin_email_recipients.map((email) => (
                        <Badge 
                          key={email} 
                          variant="secondary" 
                          className="px-3 py-1.5 text-sm flex items-center gap-2 bg-slate-100"
                        >
                          <Mail className="h-3 w-3" />
                          {email}
                          <button
                            onClick={() => removeEmail(email)}
                            className="hover:text-destructive transition-colors ml-1"
                            aria-label={`Remove ${email}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>

                    {/* Add email input */}
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Add admin email address..."
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addEmail()}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={addEmail}
                        disabled={!newEmail.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!notificationSettings.rotation_notifications_enabled && (
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  Rotation notifications are disabled. Providers will not receive emails when featured or rotated.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button - Sticky */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4 z-10">
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="shadow-lg"
            size="lg"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Default Settings?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p>This will reset all settings to their default values:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Max homepage featured: 6</li>
                    <li>• Rotation notifications: Enabled</li>
                    <li>• Notify when featured: Enabled</li>
                    <li>• Notify when rotated out: Disabled</li>
                    <li>• Timing: Immediate</li>
                    <li>• Recipients: help@rehablookup.com</li>
                  </ul>
                  <p className="mt-2">You'll need to click Save to apply the changes.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Reset Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}