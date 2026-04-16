import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Bell, Mail, MessageSquare, ArrowLeft, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationPreferences {
  email_lead_alerts: boolean;
  email_weekly_digest: boolean;
  email_product_updates: boolean;
  browser_notifications: boolean;
  notify_lead_status_changes: boolean;
  notify_facility_views: boolean;
  followup_reminders_enabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_lead_alerts: true,
  email_weekly_digest: true,
  email_product_updates: false,
  browser_notifications: true,
  notify_lead_status_changes: true,
  notify_facility_views: true,
  followup_reminders_enabled: true,
};

export default function SeekerNotificationPreferences() {
  const { userId: sessionUserId, isAuthenticated, isReady } = useSeekerSession();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadPreferences = async () => {
      if (!isReady) return;
      
      if (!sessionUserId) {
        setIsLoading(false);
        return;
      }

      setUserId(sessionUserId);

      const { data } = await supabase
        .from('notification_preferences')
        .select('user_id, email_lead_alerts, email_weekly_digest, email_product_updates, browser_notifications, notify_lead_status_changes, notify_facility_views, followup_reminders_enabled')
        .eq('user_id', sessionUserId)
        .maybeSingle();

      if (data) {
        setPreferences({
          email_lead_alerts: data.email_lead_alerts ?? true,
          email_weekly_digest: data.email_weekly_digest ?? true,
          email_product_updates: data.email_product_updates ?? false,
          browser_notifications: data.browser_notifications ?? true,
          notify_lead_status_changes: data.notify_lead_status_changes ?? true,
          notify_facility_views: data.notify_facility_views ?? true,
          followup_reminders_enabled: data.followup_reminders_enabled ?? true,
        });
      }
      
      setIsLoading(false);
    };

    loadPreferences();
  }, [isReady, sessionUserId]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!userId) return;

    const prev = { ...preferences };
    setPreferences({ ...preferences, [key]: value });
    setSavingKey(key);

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        [key]: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      setPreferences(prev);
      toast({
        title: "Error saving",
        description: "Could not update your preferences. Please try again.",
        variant: "destructive"
      });
    } else {
      toast({ title: "Preference saved" });
    }

    setSavingKey(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
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

  if (isReady && !isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
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
        <meta name="description" content="Customize your email, in-app, and review notification settings." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" asChild className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
            <Link to="/account/settings">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold">Notification Preferences</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Control how and when we notify you</p>
          </div>
        </div>

        {/* Email Notifications */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">Email Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Choose which emails you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <PreferenceToggle
              id="email_lead_alerts"
              label="Inquiry Responses"
              description="Get notified when facilities respond to your help requests"
              checked={preferences.email_lead_alerts}
              saving={savingKey === 'email_lead_alerts'}
              onCheckedChange={(v) => updatePreference('email_lead_alerts', v)}
            />
            <Separator />
            <PreferenceToggle
              id="email_weekly_digest"
              label="Weekly Summary"
              description="Receive a weekly summary of your saved facilities and requests"
              checked={preferences.email_weekly_digest}
              saving={savingKey === 'email_weekly_digest'}
              onCheckedChange={(v) => updatePreference('email_weekly_digest', v)}
            />
            <Separator />
            <PreferenceToggle
              id="email_product_updates"
              label="Product Updates"
              description="Stay informed about new features and improvements"
              checked={preferences.email_product_updates}
              saving={savingKey === 'email_product_updates'}
              onCheckedChange={(v) => updatePreference('email_product_updates', v)}
            />
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">In-App Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Control notifications within the app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            <PreferenceToggle
              id="notify_lead_status_changes"
              label="Request Status Updates"
              description="When a facility views or responds to your request"
              checked={preferences.notify_lead_status_changes}
              saving={savingKey === 'notify_lead_status_changes'}
              onCheckedChange={(v) => updatePreference('notify_lead_status_changes', v)}
            />
            <Separator />
            <PreferenceToggle
              id="notify_facility_views"
              label="Saved Facility Updates"
              description="When a facility you saved updates their listing"
              checked={preferences.notify_facility_views}
              saving={savingKey === 'notify_facility_views'}
              onCheckedChange={(v) => updatePreference('notify_facility_views', v)}
            />
            <Separator />
            <PreferenceToggle
              id="followup_reminders_enabled"
              label="Follow-up Reminders"
              description="Reminders to follow up on your help requests"
              checked={preferences.followup_reminders_enabled}
              saving={savingKey === 'followup_reminders_enabled'}
              onCheckedChange={(v) => updatePreference('followup_reminders_enabled', v)}
            />
          </CardContent>
        </Card>

        {/* Review Notifications */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">Review Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">Get notified about your reviews</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <PreferenceToggle
              id="browser_notifications"
              label="Review Status Updates"
              description="When your review is approved, rejected, or receives a response"
              checked={preferences.browser_notifications}
              saving={savingKey === 'browser_notifications'}
              onCheckedChange={(v) => updatePreference('browser_notifications', v)}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PreferenceToggle({
  id,
  label,
  description,
  checked,
  saving,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0 relative">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={saving}
        />
        {saving && (
          <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
