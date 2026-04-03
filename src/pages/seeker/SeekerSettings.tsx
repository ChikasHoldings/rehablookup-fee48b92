import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { User, Lock, Bell, LogOut, Camera, Loader2, Eye, EyeOff, Mail, CheckCircle, AlertCircle, Pencil, Trash2, Phone, MapPin, Settings, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { ActivityLog } from "@/components/seeker/ActivityLog";
import { logActivity } from "@/hooks/useActivityLog";
import { PhoneVerificationStep } from "@/components/ui/PhoneVerificationStep";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { AuthPrompt } from "@/components/seeker/AuthPrompt";
import { Skeleton } from "@/components/ui/skeleton";
import { CameraCaptureDialog } from "@/components/seeker/CameraCaptureDialog";
import { useQueryClient } from "@tanstack/react-query";
import { SessionManagementCard } from "@/components/shared/SessionManagementCard";

interface SeekerProfile {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  zipcode: string | null;
  city: string | null;
  state: string | null;
}

export default function SeekerSettings() {
  const { userId: sessionUserId, email: sessionEmail, isAuthenticated, isReady } = useSeekerSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const zipcodeLookup = useZipcodeLookup();

  useEffect(() => {
    const loadProfile = async () => {
      if (!isReady) return;
      
      if (!sessionUserId) {
        setIsLoading(false);
        return;
      }

      setEmail(sessionEmail || "");
      setUserId(sessionUserId);

      // Check our custom verification system using security definer function
      if (sessionEmail) {
        const { data: verified } = await supabase
          .rpc('is_email_verified', { p_email: sessionEmail });
        setIsEmailVerified(!!verified);
      }

      const { data: profile } = await supabase
        .from('seeker_profiles')
        .select('display_name, first_name, last_name, avatar_url, phone, zipcode, city, state')
        .eq('user_id', sessionUserId)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setAvatarUrl(profile.avatar_url);
        setPhone(profile.phone || "");
        setZipcode(profile.zipcode || "");
        setCity(profile.city || "");
        setState(profile.state || "");
      }
      
      setIsLoading(false);
    };

    loadProfile();
  }, [isReady, sessionUserId, sessionEmail]);

  // Auto-fill city/state when zipcode changes
  useEffect(() => {
    if (zipcode.length === 5 && !city && !state) {
      zipcodeLookup.lookup(zipcode);
    }
  }, [zipcode]);

  useEffect(() => {
    if (zipcodeLookup.data && !city && !state) {
      setCity(zipcodeLookup.data.city);
      setState(zipcodeLookup.data.stateAbbr);
    }
  }, [zipcodeLookup.data]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Create unique filename - don't include bucket name in path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('seeker-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('seeker-avatars')
        .getPublicUrl(fileName);

      // Upsert profile (creates if doesn't exist)
      const { error: updateError } = await supabase
        .from('seeker_profiles')
        .upsert({ 
          user_id: userId, 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      // Invalidate the seeker profile query to update header avatar
      queryClient.invalidateQueries({ queryKey: ['seeker-profile', userId] });
      await logActivity({
        eventType: "avatar_update",
        description: "Updated profile picture"
      });
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated."
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload your avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!userId || !avatarUrl) return;

    setIsRemovingAvatar(true);

    try {
      // Extract file path from URL to delete from storage
      const urlParts = avatarUrl.split('/seeker-avatars/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('seeker-avatars')
          .remove([filePath]);
      }

      // Upsert profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('seeker_profiles')
        .upsert({ 
          user_id: userId, 
          avatar_url: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      setAvatarUrl(null);
      // Invalidate the seeker profile query to update header avatar
      queryClient.invalidateQueries({ queryKey: ['seeker-profile', userId] });
      await logActivity({
        eventType: "avatar_remove",
        description: "Removed profile picture"
      });
      toast({
        title: "Photo removed",
        description: "Your profile picture has been removed."
      });
    } catch (error) {
      console.error('Avatar removal error:', error);
      toast({
        title: "Removal failed",
        description: "Could not remove your avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleCameraCapture = async (blob: Blob) => {
    if (!userId) return;

    setIsUploadingAvatar(true);

    try {
      const fileName = `${userId}/avatar-${Date.now()}.jpg`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('seeker-avatars')
        .upload(fileName, blob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('seeker-avatars')
        .getPublicUrl(fileName);

      // Upsert profile (creates if doesn't exist)
      const { error: updateError } = await supabase
        .from('seeker_profiles')
        .upsert({ 
          user_id: userId, 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      // Invalidate the seeker profile query to update header avatar
      queryClient.invalidateQueries({ queryKey: ['seeker-profile', userId] });
      await logActivity({
        eventType: "avatar_update",
        description: "Updated profile picture via camera"
      });
      toast({
        title: "Photo saved",
        description: "Your profile picture has been updated."
      });
    } catch (error) {
      console.error('Camera capture upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not save your photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;
    if (!sessionUserId) return;

    setIsSaving(true);

    const fullDisplayName = firstName && lastName 
      ? `${firstName.trim()} ${lastName.trim()}`
      : displayName;

    // Use upsert to handle cases where profile doesn't exist yet
    const { error } = await supabase
      .from('seeker_profiles')
      .upsert({ 
        user_id: sessionUserId,
        display_name: fullDisplayName,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone || null,
        zipcode: zipcode || null,
        city: city || null,
        state: state || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      toast({
        title: "Error saving",
        description: "Could not update your profile.",
        variant: "destructive"
      });
    } else {
      setDisplayName(fullDisplayName);
      // Invalidate the seeker profile query to update header name
      queryClient.invalidateQueries({ queryKey: ['seeker-profile', sessionUserId] });
      await logActivity({
        eventType: "profile_update",
        description: "Updated profile information"
      });
      toast({
        title: "Profile updated",
        description: "Your profile has been saved."
      });
    }

    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been logged out."
    });
    navigate("/", { replace: true });
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive"
      });
    } else {
      await logActivity({
        eventType: "password_change",
        description: "Changed account password"
      });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully."
      });
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    }

    setIsChangingPassword(false);
  };

  const handleChangeEmail = async () => {
    if (isChangingEmail) return;
    if (!newEmail || !newEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingEmail(true);

    const { error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) {
      toast({
        title: "Error changing email",
        description: error.message,
        variant: "destructive"
      });
    } else {
      await logActivity({
        eventType: "email_change",
        description: "Requested email change"
      });
      toast({
        title: "Verification email sent",
        description: "Please check your new email address to confirm the change."
      });
      setNewEmail("");
      setShowEmailForm(false);
    }

    setIsChangingEmail(false);
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email }
      });

      if (error || data?.error) {
        toast({
          title: "Error sending verification",
          description: data?.error || error?.message || "Failed to send verification code",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Verification code sent",
          description: "Please check your inbox for the 6-digit verification code."
        });
      }
    } catch {
      toast({
        title: "Error sending verification",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }

    setIsResendingVerification(false);
  };

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: "Please type DELETE to confirm account deletion.",
        variant: "destructive"
      });
      return;
    }

    setIsDeletingAccount(true);

    try {
      if (!sessionUserId) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("delete-seeker-account");

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete account");
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted."
      });

      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        title: "Error deleting account",
        description: error.message || "Could not delete your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingAccount(false);
      setDeleteConfirmText("");
    }
  };

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  // Show auth prompt if not authenticated
  if (isReady && !isAuthenticated && !isLoading) {
    return (
      <AuthPrompt 
        title="Sign in to access settings"
        description="Create a free account to manage your profile and preferences."
        icon="lock"
        returnTo="/account/settings"
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Settings | RehabLookup</title>
        <meta name="description" content="Manage your account settings, profile information, notification preferences, and security options." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-display font-bold mb-4 sm:mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-xl border border-border/50">
              <div className="relative group">
                <div className="relative">
                  <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
                    <AvatarImage 
                      src={avatarUrl || undefined} 
                      alt={displayName}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Hover overlay */}
                  <div 
                    onClick={handleAvatarClick}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer flex items-center justify-center"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
                {/* Upload button */}
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 hover:scale-110 transition-all duration-200 disabled:opacity-50 ring-2 ring-background"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg">Profile Picture</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a photo to personalize your profile
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    className="gap-2"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        {avatarUrl ? "Change" : "Upload"}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCameraDialog(true)}
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    className="gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Take Photo
                  </Button>
                  {avatarUrl && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {isRemovingAvatar ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Camera Capture Dialog */}
            <CameraCaptureDialog
              open={showCameraDialog}
              onOpenChange={setShowCameraDialog}
              onCapture={handleCameraCapture}
            />

            <Separator />

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="first-name" className="text-xs sm:text-sm">First Name</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="mt-1 h-9 sm:h-10"
                />
              </div>
              <div>
                <Label htmlFor="last-name" className="text-xs sm:text-sm">Last Name</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="mt-1 h-9 sm:h-10"
                />
              </div>
            </div>

            {/* Phone */}
            <PhoneVerificationStep
              phone={phone}
              onPhoneChange={setPhone}
              userId={userId || undefined}
              userType="seeker"
              onVerified={() => {
                queryClient.invalidateQueries({ queryKey: ['seeker-profile', userId] });
              }}
            />

            {/* Location */}
            <div>
              <Label>Location</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={zipcode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                      setZipcode(value);
                      if (value.length === 5) {
                        zipcodeLookup.lookup(value);
                      }
                    }}
                    placeholder="Zip"
                    className="pl-10"
                    maxLength={5}
                  />
                </div>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="State"
                  maxLength={2}
                />
              </div>
              {zipcodeLookup.isLoading && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Looking up location...
                </p>
              )}
            </div>

            <Separator />

            {/* Email */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="email">Email</Label>
                {isEmailVerified ? (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unverified
                  </Badge>
                )}
              </div>
              
              {!showEmailForm ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      value={email}
                      disabled
                      className="bg-muted flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowEmailForm(true)}
                      title="Change email"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  {!isEmailVerified && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={handleResendVerification}
                      disabled={isResendingVerification}
                    >
                      {isResendingVerification ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3 mr-1" />
                          Resend verification email
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg mt-2">
                  <div>
                    <Label htmlFor="new-email" className="text-sm">New Email Address</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll need to verify your new email address
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleChangeEmail}
                      disabled={isChangingEmail || !newEmail}
                    >
                      {isChangingEmail ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Email"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowEmailForm(false);
                        setNewEmail("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => navigate('/account/notification-preferences')}
            >
              <span>Manage notification preferences</span>
              <Settings className="h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Control email, in-app, and review notifications
            </p>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showPasswordForm ? (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </Button>
            ) : (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
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
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>

            <Separator />

            {/* Delete Account */}
            <div className="pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This action cannot be undone. This will permanently delete your account and remove all your data including:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Your profile information</li>
                        <li>Your saved favorites</li>
                        <li>Your reviews</li>
                      </ul>
                      <div className="pt-2">
                        <Label htmlFor="delete-confirm" className="text-foreground">
                          Type <span className="font-mono font-bold">DELETE</span> to confirm
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="DELETE"
                          className="mt-2"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Session Management */}
        <SessionManagementCard compact />

        {/* Activity Log */}
        <ActivityLog />
      </div>
    </div>
    </>
  );
}
