import { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, EyeOff, ShieldCheck, Loader2, KeyRound, AlertTriangle, 
  Lock, Shield, CheckCircle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128, "Password too long"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or less")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character"),
  confirmPassword: z.string().max(128),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

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
  if (strength < 40) return { label: "Weak", color: "text-red-600" };
  if (strength < 70) return { label: "Medium", color: "text-amber-600" };
  if (strength < 90) return { label: "Strong", color: "text-green-600" };
  return { label: "Very Strong", color: "text-emerald-600" };
};

interface SecurityCardProps {
  userId: string;
  userEmail: string;
}

export function SecurityCard({ userId, userEmail }: SecurityCardProps) {
  const { toast } = useToast();
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const lastPasswordChangeRef = useRef<number>(0);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleChangePassword = async (data: PasswordFormData) => {
    if (!userEmail) return;

    // Rate limit: 10s cooldown
    const now = Date.now();
    if (now - lastPasswordChangeRef.current < 10000) {
      toast({ title: "Please wait", description: "Too many attempts. Try again shortly.", variant: "destructive" });
      return;
    }
    lastPasswordChangeRef.current = now;

    setIsUpdatingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
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

      if (data.currentPassword === data.newPassword) {
        toast({
          title: "Password unchanged",
          description: "New password must be different from current password.",
          variant: "destructive",
        });
        setIsUpdatingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      passwordForm.reset();
      
      await logAdminAction({
        actionType: AdminAuditActions.PASSWORD_CHANGED,
        targetType: "admin_profile",
        targetId: userId,
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

  return (
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
                        <span className={`font-medium ${strengthInfo.color}`}>
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
  );
}
