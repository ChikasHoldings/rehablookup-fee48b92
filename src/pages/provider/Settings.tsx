import { useEffect, useState } from "react";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Mail, Lock, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
}

export default function ProviderSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

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
        phone: profile.phone,
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
      toast({
        title: "Profile updated",
        description: "Your account information has been saved.",
      });
    }
  };

  const updateField = (field: keyof Profile, value: string) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  if (isLoading) {
    return (
      <ProviderLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences
          </p>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Account Information</CardTitle>
            </div>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile?.first_name || ""}
                  onChange={(e) => updateField("first_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile?.last_name || ""}
                  onChange={(e) => updateField("last_name", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email address
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile?.phone || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Password</CardTitle>
            </div>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" />
            </div>
            <Button variant="outline">Update Password</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure how you receive updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotif" className="font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive lead alerts and updates via email
                </p>
              </div>
              <Switch
                id="emailNotif"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smsNotif" className="font-medium">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive lead alerts via text message
                </p>
              </div>
              <Switch
                id="smsNotif"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
