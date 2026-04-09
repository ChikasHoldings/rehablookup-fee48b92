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
  NOTIFICATION_PREFERENCES_UPDATED: "notification_preferences_updated",
  
  // MFA actions
  MFA_ENABLED: "mfa_enabled",
  MFA_DISABLED: "mfa_disabled",
  MFA_RECOVERY_CODES_REGENERATED: "mfa_recovery_codes_regenerated",
  
  // Session actions
  SESSION_REVOKED: "session_revoked",
  LOGIN: "login",
  LOGOUT: "logout",
  // Notification actions
  NOTIFICATIONS_MARKED_READ: "notifications_marked_read",
  NOTIFICATIONS_CLEARED: "notifications_cleared",
  ADMIN_NOTIFICATION_SENT: "admin_notification_sent",
  
  // Provider actions
  PROVIDER_APPROVED: "status_changed_to_approved",
  PROVIDER_PENDING: "status_changed_to_pending",
  PROVIDER_REJECTED: "status_changed_to_rejected",
  PROVIDER_SUSPENDED: "suspended",
  PROVIDER_UNSUSPENDED: "unsuspended",
  PROVIDER_VERIFIED: "verified",
  PROVIDER_UNVERIFIED: "unverified",
  PROVIDER_FEATURED: "featured",
  PROVIDER_UNFEATURED: "unfeatured",
  NOTES_UPDATED: "notes_updated",
  
  // Lead actions
  LEAD_ASSIGNED: "lead_assigned",
  LEAD_STATUS_CHANGED: "lead_status_changed",
  LEAD_QUALIFIED: "lead_qualified",
  LEAD_OVERRIDE: "lead_override",
  
  // User management
  ADMIN_USER_CREATED: "admin_user_created",
  ADMIN_USER_DELETED: "admin_user_deleted",
  ADMIN_USER_DEACTIVATED: "admin_user_deactivated",
  ADMIN_USER_SUSPENDED: "admin_user_suspended",
  ADMIN_USER_UNSUSPENDED: "admin_user_unsuspended",
  ADMIN_PERMISSIONS_UPDATED: "admin_permissions_updated",
  ADMIN_ROLE_UPDATED: "admin_role_updated",
  ADMIN_PASSWORD_RESET: "admin_password_reset",
  ADMIN_INVITATION_RESENT: "admin_invitation_resent",
  ADMIN_MFA_SKIP_TOGGLED: "admin_mfa_skip_toggled",
  
  // Subscription actions
  SUBSCRIPTION_OVERRIDE: "subscription_override",
  SUBSCRIPTION_CANCELED: "subscription_canceled",
  
  // Provider deletion
  PROVIDER_DELETED: "provider_deleted",
  
  // Featured placement actions
  FEATURED_PINNED: "featured_pinned",
  FEATURED_UNPINNED: "featured_unpinned",
  FEATURED_SETTINGS_UPDATED: "featured_settings_updated",
  FEATURED_ORDER_UPDATED: "featured_order_updated",
  LEGACY_FEATURED: "legacy_featured",
  LEGACY_UNFEATURED: "legacy_unfeatured",
  PINNED_FEATURED: "pinned_featured",
  UNPINNED_FEATURED: "unpinned_featured",
  
  // Image moderation
  IMAGE_FLAGGED: "image_flagged",
  IMAGE_RESOLVED: "image_resolved",
  IMAGE_REMOVED: "image_removed",
  
  // Security actions
  SECURITY_BLOCK_ADDED: "security_block_added",
  SECURITY_BLOCK_REMOVED: "security_block_removed",
  
  // Location change actions
  LOCATION_CHANGE_APPROVED: "location_change_approved",
  LOCATION_CHANGE_REJECTED: "location_change_rejected",
  
  // Settings actions
  PLATFORM_SETTINGS_UPDATED: "platform_settings_updated",
  AUDIT_LOGS_CLEANED: "audit_logs_cleaned",
} as const;
