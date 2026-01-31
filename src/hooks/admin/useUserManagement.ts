import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email?: string;
}

export function useUserManagement() {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Delete user account
  const deleteUser = useMutation({
    mutationFn: async (user: UserProfile) => {
      setIsDeleting(true);
      
      // Delete in order: favorites, reviews, notifications, activity log, seeker profile
      const userId = user.user_id;
      
      // Delete user favorites
      await supabase.from("user_favorites").delete().eq("user_id", userId);
      
      // Delete facility reviews
      await supabase.from("facility_reviews").delete().eq("user_id", userId);
      
      // Delete seeker notifications
      await supabase.from("seeker_notifications").delete().eq("user_id", userId);
      
      // Delete account activity log
      await supabase.from("account_activity_log").delete().eq("user_id", userId);
      
      // Delete review helpful votes
      await supabase.from("review_helpful_votes").delete().eq("user_id", userId);
      
      // Delete user roles
      await supabase.from("user_roles").delete().eq("user_id", userId);
      
      // Delete seeker profile
      const { error: profileError } = await supabase
        .from("seeker_profiles")
        .delete()
        .eq("user_id", userId);
      
      if (profileError) throw profileError;
      
      // Log admin action
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: adminUser.id,
          action_type: "delete_user",
          target_type: "seeker",
          target_id: userId,
          details: { 
            deleted_user_name: user.display_name || `${user.first_name} ${user.last_name}`,
            deleted_user_email: user.email 
          },
        });
      }
      
      return userId;
    },
    onSuccess: () => {
      toast.success("User account deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-activity-stats"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete user: " + error.message);
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  // Ban/suspend user
  const banUser = useMutation({
    mutationFn: async ({ user, reason }: { user: UserProfile; reason: string }) => {
      setIsBanning(true);
      
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Admin not authenticated");
      
      // Add to blocked identifiers table
      const { error } = await supabase.from("blocked_identifiers").insert({
        identifier: user.user_id,
        identifier_type: "user_id",
        reason: reason,
        blocked_by: adminUser.id,
        is_active: true,
      });
      
      if (error) throw error;
      
      // Also block email if available
      if (user.email) {
        await supabase.from("blocked_identifiers").insert({
          identifier: user.email,
          identifier_type: "email",
          reason: reason,
          blocked_by: adminUser.id,
          is_active: true,
        });
      }
      
      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUser.id,
        action_type: "ban_user",
        target_type: "seeker",
        target_id: user.user_id,
        details: { 
          banned_user_name: user.display_name || `${user.first_name} ${user.last_name}`,
          banned_user_email: user.email,
          reason 
        },
      });
      
      return user.user_id;
    },
    onSuccess: () => {
      toast.success("User has been banned");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to ban user: " + error.message);
    },
    onSettled: () => {
      setIsBanning(false);
    },
  });

  // Unban user
  const unbanUser = useMutation({
    mutationFn: async (user: UserProfile) => {
      // Deactivate blocked identifiers
      await supabase
        .from("blocked_identifiers")
        .update({ is_active: false })
        .eq("identifier", user.user_id);
      
      if (user.email) {
        await supabase
          .from("blocked_identifiers")
          .update({ is_active: false })
          .eq("identifier", user.email);
      }
      
      // Log admin action
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: adminUser.id,
          action_type: "unban_user",
          target_type: "seeker",
          target_id: user.user_id,
          details: { 
            unbanned_user_name: user.display_name || `${user.first_name} ${user.last_name}`,
          },
        });
      }
      
      return user.user_id;
    },
    onSuccess: () => {
      toast.success("User has been unbanned");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to unban user: " + error.message);
    },
  });

  // Send password reset email
  const sendPasswordReset = useMutation({
    mutationFn: async (email: string) => {
      setIsSendingReset(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      // Log admin action
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: adminUser.id,
          action_type: "send_password_reset",
          target_type: "seeker",
          target_id: null,
          details: { email },
        });
      }
      
      return email;
    },
    onSuccess: (email) => {
      toast.success(`Password reset email sent to ${email}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to send password reset: " + error.message);
    },
    onSettled: () => {
      setIsSendingReset(false);
    },
  });

  // Check if user is banned
  const checkBanStatus = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("blocked_identifiers")
      .select("id")
      .eq("identifier", userId)
      .eq("is_active", true)
      .maybeSingle();
    
    return !!data;
  };

  return {
    deleteUser,
    banUser,
    unbanUser,
    sendPasswordReset,
    checkBanStatus,
    isDeleting,
    isBanning,
    isSendingReset,
  };
}
