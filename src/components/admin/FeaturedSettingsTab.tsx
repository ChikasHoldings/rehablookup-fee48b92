import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Bell, Info, Save, Loader2, RotateCcw, Eye, Clock, CheckCircle2 } from "lucide-react";
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

const defaultSettings: NotificationSettings = {
  rotation_notifications_enabled: true,
  notify_on_featured: true,
  notify_on_unfeatured: false,
  notification_timing: "immediate",
  admin_email_recipients: ["help@rehablookup.com"],
};

export function FeaturedSettingsTab() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [newEmail, setNewEmail] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Fetch settings from platform_settings
  const { data: savedSettings, isLoading, refetch } = useQuery({
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
      return (data?.setting_value as NotificationSettings) || defaultSettings;
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
          table: "platform_settings",
          filter: "setting_key=eq.featured_notification_settings"
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Initialize settings when data loads
  useEffect(() => {
    if (savedSettings && savedSettings !== defaultSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      const { data: existing } = await supabase
        .from("platform_settings")
        .select("id")
        .eq("setting_key", "featured_notification_settings")
        .maybeSingle();

      const settingValue: Json = {
        rotation_notifications_enabled: newSettings.rotation_notifications_enabled,
        notify_on_featured: newSettings.notify_on_featured,
        notify_on_unfeatured: newSettings.notify_on_unfeatured,
        notification_timing: newSettings.notification_timing,
        admin_email_recipients: newSettings.admin_email_recipients,
      };

      const { data: { user } } = await supabase.auth.getUser();

      if (existing) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ 
            setting_value: settingValue,
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
            setting_value: settingValue,
            description: "Email notification settings for featured rotation",
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
          settings: newSettings,
          changed_fields: Object.keys(newSettings)
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured-notification-settings"] });
      setHasChanges(false);
      setLastSaved(new Date());
      toast.success("Settings saved", { description: "Notification settings updated successfully" });
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings", { description: "Please try again" });
    },
  });

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Invalid email", { description: "Please enter a valid email address" });
      return;
    }
    
    if (settings.admin_email_recipients.includes(email)) {
      toast.error("Duplicate email", { description: "This email is already in the list" });
      return;
    }
    
    updateSetting("admin_email_recipients", [...settings.admin_email_recipients, email]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    if (settings.admin_email_recipients.length <= 1) {
      toast.error("Cannot remove", { description: "At least one recipient is required" });
      return;
    }
    updateSetting(
      "admin_email_recipients",
      settings.admin_email_recipients.filter(e => e !== email)
    );
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    setShowResetDialog(false);
    toast.info("Settings reset", { description: "Click Save to apply default settings" });
  };

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
          Changes to email notifications take effect immediately. Platform-level settings (rotation, pricing) are managed by engineering.
        </AlertDescription>
      </Alert>

      {/* Last Saved Indicator */}
      {lastSaved && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Last saved: {lastSaved.toLocaleString()}</span>
        </div>
      )}

      {/* Platform Settings Card (Read-only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Settings className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Platform Settings
                  <Badge variant="secondary">Read Only</Badge>
                </CardTitle>
                <CardDescription>
                  Core featured placement configuration (managed by engineering)
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <Label className="text-base font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Max Homepage Featured
                </Label>
                <p className="text-sm text-muted-foreground">
                  Providers shown at once
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 font-semibold">6</Badge>
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
                <Label className="text-base font-medium">Fairness Algorithm</Label>
                <p className="text-sm text-muted-foreground">
                  Equal exposure tracking
                </p>
              </div>
              <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
            </div>
          </div>

          <Alert className="bg-muted/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              These platform settings are managed at the system level. Contact engineering to modify rotation rules, pricing, or homepage limits.
            </AlertDescription>
          </Alert>
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
                checked={settings.rotation_notifications_enabled}
                onCheckedChange={(checked) => updateSetting("rotation_notifications_enabled", checked)}
              />
            </div>

            {settings.rotation_notifications_enabled && (
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
                      checked={settings.notify_on_featured}
                      onCheckedChange={(checked) => updateSetting("notify_on_featured", checked)}
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
                      checked={settings.notify_on_unfeatured}
                      onCheckedChange={(checked) => updateSetting("notify_on_unfeatured", checked)}
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
                      value={settings.notification_timing}
                      onValueChange={(value) => updateSetting("notification_timing", value as NotificationSettings["notification_timing"])}
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
                    {settings.notification_timing === "immediate" && (
                      <p>Providers receive emails instantly when featured or rotated.</p>
                    )}
                    {settings.notification_timing === "daily_digest" && (
                      <p>Providers receive a daily summary of their featured status changes.</p>
                    )}
                    {settings.notification_timing === "weekly_digest" && (
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
                      {settings.admin_email_recipients.map((email) => (
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

            {!settings.rotation_notifications_enabled && (
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
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all notification settings to their default values:
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Rotation notifications: Enabled</li>
                <li>• Notify when featured: Enabled</li>
                <li>• Notify when rotated out: Disabled</li>
                <li>• Timing: Immediate</li>
                <li>• Recipients: help@rehablookup.com</li>
              </ul>
              <p className="mt-2">You'll need to click Save to apply the changes.</p>
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
    </div>
  );
}