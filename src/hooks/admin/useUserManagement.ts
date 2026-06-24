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

  const invalidateUserQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-activity-counts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
  };

  // Delete user account via edge function
  const deleteUser = useMutation({
    mutationFn: async (user: UserProfile) => {
      setIsDeleting(true);
      
      const { data, error } = await supabase.functions.invoke("admin-delete-seeker", {
        body: { 
          targetUserId: user.user_id,
          action: "delete"
        },
      });
      
      if (error) {
        console.error("Delete seeker error:", error);
        throw new Error(error.message || "Failed to delete user");
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return user.user_id;
    },
    onSuccess: () => {
      toast.success("User account deleted successfully");
      invalidateUserQueries();
    },
    onError: (error: Error) => {
      toast.error("Failed to delete user: " + error.message);
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  // Ban/suspend user via edge function
  const banUser = useMutation({
    mutationFn: async ({ user, reason }: { user: UserProfile; reason: string }) => {
      setIsBanning(true);
      
      const { data, error } = await supabase.functions.invoke("admin-delete-seeker", {
        body: { 
          targetUserId: user.user_id,
          action: "ban",
          reason
        },
      });
      
      if (error) {
        console.error("Ban seeker error:", error);
        throw new Error(error.message || "Failed to ban user");
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return user.user_id;
    },
    onSuccess: () => {
      toast.success("User has been banned");
      invalidateUserQueries();
    },
    onError: (error: Error) => {
      toast.error("Failed to ban user: " + error.message);
    },
    onSettled: () => {
      setIsBanning(false);
    },
  });

  // Unban user via edge function
  const unbanUser = useMutation({
    mutationFn: async (user: UserProfile) => {
      const { data, error } = await supabase.functions.invoke("admin-delete-seeker", {
        body: { 
          targetUserId: user.user_id,
          action: "unban"
        },
      });
      
      if (error) {
        console.error("Unban seeker error:", error);
        throw new Error(error.message || "Failed to unban user");
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return user.user_id;
    },
    onSuccess: () => {
      toast.success("User has been unbanned");
      invalidateUserQueries();
    },
    onError: (error: Error) => {
      toast.error("Failed to unban user: " + error.message);
    },
  });

  // Send password reset email
  const sendPasswordReset = useMutation({
    mutationFn: async (email: string) => {
      setIsSendingReset(true);
      
      const { data, error: invokeError } = await supabase.functions.invoke('send-password-reset', {
        body: { email, redirectTo: `${window.location.origin}/reset-password` },
      });
      
      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);
      
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
    // Read ban state via the admin-gated SECURITY DEFINER RPC. A direct
    // blocked_identifiers read is RLS-restricted to super_admins, so a manager /
    // customer_rep would always get 0 rows and see a banned seeker as "Active".
    const { data, error } = await supabase.rpc("is_user_banned" as never, { p_user_id: userId } as never);
    if (error) {
      console.warn("[checkBanStatus] is_user_banned RPC failed", error);
      return false;
    }
    return (data as boolean | null) === true;
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
