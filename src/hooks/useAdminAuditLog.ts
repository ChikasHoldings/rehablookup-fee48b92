import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface AuditLogParams {
  actionType: string;
  targetType: string;
  targetId?: string;
  details?: Json;
}

export async function logAdminAction({
  actionType,
  targetType,
  targetId,
  details,
}: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user found for audit logging");
      return;
    }

    const { error } = await supabase.from("admin_audit_log").insert([{
      admin_user_id: user.id,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId || null,
      details: details || {},
    }]);

    if (error) {
      console.error("Error logging admin action:", error);
    } else {
      console.log(`Audit logged: ${actionType} on ${targetType}`);
    }
  } catch (err) {
    console.error("Error in logAdminAction:", err);
  }
}

// Convenience functions for common actions
export const AdminAuditActions = {
  // Profile actions
  PROFILE_PHOTO_UPDATED: "profile_photo_updated",
  PROFILE_NAME_UPDATED: "profile_name_updated",
  PASSWORD_CHANGED: "password_changed",
  
  // Notification actions
  NOTIFICATIONS_MARKED_READ: "notifications_marked_read",
  NOTIFICATIONS_CLEARED: "notifications_cleared",
  
  // Provider actions
  PROVIDER_APPROVED: "provider_approved",
  PROVIDER_SUSPENDED: "provider_suspended",
  PROVIDER_VERIFIED: "provider_verified",
  PROVIDER_FEATURED: "provider_featured",
  
  // Lead actions
  LEAD_ASSIGNED: "lead_assigned",
  LEAD_STATUS_CHANGED: "lead_status_changed",
  
  // User management
  ADMIN_USER_CREATED: "admin_user_created",
  ADMIN_USER_DEACTIVATED: "admin_user_deactivated",
  ADMIN_PERMISSIONS_UPDATED: "admin_permissions_updated",
} as const;
