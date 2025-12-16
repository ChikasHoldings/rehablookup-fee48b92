import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  User, Camera, Eye, EyeOff, ShieldCheck, Save, Loader2, History, 
  UserCog, Bell, KeyRound, Image, CheckCircle, UserPlus, Ban, 
  BadgeCheck, Star, FileText, Settings, RefreshCw, Shield, 
  Clock, AlertTriangle, Lock, Monitor, Smartphone, Laptop, Tablet,
  Globe, MapPin, LogOut, Trash2, ShieldOff, Key
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { TwoFactorSetupDialog } from "@/components/admin/TwoFactorSetupDialog";
import { DisableTwoFactorDialog } from "@/components/admin/DisableTwoFactorDialog";
import { RegenerateRecoveryCodesDialog } from "@/components/admin/RegenerateRecoveryCodesDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

// Enhanced password schema with special character requirement
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

// Password strength calculator
const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[a-z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;
  return Math.min(strength, 100);
};

const getStrengthLabel = (strength: number): { label: string; color: string } => {
  if (strength < 40) return { label: "Weak", color: "bg-red-500" };
  if (strength < 70) return { label: "Medium", color: "bg-amber-500" };
  if (strength < 90) return { label: "Strong", color: "bg-green-500" };
  return { label: "Very Strong", color: "bg-emerald-600" };
};

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

