import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Mail, Bell, Info, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Fetch settings from platform_settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["featured-notification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "featured_notification_settings")
        .maybeSingle();
      
      if (error) throw error;
      // Return default settings if no data, never return undefined
      return (data?.setting_value as NotificationSettings) || defaultSettings;
    },
  });

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

      // Cast to Json type for Supabase
      const settingValue: Json = {
        rotation_notifications_enabled: newSettings.rotation_notifications_enabled,
        notify_on_featured: newSettings.notify_on_featured,
        notify_on_unfeatured: newSettings.notify_on_unfeatured,
        notification_timing: newSettings.notification_timing,
        admin_email_recipients: newSettings.admin_email_recipients,
      };

      if (existing) {
        const { error } = await supabase
          .from("platform_settings")
          .update({ 
            setting_value: settingValue,
            updated_at: new Date().toISOString()
          })
          .eq("setting_key", "featured_notification_settings");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("platform_settings")
          .insert([{
            setting_key: "featured_notification_settings",
            setting_value: settingValue,
            description: "Email notification settings for featured rotation"
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured-notification-settings"] });
      setHasChanges(false);
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
    
    // Basic email validation
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rotation Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Featured Settings</CardTitle>
              <CardDescription>
                Configure featured placement behavior and rotation rules
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Daily Rotation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically rotate featured providers on the homepage daily
                </p>
              </div>
              <Switch checked disabled />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Max Homepage Featured</Label>
                <p className="text-sm text-muted-foreground">
                  Maximum number of featured providers shown on homepage
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4">6</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Featured Plan Price</Label>
                <p className="text-sm text-muted-foreground">
                  Monthly subscription price for automatic featuring
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4">$1,099/mo</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Pinned Priority</Label>
                <p className="text-sm text-muted-foreground">
                  Pinned providers bypass rotation and always appear on homepage
                </p>
              </div>
              <Switch checked disabled />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Fairness Algorithm</Label>
                <p className="text-sm text-muted-foreground">
                  Ensures equal exposure by tracking last featured date
                </p>
              </div>
              <Switch checked disabled />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Featured placement settings are managed at the platform level. Contact engineering to modify these values.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Email Notification Settings Card */}
      <Card>
        <CardHeader>
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
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Rotation Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications when providers are featured or rotated
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
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Notify When Featured</Label>
                      <p className="text-sm text-muted-foreground">
                        Send email to providers when they appear on homepage rotation
                      </p>
                    </div>
                    <Switch 
                      checked={settings.notify_on_featured}
                      onCheckedChange={(checked) => updateSetting("notify_on_featured", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Notify When Rotated Out</Label>
                      <p className="text-sm text-muted-foreground">
                        Send email to providers when they're rotated off the homepage
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
                      <Label className="text-base font-medium">Email Delivery</Label>
                      <p className="text-sm text-muted-foreground">
                        When to send featured rotation notifications
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
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="daily_digest">Daily Digest</SelectItem>
                        <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                      </SelectContent>
                    </Select>
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
                      Admin team members who receive copies of rotation notifications
                    </p>
                    
                    {/* Email list */}
                    <div className="flex flex-wrap gap-2">
                      {settings.admin_email_recipients.map((email) => (
                        <Badge 
                          key={email} 
                          variant="secondary" 
                          className="px-3 py-1.5 text-sm flex items-center gap-2"
                        >
                          {email}
                          <button
                            onClick={() => removeEmail(email)}
                            className="hover:text-destructive transition-colors"
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
                        placeholder="Add email address"
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
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end sticky bottom-4">
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending}
            className="shadow-lg"
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
    </div>
  );
}
