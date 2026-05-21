/**
 * Single source of truth mapping notification `type` values to the
 * admin route they belong on. Used by:
 *  - AdminSidebar badges (unread notifications per page)
 *  - AdminNotifications click-through navigation
 *
 * Each notification type lands on exactly one route. If a type is not
 * mapped here it falls back to "/admin/notifications" (the inbox).
 *
 * The map is keyed by EXACT type for fast lookup; prefix patterns
 * (e.g. all `concierge_*`) are handled by the `resolveNotificationRoute`
 * helper which checks exact match first, then runs prefix rules.
 */

export type AdminRouteKey =
  | "/admin/providers"
  | "/admin/leads"
  | "/admin/subscriptions"
  | "/admin/reviews"
  | "/admin/escalations"
  | "/admin/security-logs"
  | "/admin/concierge"
  | "/admin/support"
  | "/admin/not-found-events"
  | "/admin/marketing"
  | "/admin/email-logs"
  | "/admin/seekers"
  | "/admin/insurance-verifications"
  | "/admin/notifications";

// Exact-match table. Type → route.
const EXACT: Record<string, AdminRouteKey> = {
  // Providers
  provider_signup: "/admin/providers",
  facility_claim_submitted: "/admin/providers",
  facility_approved: "/admin/providers",
  flagged_image: "/admin/providers",
  claim_rejection_email_sent: "/admin/providers",

  // Leads
  new_lead: "/admin/leads",
  lead_assigned: "/admin/leads",
  orphaned_lead_closed: "/admin/leads",
  lead_distribution_insert_failure: "/admin/leads",
  lead_notification_failure: "/admin/leads",
  lead_notification_event_failure: "/admin/leads",
  lead_email_log_failure: "/admin/leads",
  lead_status_update_failure: "/admin/leads",
  lead_sms_delivery_failure: "/admin/leads",

  // Subscriptions / billing
  payment_failed: "/admin/subscriptions",
  payment_delinquent: "/admin/subscriptions",
  placement_payment_failed: "/admin/subscriptions",
  subscription_alert: "/admin/subscriptions",
  subscription_change: "/admin/subscriptions",
  new_subscription: "/admin/subscriptions",
  subscription_cancelled: "/admin/subscriptions",
  churn_alert: "/admin/subscriptions",
  at_risk_provider: "/admin/subscriptions",
  provider_health: "/admin/subscriptions",
  dunning_total_delivery_failure: "/admin/subscriptions",
  dunning_email_failed: "/admin/subscriptions",
  pro_activation_db_failure: "/admin/subscriptions",
  pro_activation_poll_timeout: "/admin/subscriptions",
  cancellation_split_brain: "/admin/subscriptions",
  out_of_band_subscription_refund: "/admin/subscriptions",
  subscription_cancel_refund_failed: "/admin/subscriptions",
  subscription_refund_failed: "/admin/subscriptions",
  subscription_cancellation_row_insert_failed: "/admin/subscriptions",
  webhook_dedup_failure: "/admin/subscriptions",
  pro_benefits_partial_failure: "/admin/subscriptions",
  featured_addon_partial_failure: "/admin/subscriptions",
  concierge_addon_partial_failure: "/admin/subscriptions",
  addon_waitlist_invite_email_failed: "/admin/subscriptions",
  international_invoice_failed: "/admin/subscriptions",
  featured_addon_activation_failed: "/admin/subscriptions",
  concierge_addon_activation_failed: "/admin/subscriptions",
  payment_failed_orphan_customer: "/admin/subscriptions",
  addon_flag_cleared_without_audit_row: "/admin/subscriptions",
  duplicate_active_pro_subscription: "/admin/subscriptions",

  // Reviews
  new_review: "/admin/reviews",
  review_disputed: "/admin/reviews",

  // Escalations
  escalation_created: "/admin/escalations",
  escalation_updated: "/admin/escalations",
  escalation_resolved: "/admin/escalations",

  // Security
  brute_force: "/admin/security-logs",
  brute_force_alert: "/admin/security-logs",
  login_alert: "/admin/security-logs",
  security_event: "/admin/security-logs",
  security_block: "/admin/security-logs",
  security_unblock: "/admin/security-logs",
  security_auto_block: "/admin/security-logs",

  // Concierge / placements
  concierge_new_intake: "/admin/concierge",
  concierge_payment_pending_intake: "/admin/concierge",
  concierge_sms_delivery_failure: "/admin/concierge",
  placement_assigned: "/admin/concierge",
  placement_update: "/admin/concierge",
  concierge_update: "/admin/concierge",
  tour_request: "/admin/concierge",
  tour_sms_delivery_failure: "/admin/concierge",

  // Support
  support_new_ticket: "/admin/support",
  support_ticket_replied: "/admin/support",
  message_sms_delivery_failure: "/admin/support",

  // 404 monitor
  not_found_alert: "/admin/not-found-events",

  // Marketing
  marketing_lead_received: "/admin/marketing",

  // Email logs
  email_delivery_failure: "/admin/email-logs",
  resend_api_failure: "/admin/email-logs",
  free_tier_redirect_notify_failure: "/admin/email-logs",

  // Insurance VOB
  insurance_verification_request: "/admin/insurance-verifications",

  // System / inbox (no specific page)
  system: "/admin/notifications",
  system_maintenance: "/admin/notifications",
  welcome: "/admin/notifications",
  email: "/admin/notifications",
};

// Prefix rules — only used when there's no EXACT match.
const PREFIX_RULES: Array<[string, AdminRouteKey]> = [
  ["concierge_", "/admin/concierge"],
  ["placement_", "/admin/concierge"],
  ["lead_", "/admin/leads"],
  ["subscription_", "/admin/subscriptions"],
  ["addon_", "/admin/subscriptions"],
  ["dunning_", "/admin/subscriptions"],
  ["webhook_", "/admin/subscriptions"],
  ["security_", "/admin/security-logs"],
  ["brute_force", "/admin/security-logs"],
  ["review_", "/admin/reviews"],
  ["escalation_", "/admin/escalations"],
  ["provider_", "/admin/providers"],
  ["facility_", "/admin/providers"],
  ["support_", "/admin/support"],
  ["marketing_", "/admin/marketing"],
  ["email_", "/admin/email-logs"],
  ["insurance_", "/admin/insurance-verifications"],
];

/**
 * Resolves a notification type to its canonical admin route. Returns
 * "/admin/notifications" as a safe fallback if no rule matches.
 */
export function resolveNotificationRoute(type: string | null | undefined): AdminRouteKey {
  if (!type) return "/admin/notifications";
  const exact = EXACT[type];
  if (exact) return exact;
  for (const [prefix, route] of PREFIX_RULES) {
    if (type.startsWith(prefix)) return route;
  }
  return "/admin/notifications";
}

/**
 * Optional metadata-aware override: some notifications carry a
 * `metadata.link` that overrides the type-based route. The sidebar
 * counts use the type-based mapping (metadata is per-row and too
 * granular for aggregation), but the notification list itself prefers
 * the explicit link when present.
 */
export function resolveNotificationLink(
  type: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
  explicitLink: string | null | undefined,
): string {
  if (explicitLink) return explicitLink;
  const fromMetadata = metadata && typeof metadata === "object" && typeof (metadata as Record<string, unknown>).link === "string"
    ? ((metadata as Record<string, unknown>).link as string)
    : null;
  if (fromMetadata) return fromMetadata;
  return resolveNotificationRoute(type);
}
