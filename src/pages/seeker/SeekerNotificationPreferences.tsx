import { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Bell, Mail, ArrowLeft, Loader2 } from "lucide-react";
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

// Only includes keys that actually drive behavior in the codebase. The
// dead toggles (notify_lead_status_changes, notify_facility_views) had
// ZERO consumers — see docs/seeker-notification-preferences-hardening-2026-05-21.md
// for the audit. Removed rather than left to mislead the user.
interface NotificationPreferences {
  email_lead_alerts: boolean;
  email_weekly_digest: boolean;
  email_product_updates: boolean;
  followup_reminders_enabled: boolean;
  browser_notifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_lead_alerts: true,
  email_weekly_digest: true,
  email_product_updates: false,
  followup_reminders_enabled: true,
  browser_notifications: true,
};

export default function SeekerNotificationPreferences() {
  const { userId: sessionUserId, isAuthenticated, isReady } = useSeekerSession();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { toast } = useToast();

  // Per-key write sequencer. Prevents a stale upsert from a fast first
  // click from clobbering a fresh upsert from a fast second click. The
  // refs are keyed by preference name; only the latest sequence-id wins.
  const writeSeqRef = useRef<Record<string, number>>({});

  // Keys with an in-flight upsert. The realtime handler skips these so a
  // postgres_changes echo can't overwrite the user's optimistic value mid-save.
  const inFlightKeysRef = useRef<Set<string>>(new Set());

  const fetchPreferences = useCallback(async () => {
    if (!sessionUserId) {
      setIsLoading(false);
      return;
    }

    setLoadError(null);

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('user_id, email_lead_alerts, email_weekly_digest, email_product_updates, browser_notifications, followup_reminders_enabled')
      .eq('user_id', sessionUserId)
      .maybeSingle();

    if (error) {
      console.error('[SeekerNotificationPreferences] load failed:', error);
      setLoadError(error.message || "Showing defaults — saved settings may differ.");
      // Don't toast here. The inline banner is more honest than a toast
      // the user might miss; the banner stays visible until retry/reload.
    } else if (data) {
      setPreferences({
        email_lead_alerts: data.email_lead_alerts ?? true,
        email_weekly_digest: data.email_weekly_digest ?? true,
        email_product_updates: data.email_product_updates ?? false,
        followup_reminders_enabled: data.followup_reminders_enabled ?? true,
        browser_notifications: data.browser_notifications ?? true,
      });
    }
    // No row yet → defaults stand. First toggle will upsert + create.

    setIsLoading(false);
  }, [sessionUserId]);

  useEffect(() => {
    if (!isReady) return;
    fetchPreferences();
  }, [isReady, fetchPreferences]);

  // Realtime: notification_preferences added to supabase_realtime in
  // migration 20260705000000. UPDATEs from another tab (or an admin
  // support touch) propagate within ~200ms. RLS limits delivery to the
  // user's own row. We skip applying the event for any key with an
  // in-flight local write (inFlightKeysRef) — the optimistic state is the
  // intended truth until that write resolves, so an echo can't flicker it.
  useEffect(() => {
    if (!sessionUserId) return;
    const channel = supabase
      .channel(`notification-prefs-${sessionUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notification_preferences', filter: `user_id=eq.${sessionUserId}` },
        (payload) => {
          const row = payload.new as Partial<NotificationPreferences> | null;
          if (!row) return;
          const inFlight = inFlightKeysRef.current;
          const merge = (k: keyof NotificationPreferences, prevVal: boolean) =>
            inFlight.has(k) || typeof row[k] !== 'boolean' ? prevVal : (row[k] as boolean);
          setPreferences((prev) => ({
            email_lead_alerts: merge('email_lead_alerts', prev.email_lead_alerts),
            email_weekly_digest: merge('email_weekly_digest', prev.email_weekly_digest),
            email_product_updates: merge('email_product_updates', prev.email_product_updates),
            followup_reminders_enabled: merge('followup_reminders_enabled', prev.followup_reminders_enabled),
            browser_notifications: merge('browser_notifications', prev.browser_notifications),
          }));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUserId]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!sessionUserId) return;

    const prev = { ...preferences };
    setPreferences({ ...preferences, [key]: value });
    setSavingKey(key);

    // Tag this write with a monotonically-increasing per-key sequence.
    // On return we only apply the result if our sequence is still the
    // latest — a faster second click invalidates the first's effects.
    const seq = (writeSeqRef.current[key] || 0) + 1;
    writeSeqRef.current[key] = seq;
    inFlightKeysRef.current.add(key);

    // Typed patch so the computed key doesn't widen the payload to a string
    // index signature, which Supabase's generated upsert type rejects.
    const patch: Partial<Record<keyof NotificationPreferences, boolean>> = { [key]: value };
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: sessionUserId,
          updated_at: new Date().toISOString(),
          ...patch,
        },
        { onConflict: 'user_id' },
      );

    // A newer write for this key has been issued — abandon our toast +
    // rollback. The newer write (still in-flight) owns the outcome and
    // clears the in-flight flag when it resolves.
    if (writeSeqRef.current[key] !== seq) {
      return;
    }

    inFlightKeysRef.current.delete(key);

    if (error) {
      setPreferences(prev);
      toast({
        title: "Couldn't save",
        description: error.message || "Could not update your preferences. Please try again.",
        variant: "destructive",
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
        <meta name="description" content="Customize your email and in-app notification settings." />
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

        {loadError && (
          <Card className="border-destructive/50 bg-destructive/5 mb-4">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium text-destructive">Couldn't load your saved preferences</p>
                <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPreferences}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Email Notifications — every toggle here is wired to a real
            send-seeker-emails branch. Verified via codepath audit on
            2026-05-21. */}
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
              description="Get notified when facilities respond to your help requests and when your inquiry is confirmed."
              checked={preferences.email_lead_alerts}
              saving={savingKey === 'email_lead_alerts'}
              onCheckedChange={(v) => updatePreference('email_lead_alerts', v)}
            />
            <Separator />
            <PreferenceToggle
              id="followup_reminders_enabled"
              label="Follow-up Reminders"
              description="Reminders to follow up on inquiries that haven't received a response yet."
              checked={preferences.followup_reminders_enabled}
              saving={savingKey === 'followup_reminders_enabled'}
              onCheckedChange={(v) => updatePreference('followup_reminders_enabled', v)}
            />
            <Separator />
            <PreferenceToggle
              id="email_weekly_digest"
              label="Weekly Summary"
              description="Weekly summary of your saved facilities and recent activity."
              checked={preferences.email_weekly_digest}
              saving={savingKey === 'email_weekly_digest'}
              onCheckedChange={(v) => updatePreference('email_weekly_digest', v)}
            />
            <Separator />
            <PreferenceToggle
              id="email_product_updates"
              label="Product Updates & Tips"
              description="New features, treatment-finding tips, and occasional product news."
              checked={preferences.email_product_updates}
              saving={savingKey === 'email_product_updates'}
              onCheckedChange={(v) => updatePreference('email_product_updates', v)}
            />
          </CardContent>
        </Card>

        {/* In-App Notifications — the master toggle for everything that
            shows up in the in-app inbox: facility responses, review
            approvals/rejections/responses, concierge updates. */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">In-App Notifications</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Notifications that appear in your account inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <PreferenceToggle
              id="browser_notifications"
              label="In-App Inbox Notifications"
              description="Notifications when a facility responds, your review is approved or receives a reply, and concierge updates."
              checked={preferences.browser_notifications}
              saving={savingKey === 'browser_notifications'}
              onCheckedChange={(v) => updatePreference('browser_notifications', v)}
            />
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4 px-1">
          Critical account emails (sign-in confirmation, password reset, account deletion) are always sent regardless of these settings.
        </p>
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
