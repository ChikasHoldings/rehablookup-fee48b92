import { useState, useEffect, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { User, Lock, Bell, LogOut, Camera, Loader2, Eye, EyeOff, Mail, CheckCircle, AlertCircle, Pencil, Trash2, MapPin, Settings, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
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
  phone_verified: boolean | null;
  zipcode: string | null;
  city: string | null;
  state: string | null;
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
    if (score <= 2) return { score: 2, label: "Fair", color: "bg-warning" };
    if (score <= 3) return { score: 3, label: "Good", color: "bg-primary" };
    return { score: 4, label: "Strong", color: "bg-success" };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {strength.label} — use 8+ characters with uppercase, numbers, and symbols
      </p>
    </div>
  );
}

export default function SeekerSettings() {
  const { userId: sessionUserId, email: sessionEmail, isAuthenticated, isReady } = useSeekerSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  // Phone number captured at the moment phone_verified became true. Used
  // to detect "user edited phone after verifying" so we can clear the
  // verified flag both locally (UI) and on save (DB).
  const verifiedPhoneRef = useRef<string>("");
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
  const [currentPassword, setCurrentPassword] = useState("");
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

      // Custom verification system via SECURITY DEFINER RPC. We surface
      // the underlying error to the console (the badge falls back to
      // "Unverified") so a misconfigured RPC doesn't masquerade as a
      // genuinely unverified email — operators can see the issue.
      if (sessionEmail) {
        const { data: verified, error: verifyErr } = await supabase
          .rpc('is_email_verified', { p_email: sessionEmail });
        if (verifyErr) {
          console.warn('[SeekerSettings] is_email_verified RPC failed:', verifyErr.message);
        }
        setIsEmailVerified(!!verified);
      }

      // Fetch phone_verified alongside the rest so the badge in
      // PhoneVerificationStep reflects DB truth. Previously phone_verified
      // was never read, so the page always rendered the verify CTA — even
      // for users whose number had been verified months earlier.
      const { data: profile, error: profileErr } = await supabase
        .from('seeker_profiles')
        .select('display_name, first_name, last_name, avatar_url, phone, phone_verified, zipcode, city, state')
        .eq('user_id', sessionUserId)
        .maybeSingle();

      if (profileErr) {
        toast({
          title: "Couldn't load your profile",
          description: profileErr.message || "Please refresh the page.",
          variant: "destructive",
        });
      } else if (profile) {
        setDisplayName(profile.display_name || "");
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setAvatarUrl(profile.avatar_url);
        setPhone(profile.phone || "");
        setPhoneVerified(!!profile.phone_verified);
        verifiedPhoneRef.current = profile.phone_verified ? (profile.phone || "") : "";
        setZipcode(profile.zipcode || "");
        setCity(profile.city || "");
        setState(profile.state || "");
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [isReady, sessionUserId, sessionEmail, toast]);

  // Realtime: seeker_profiles is in supabase_realtime (migration
  // 20260702000000). Any UPDATE to this user's row — whether from an
  // admin support touch, the phone-verify edge function flipping
  // phone_verified=true, or the same user editing from another tab —
  // propagates here within ~200ms so the UI stays honest.
  useEffect(() => {
    if (!sessionUserId) return;
    const channel = supabase
      .channel(`seeker-profile-${sessionUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'seeker_profiles', filter: `user_id=eq.${sessionUserId}` },
        (payload) => {
          const row = payload.new as Partial<SeekerProfile> | null;
          if (!row) return;
          if (typeof row.phone_verified === 'boolean') {
            setPhoneVerified(row.phone_verified);
            if (row.phone_verified) verifiedPhoneRef.current = row.phone || "";
          }
          if (typeof row.avatar_url !== 'undefined') {
            setAvatarUrl(row.avatar_url ?? null);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionUserId]);

  // Auto-fill city/state when zipcode changes

  useEffect(() => {
    if (zipcode.length === 5 && !city && !state) {
      zipcodeLookup.lookup(zipcode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- city/state are intentional guards to skip lookup when already filled; zipcodeLookup is stable
  }, [zipcode]);

   
  useEffect(() => {
    if (zipcodeLookup.data && !city && !state) {
      setCity(zipcodeLookup.data.city);
      setState(zipcodeLookup.data.stateAbbr);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- city/state are intentional guards; setCity/setState are stable setters
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
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('seeker-avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seeker-avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('seeker_profiles')
        .upsert({
          user_id: userId,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      // After the new file is canonical, sweep prior avatars in this
      // user's prefix so storage doesn't accumulate one file per
      // upload-since-signup. Best-effort: a storage list/remove error
      // doesn't undo the successful update — it just leaves a stale
      // file for a future sweep.
      await cleanupOldAvatars(userId, fileName);

      setAvatarUrl(publicUrl);
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
      const message = error instanceof Error ? error.message : "Could not upload your avatar. Please try again.";
      console.error('Avatar upload error:', error);
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // List the user's prefix in seeker-avatars and remove every file
  // except the one just written. Called after a successful upload so a
  // failure here doesn't undo the user-facing success path.
  const cleanupOldAvatars = async (uid: string, keepFileName: string) => {
    try {
      const { data: files, error: listErr } = await supabase.storage
        .from('seeker-avatars')
        .list(uid, { limit: 100 });
      if (listErr || !files) return;
      const keepBase = keepFileName.split('/').pop();
      const toDelete = files
        .filter((f) => f.name !== keepBase)
        .map((f) => `${uid}/${f.name}`);
      if (toDelete.length > 0) {
        await supabase.storage.from('seeker-avatars').remove(toDelete);
      }
    } catch (err) {
      console.warn('[SeekerSettings] avatar cleanup failed:', err);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!userId || !avatarUrl) return;

    setIsRemovingAvatar(true);

    try {
      // Sweep the entire user prefix — the current avatar URL may be
      // stale (e.g. realtime updated it underneath us) so list+remove
      // is more reliable than parsing the URL.
      const { data: files } = await supabase.storage
        .from('seeker-avatars')
        .list(userId, { limit: 100 });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        await supabase.storage.from('seeker-avatars').remove(paths);
      }

      const { error: updateError } = await supabase
        .from('seeker_profiles')
        .upsert({
          user_id: userId,
          avatar_url: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      setAvatarUrl(null);
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
      const message = error instanceof Error ? error.message : "Could not remove your avatar. Please try again.";
      console.error('Avatar removal error:', error);
      toast({
        title: "Removal failed",
        description: message,
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

      const { error: uploadError } = await supabase.storage
        .from('seeker-avatars')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seeker-avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('seeker_profiles')
        .upsert({
          user_id: userId,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      await cleanupOldAvatars(userId, fileName);

      setAvatarUrl(publicUrl);
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
      const message = error instanceof Error ? error.message : "Could not save your photo. Please try again.";
      console.error('Camera capture upload error:', error);
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Rate limiting refs
  const lastProfileSaveRef = useRef<number>(0);
  const lastPasswordChangeRef = useRef<number>(0);
  const lastEmailChangeRef = useRef<number>(0);
  const lastResendVerificationRef = useRef<number>(0);

  // Sanitize text: strip HTML tags and dangerous protocols
  const sanitizeText = (str: string, maxLen = 100): string => {
    return str
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .trim()
      .slice(0, maxLen);
  };

  const sanitizePersonName = (str: string): string => {
    // Unicode-aware letter class so accented characters (José, Núñez,
    // O'Connell, María, etc.) are preserved. The previous [a-zA-Z]
    // class silently stripped them, mangling names. Hyphen, apostrophe,
    // dot, and whitespace remain allowed; everything else gets dropped.
    return sanitizeText(str, 50).replace(/[^\p{L}\s\-'.]/gu, '');
  };

  const handleSaveProfile = async () => {
    if (isSaving) return;
    if (!sessionUserId) return;

    // Rate limit: 5s cooldown
    const now = Date.now();
    if (now - lastProfileSaveRef.current < 5000) {
      toast({ title: "Please wait", description: "You're saving too frequently.", variant: "destructive" });
      return;
    }
    lastProfileSaveRef.current = now;

    // Sanitize inputs
    const cleanFirstName = sanitizePersonName(firstName);
    const cleanLastName = sanitizePersonName(lastName);
    const cleanPhone = phone.replace(/[^\d+\-() ]/g, '').slice(0, 20);
    const cleanZipcode = zipcode.replace(/[^\d\-]/g, '').slice(0, 10);
    const cleanCity = sanitizeText(city, 100);
    const cleanState = sanitizeText(state, 50);

    // Validate name lengths
    if (cleanFirstName && cleanFirstName.length < 1) {
      toast({ title: "Invalid name", description: "First name is too short.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const fullDisplayName = cleanFirstName && cleanLastName
      ? `${cleanFirstName} ${cleanLastName}`
      : displayName;

    // If the phone in the form differs from the last-verified phone,
    // the row's phone_verified flag is no longer truthful. Reset it on
    // the same write so we never persist a verified flag against an
    // unverified number. Includes the empty-phone case (user cleared it).
    const phoneChangedSinceVerify = cleanPhone !== verifiedPhoneRef.current;
    const phoneVerifiedPayload = phoneChangedSinceVerify
      ? { phone_verified: false, phone_verified_at: null }
      : {};

    const { error } = await supabase
      .from('seeker_profiles')
      .upsert({
        user_id: sessionUserId,
        display_name: sanitizeText(fullDisplayName, 100),
        first_name: cleanFirstName || null,
        last_name: cleanLastName || null,
        phone: cleanPhone || null,
        ...phoneVerifiedPayload,
        zipcode: cleanZipcode || null,
        city: cleanCity || null,
        state: cleanState || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      toast({
        title: "Error saving",
        description: error.message || "Could not update your profile.",
        variant: "destructive"
      });
    } else {
      setDisplayName(fullDisplayName);
      if (phoneChangedSinceVerify) {
        setPhoneVerified(false);
        verifiedPhoneRef.current = "";
      }
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
    // Log the sign-out BEFORE the auth call — once signOut completes,
    // the JWT is invalid and the SECURITY DEFINER RPC would reject.
    await logActivity({
      eventType: "sign_out",
      description: "Signed out of account",
    });
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Couldn't sign out",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Signed out",
      description: "You've been logged out.",
    });
    navigate("/", { replace: true });
  };

  const handleChangePassword = async () => {
    if (isChangingPassword) return;

    // Rate limit: 10s cooldown
    const now = Date.now();
    if (now - lastPasswordChangeRef.current < 10000) {
      toast({ title: "Please wait", description: "Too many attempts. Try again shortly.", variant: "destructive" });
      return;
    }
    lastPasswordChangeRef.current = now;

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length > 128) {
      toast({
        title: "Password too long",
        description: "Password must be 128 characters or less.",
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

    if (!currentPassword) {
      toast({
        title: "Current password required",
        description: "Enter your current password to confirm this change.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    // Re-auth check: confirm the user actually knows the current password
    // before we allow updateUser({ password }). Without this, a stolen
    // session token could change the password and lock out the real owner.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast({
        title: "Session expired",
        description: "Please sign in again to change your password.",
        variant: "destructive",
      });
      setIsChangingPassword(false);
      return;
    }

    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthErr) {
      toast({
        title: "Current password incorrect",
        description: "Please re-enter your current password.",
        variant: "destructive",
      });
      setIsChangingPassword(false);
      return;
    }

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
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    }

    setIsChangingPassword(false);
  };

  const handleChangeEmail = async () => {
    if (isChangingEmail) return;

    // Rate limit: 10s cooldown
    const now = Date.now();
    if (now - lastEmailChangeRef.current < 10000) {
      toast({ title: "Please wait", description: "Too many attempts. Try again shortly.", variant: "destructive" });
      return;
    }
    lastEmailChangeRef.current = now;

    const trimmedEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail) || trimmedEmail.length > 254) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsChangingEmail(true);

    const { error } = await supabase.auth.updateUser({
      email: trimmedEmail
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
    // Client-side cooldown of 30s. The edge function has its own server-
    // side rate limit, but without a client guard a user could click the
    // button repeatedly while a request is in-flight and queue duplicate
    // emails.
    const now = Date.now();
    if (now - lastResendVerificationRef.current < 30000) {
      toast({
        title: "Please wait",
        description: "Wait a moment before requesting another verification email.",
        variant: "destructive",
      });
      return;
    }
    lastResendVerificationRef.current = now;
    setIsResendingVerification(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email }
      });

      if (error || data?.error) {
        toast({
          title: "Error sending verification",
          description: extractErrorMessage(data ?? error, "Failed to send verification code"),
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

      // The deployed `delete-seeker-account` edge function does an
      // immediate hard delete: purge_seeker_data() then
      // auth.admin.deleteUser(). There is no recovery window — the
      // previous copy promising "30 days to recover" was a lie carried
      // over from a soft-delete design that was never implemented.
      // The dialog text below this handler now matches reality.
      const response = await supabase.functions.invoke("delete-seeker-account", {
        body: {},
      });

      if (response.error) {
        // supabase.functions.invoke surfaces a FunctionsHttpError; pull
        // the JSON body's `error` field when present for a meaningful
        // toast (e.g. "This account has elevated roles ...").
        const ctx = response.error as { context?: { body?: string }; message?: string };
        let backendMsg = "";
        try {
          backendMsg = ctx.context?.body ? (JSON.parse(ctx.context.body)?.error || "") : "";
        } catch { /* body wasn't JSON */ }
        throw new Error(backendMsg || ctx.message || "Failed to delete account");
      }

      toast({
        title: "Account deleted",
        description: "Your account and personal data have been permanently removed.",
      });

      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete your account. Please try again.";
      console.error("Delete account error:", error);
      toast({
        title: "Error deleting account",
        description: message,
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
                      alt={displayName || "Profile picture"}
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
                    aria-label="Change profile picture"
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
              onPhoneChange={(next) => {
                // If the user edits AWAY from the previously-verified number,
                // the verified badge is no longer truthful — clear local
                // state immediately. handleSaveProfile will then persist
                // phone_verified=false alongside the new number. (The
                // PhoneInput child is disabled while localVerified is
                // true, so this branch only fires after a re-verify reset.)
                if (verifiedPhoneRef.current && next !== verifiedPhoneRef.current) {
                  setPhoneVerified(false);
                }
                setPhone(next);
              }}
              userId={userId || undefined}
              userType="seeker"
              isVerified={phoneVerified}
              onVerified={() => {
                setPhoneVerified(true);
                verifiedPhoneRef.current = phone;
                queryClient.invalidateQueries({ queryKey: ['seeker-profile', userId] });
                logActivity({
                  eventType: "phone_verify",
                  description: "Verified phone number",
                });
              }}
            />

            {/* Location */}
            <div>
              <Label>Location</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
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
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                </div>
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
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthBar password={newPassword} />
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
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-destructive">Passwords don't match</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
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
                      setCurrentPassword("");
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
                      <span className="block">
                        This is permanent and cannot be undone. There is no
                        recovery window. Deleting your account immediately
                        removes:
                      </span>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Your profile, name, contact info, and photo</li>
                        <li>Your saved favorites and saved searches</li>
                        <li>Your reviews and review responses</li>
                        <li>Your inquiry and concierge history</li>
                        <li>Your sign-in identity</li>
                      </ul>
                      <span className="block pt-2">
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
                      </span>
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
