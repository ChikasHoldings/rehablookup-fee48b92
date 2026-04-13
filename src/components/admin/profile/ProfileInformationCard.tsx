import { useState, useEffect, useRef } from "react";
import { User, Camera, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

interface ProfileInformationCardProps {
  userId: string;
  userEmail: string;
  profile: {
    avatar_url: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  onProfileUpdated: () => void;
}

export function ProfileInformationCard({ 
  userId, 
  userEmail, 
  profile, 
  onProfileUpdated 
}: ProfileInformationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());

  // Sync state when profile loads/changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
    }
  }, [profile?.first_name, profile?.last_name]);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Admin User";
  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : profile?.first_name?.slice(0, 2).toUpperCase() || 
      userEmail?.slice(0, 2).toUpperCase() || "AD";

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WebP, or GIF image.",
        variant: "destructive",
      });
      return;
    }

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
      const fileName = `admin-avatars/${userId}-${timestamp}.${fileExt}`;

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath && oldPath.startsWith(userId)) {
          await supabase.storage
            .from("facility-images")
            .remove([`admin-avatars/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("facility-images")
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '0',
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("facility-images")
        .getPublicUrl(fileName);

      const avatarUrlWithCacheBuster = `${urlData.publicUrl}?t=${timestamp}`;

      const { error: updateError } = await supabase
        .from("admin_user_profiles")
        .update({ 
          avatar_url: avatarUrlWithCacheBuster,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setAvatarKey(timestamp);
      
      await queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-header-profile"] });
      onProfileUpdated();
      
      await logAdminAction({
        actionType: AdminAuditActions.PROFILE_PHOTO_UPDATED,
        targetType: "admin_profile",
        targetId: userId,
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
      e.target.value = '';
    }
  };

  const lastProfileSaveRef = useRef<number>(0);

  const handleUpdateProfile = async () => {
    if (!userId) return;

    // Rate limit: 5s cooldown
    const now = Date.now();
    if (now - lastProfileSaveRef.current < 5000) {
      toast({ title: "Please wait", description: "You're saving too frequently.", variant: "destructive" });
      return;
    }
    lastProfileSaveRef.current = now;

    // Sanitize names
    const cleanFirst = firstName
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/[^a-zA-Z\s\-'.]/g, '')
      .trim()
      .slice(0, 50);
    const cleanLast = lastName
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/[^a-zA-Z\s\-'.]/g, '')
      .trim()
      .slice(0, 50);

    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("admin_user_profiles")
        .update({ 
          first_name: cleanFirst || null,
          last_name: cleanLast || null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-header-profile"] });
      
      await logAdminAction({
        actionType: AdminAuditActions.PROFILE_NAME_UPDATED,
        targetType: "admin_profile",
        targetId: userId,
        details: { firstName: cleanFirst, lastName: cleanLast },
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated.",
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

  return (
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
                alt={fullName} 
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
            <p className="font-medium text-lg">{fullName}</p>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Camera className="h-3 w-3" />
              Click on the photo to upload (max 5MB)
            </p>
          </div>
        </div>

        <Separator />

        {/* Name Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                maxLength={50}
              />
            </div>
          </div>
          <Button 
            onClick={handleUpdateProfile} 
            disabled={isUpdatingProfile}
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
  );
}
