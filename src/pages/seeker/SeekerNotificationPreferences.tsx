import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Bell, Mail, MessageSquare, Heart, FileText, Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationPreferences {
  email_lead_alerts: boolean;
  email_weekly_digest: boolean;
  email_product_updates: boolean;
  browser_notifications: boolean;
  sms_lead_alerts: boolean;
  notify_new_leads: boolean;
  notify_lead_status_changes: boolean;
  notify_facility_views: boolean;
  notify_lead_limit_warnings: boolean;
  followup_reminders_enabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_lead_alerts: true,
  email_weekly_digest: true,
  email_product_updates: false,
  browser_notifications: true,
  sms_lead_alerts: false,
  notify_new_leads: true,
  notify_lead_status_changes: true,
  notify_facility_views: true,
  notify_lead_limit_warnings: true,
  followup_reminders_enabled: true,
};

export default function SeekerNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadPreferences = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('user_id, email_lead_alerts, email_weekly_digest, email_product_updates, browser_notifications, sms_lead_alerts, notify_new_leads, notify_lead_status_changes, notify_facility_views, notify_lead_limit_warnings, followup_reminders_enabled')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (data) {
        setPreferences({
          email_lead_alerts: data.email_lead_alerts ?? true,
          email_weekly_digest: data.email_weekly_digest ?? true,
          email_product_updates: data.email_product_updates ?? false,
          browser_notifications: data.browser_notifications ?? true,
          sms_lead_alerts: data.sms_lead_alerts ?? false,
          notify_new_leads: data.notify_new_leads ?? true,
          notify_lead_status_changes: data.notify_lead_status_changes ?? true,
          notify_facility_views: data.notify_facility_views ?? true,
          notify_lead_limit_warnings: data.notify_lead_limit_warnings ?? true,
          followup_reminders_enabled: data.followup_reminders_enabled ?? true,
        });
      }
      
      setIsLoading(false);
    };

    loadPreferences();
  }, []);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!userId) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setIsSaving(true);

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        [key]: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      // Revert on error
      setPreferences(preferences);
      toast({
        title: "Error saving",
        description: "Could not update your preferences.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Saved",
        description: "Your notification preference has been updated."
      });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Card>
          <CardContent className="p-6 space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <AuthPrompt 
          title="Sign in to manage notifications"
          description="Create an account or sign in to customize your notification preferences."
        />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Notification Preferences | RehabLookup</title>
        <meta name="description" content="Customize your email, in-app, and review notification settings to control how we communicate with you." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/account/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">Notification Preferences</h1>
          <p className="text-sm text-muted-foreground">Control how and when we notify you</p>
        </div>
      </div>

      {/* Email Notifications */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Email Notifications</CardTitle>
          </div>
          <CardDescription>Choose which emails you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_lead_alerts" className="font-medium">Request Updates</Label>
              <p className="text-sm text-muted-foreground">Get notified when facilities respond to your help requests</p>
            </div>
            <Switch
              id="email_lead_alerts"
              checked={preferences.email_lead_alerts}
              onCheckedChange={(checked) => updatePreference('email_lead_alerts', checked)}
              disabled={isSaving}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_weekly_digest" className="font-medium">Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">Receive a weekly summary of activity on your saved facilities</p>
            </div>
            <Switch
              id="email_weekly_digest"
              checked={preferences.email_weekly_digest}
              onCheckedChange={(checked) => updatePreference('email_weekly_digest', checked)}
              disabled={isSaving}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_product_updates" className="font-medium">Product Updates</Label>
              <p className="text-sm text-muted-foreground">Stay informed about new features and improvements</p>
            </div>
            <Switch
              id="email_product_updates"
              checked={preferences.email_product_updates}
              onCheckedChange={(checked) => updatePreference('email_product_updates', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">In-App Notifications</CardTitle>
          </div>
          <CardDescription>Control notifications within the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify_lead_status_changes" className="font-medium">Request Status Updates</Label>
              <p className="text-sm text-muted-foreground">When a facility views or responds to your request</p>
            </div>
            <Switch
              id="notify_lead_status_changes"
              checked={preferences.notify_lead_status_changes}
              onCheckedChange={(checked) => updatePreference('notify_lead_status_changes', checked)}
              disabled={isSaving}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify_facility_views" className="font-medium">Saved Facility Updates</Label>
              <p className="text-sm text-muted-foreground">When a saved facility updates their profile</p>
            </div>
            <Switch
              id="notify_facility_views"
              checked={preferences.notify_facility_views}
              onCheckedChange={(checked) => updatePreference('notify_facility_views', checked)}
              disabled={isSaving}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="followup_reminders_enabled" className="font-medium">Follow-up Reminders</Label>
              <p className="text-sm text-muted-foreground">Reminders to follow up on your help requests</p>
            </div>
            <Switch
              id="followup_reminders_enabled"
              checked={preferences.followup_reminders_enabled}
              onCheckedChange={(checked) => updatePreference('followup_reminders_enabled', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Review Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Review Notifications</CardTitle>
          </div>
          <CardDescription>Get notified about your reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser_notifications" className="font-medium">Review Status Updates</Label>
              <p className="text-sm text-muted-foreground">When your review is approved, rejected, or receives a response</p>
            </div>
            <Switch
              id="browser_notifications"
              checked={preferences.browser_notifications}
              onCheckedChange={(checked) => updatePreference('browser_notifications', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}
    </div>
    </>
  );
}