export default function AdminProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FADisable, setShow2FADisable] = useState(false);
  const [showRegenerateCodes, setShowRegenerateCodes] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isCheckingMFA, setIsCheckingMFA] = useState(true);

  // Fetch current user and profile
  const { data: userData } = useQuery({
    queryKey: ["admin-profile-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profile, isLoading, refetch: refetchProfile } = useQuery({
    queryKey: ["admin-profile", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return null;
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("*")
        .eq("user_id", userData.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userData?.id,
  });

  // Fetch active sessions
  const { data: sessions, isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ["admin-sessions", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", userData.id)
        .is("revoked_at", null)
        .order("last_active_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.id,
  });

  // Fetch recent activity with real-time updates
  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["admin-activity", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("admin_user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.id,
  });

  // Real-time subscription for activity and session updates
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

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  // Check MFA status
  useEffect(() => {
    const checkMFAStatus = async () => {
      setIsCheckingMFA(true);
      try {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTotp = factorsData?.totp?.some(f => f.status === 'verified');
        setMfaEnabled(!!hasVerifiedTotp);
      } catch (err) {
        console.error('Error checking MFA status:', err);
      } finally {
        setIsCheckingMFA(false);
      }
    };
    
    checkMFAStatus();
  }, []);

  const handleMFASetupSuccess = () => {
    setMfaEnabled(true);
  };

  const handleMFADisableSuccess = () => {
    setMfaEnabled(false);
  };

  const getActionIcon = (actionType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      profile_photo_updated: <Image className="h-4 w-4" />,
      profile_name_updated: <UserCog className="h-4 w-4" />,
      password_changed: <KeyRound className="h-4 w-4" />,
      notifications_marked_read: <Bell className="h-4 w-4" />,
      notifications_cleared: <Bell className="h-4 w-4" />,
      provider_approved: <CheckCircle className="h-4 w-4" />,
      provider_suspended: <Ban className="h-4 w-4" />,
      provider_verified: <BadgeCheck className="h-4 w-4" />,
      provider_featured: <Star className="h-4 w-4" />,
      lead_assigned: <FileText className="h-4 w-4" />,
      lead_status_changed: <FileText className="h-4 w-4" />,
      admin_user_created: <UserPlus className="h-4 w-4" />,
      admin_user_deactivated: <Ban className="h-4 w-4" />,
      admin_permissions_updated: <Settings className="h-4 w-4" />,
      login: <Lock className="h-4 w-4" />,
      session_revoked: <LogOut className="h-4 w-4" />,
    };
    return iconMap[actionType] || <History className="h-4 w-4" />;
  };

  const getActionLabel = (actionType: string) => {
    const labelMap: Record<string, string> = {
      profile_photo_updated: "Updated profile photo",
      profile_name_updated: "Updated display name",
      password_changed: "Changed password",
      notifications_marked_read: "Marked notifications as read",
      notifications_cleared: "Cleared notifications",
      provider_approved: "Approved provider",
      provider_suspended: "Suspended provider",
      provider_verified: "Verified provider",
      provider_featured: "Toggled featured status",
      lead_assigned: "Assigned lead",
      lead_status_changed: "Changed lead status",
      admin_user_created: "Created admin user",
      admin_user_deactivated: "Deactivated admin user",
      admin_permissions_updated: "Updated admin permissions",
      login: "Signed in",
      session_revoked: "Revoked session",
    };
    return labelMap[actionType] || actionType.replace(/_/g, " ");
  };

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const watchedNewPassword = passwordForm.watch("newPassword");
  const passwordStrength = calculatePasswordStrength(watchedNewPassword || "");
  const strengthInfo = getStrengthLabel(passwordStrength);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.id) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WebP, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'png';
      const timestamp = Date.now();
      const fileName = `admin-avatars/${userData.id}-${timestamp}.${fileExt}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath && oldPath.startsWith(userData.id)) {
          await supabase.storage
            .from("facility-images")
            .remove([`admin-avatars/${oldPath}`]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("facility-images")
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '0',
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache buster
      const { data: urlData } = supabase.storage
        .from("facility-images")
        .getPublicUrl(fileName);

      const avatarUrlWithCacheBuster = `${urlData.publicUrl}?t=${timestamp}`;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("admin_user_profiles")
        .update({ 
          avatar_url: avatarUrlWithCacheBuster,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userData.id);

      if (updateError) throw updateError;

      // Force avatar refresh
      setAvatarKey(timestamp);
      
      // Invalidate and refetch profile
      await queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      await refetchProfile();
      
      // Log audit action
      await logAdminAction({
        actionType: AdminAuditActions.PROFILE_PHOTO_UPDATED,
        targetType: "admin_profile",
        targetId: userData.id,
        details: { fileName, timestamp },
      });

      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleUpdateProfile = async () => {
    if (!userData?.id || !displayName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("admin_user_profiles")
        .update({ 
          display_name: displayName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userData.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      
      // Log audit action
      await logAdminAction({
        actionType: AdminAuditActions.PROFILE_NAME_UPDATED,
        targetType: "admin_profile",
        targetId: userData.id,
        details: { newDisplayName: displayName.trim() },
      });

      toast({
        title: "Profile updated",
        description: "Your display name has been updated.",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (data: PasswordFormData) => {
    if (!userData?.email) return;

    setIsUpdatingPassword(true);
    try {
      // First verify current password by attempting a sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: data.currentPassword,
      });

      if (signInError) {
        toast({
          title: "Invalid current password",
          description: "The current password you entered is incorrect.",
          variant: "destructive",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Check if new password is same as current
      if (data.currentPassword === data.newPassword) {
        toast({
          title: "Password unchanged",
          description: "New password must be different from current password.",
          variant: "destructive",
        });
        setIsUpdatingPassword(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      passwordForm.reset();
      
      // Log audit action
      await logAdminAction({
        actionType: AdminAuditActions.PASSWORD_CHANGED,
        targetType: "admin_profile",
        targetId: userData?.id,
        details: { 
          changedAt: new Date().toISOString(),
          ipAddress: "logged"
        },
      });

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully. Please use the new password for future logins.",
      });
    } catch (err) {
      console.error("Error changing password:", err);
      toast({
        title: "Password change failed",
        description: err instanceof Error ? err.message : "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
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
      
      // Log audit action
      await logAdminAction({
        actionType: "session_revoked",
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
      // Find the current session (most recent or marked as current)
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
      
      // Log audit action
      await logAdminAction({
        actionType: "session_revoked",
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

  const initials = profile?.display_name?.slice(0, 2).toUpperCase() || 
                   userData?.email?.slice(0, 2).toUpperCase() || "AD";

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
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* Account Status Card */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-green-100">
                <Shield className="h-5 w-5 text-green-600" />
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
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              {profile?.status || "active"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Profile Photo & Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your photo and display name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo Upload */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 ring-2 ring-border ring-offset-2 ring-offset-background" key={avatarKey}>
                <AvatarImage 
                  src={profile?.avatar_url || undefined} 
                  alt={profile?.display_name || "Admin"} 
                />
                <AvatarFallback className="bg-amber-100 text-amber-600 text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {isUploadingPhoto ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-lg">{profile?.display_name || "Admin User"}</p>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Click on the photo to upload (max 5MB)
              </p>
            </div>
          </div>

          <Separator />

          {/* Display Name */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">{displayName.length}/50 characters</p>
            </div>
            <Button 
              onClick={handleUpdateProfile} 
              disabled={isUpdatingProfile || !displayName.trim() || displayName === profile?.display_name}
            >
              {isUpdatingProfile ? (
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
        </CardContent>
      </Card>

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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSessions()}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              {otherSessions.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-red-600 hover:text-red-700">
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
                        className="bg-red-600 hover:bg-red-700"
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
                <div className="border rounded-lg p-4 bg-green-50/50 border-green-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        {getDeviceIcon(currentSession.device_name, currentSession.browser)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {currentSession.browser || "Unknown Browser"}
                            {currentSession.os && ` on ${currentSession.os}`}
                          </p>
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Current Session
                          </Badge>
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
                          Active {currentSession.last_active_at 
                            ? formatDistanceToNow(new Date(currentSession.last_active_at), { addSuffix: true })
                            : "now"}
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
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                  className="bg-red-600 hover:bg-red-700"
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Password & Security
              </CardTitle>
              <CardDescription>Secure your account with a strong password</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Encrypted
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Security Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-800">Security Best Practices</p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
                  <li>Use a unique password not used elsewhere</li>
                  <li>Change your password regularly (every 90 days)</li>
                  <li>Never share your credentials with anyone</li>
                </ul>
              </div>
            </div>
          </div>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {watchedNewPassword && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Password Strength</span>
                          <span className={`font-medium ${
                            passwordStrength < 40 ? "text-red-600" : 
                            passwordStrength < 70 ? "text-amber-600" : 
                            "text-green-600"
                          }`}>
                            {strengthInfo.label}
                          </span>
                        </div>
                        <Progress value={passwordStrength} className="h-2" />
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Password Requirements
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 ${watchedNewPassword?.length >= 8 ? "text-green-600" : "text-muted-foreground"}`}>
                    <CheckCircle className="h-3 w-3" />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(watchedNewPassword || "") ? "text-green-600" : "text-muted-foreground"}`}>
                    <CheckCircle className="h-3 w-3" />
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[a-z]/.test(watchedNewPassword || "") ? "text-green-600" : "text-muted-foreground"}`}>
                    <CheckCircle className="h-3 w-3" />
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[0-9]/.test(watchedNewPassword || "") ? "text-green-600" : "text-muted-foreground"}`}>
                    <CheckCircle className="h-3 w-3" />
                    One number
                  </div>
                  <div className={`flex items-center gap-1.5 ${/[!@#$%^&*(),.?":{}|<>]/.test(watchedNewPassword || "") ? "text-green-600" : "text-muted-foreground"}`}>
                    <CheckCircle className="h-3 w-3" />
                    One special character
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isUpdatingPassword} className="w-full">
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </div>
            {isCheckingMFA ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : mfaEnabled ? (
              <Badge className="bg-green-100 text-green-800">Enabled</Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-green-800">Your account is protected</p>
                    <p className="text-sm text-green-700">
                      Two-factor authentication is enabled. You'll need your authenticator app to sign in.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRegenerateCodes(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Regenerate Recovery Codes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShow2FADisable(true)}
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-amber-800">Recommended for admin accounts</p>
                    <p className="text-sm text-amber-700">
                      Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app when signing in.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={() => setShow2FASetup(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-activity"] })}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
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

      {/* 2FA Dialogs */}
      <TwoFactorSetupDialog
        open={show2FASetup}
        onOpenChange={setShow2FASetup}
        onSuccess={handleMFASetupSuccess}
      />
      <DisableTwoFactorDialog
        open={show2FADisable}
        onOpenChange={setShow2FADisable}
        onSuccess={handleMFADisableSuccess}
      />
      <RegenerateRecoveryCodesDialog
        open={showRegenerateCodes}
        onOpenChange={setShowRegenerateCodes}
      />
    </div>
  );
}
