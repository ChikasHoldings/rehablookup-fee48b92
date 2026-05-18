import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  CreditCard,
  ImageOff,
  MessageSquare,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Canonical registry of in-app provider-notification types.
 *
 * Single source of truth shared by:
 *   - the bell-icon dropdown in ProviderHeader
 *   - the full /provider/notifications page
 *   - the browser-notification click handler in useProviderNotifications
 *
 * Adding a new notification type:
 *   1. Edit the backend insert (in `supabase/functions/...`) to use the
 *      new `type` string.
 *   2. Add an entry here with `label`, `icon`, and `route`.
 *   3. The UI renders automatically — no changes needed in the page or
 *      header.
 *
 * If a notification arrives with a type that isn't registered, the UI
 * falls back to FALLBACK_ENTRY and warns in dev so the drift surfaces
 * during testing instead of silently rendering a generic icon.
 */

export type NotificationCategory =
  | "leads"
  | "billing"
  | "listings"
  | "placements"
  | "system";

export interface NotificationTypeEntry {
  label: string;
  icon: ReactNode;
  /** Destination when the notification is clicked. */
  route: string;
  /** Category bucket used by the type-filter dropdown on the page. */
  category: NotificationCategory;
}

const leadIcon = <UserPlus className="h-5 w-5 text-primary" />;
const billingIcon = <CreditCard className="h-5 w-5 text-purple-500" />;
const successIcon = <Check className="h-5 w-5 text-green-500" />;
const warnIcon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
const errIcon = <AlertTriangle className="h-5 w-5 text-red-500" />;
const shieldIcon = <Shield className="h-5 w-5 text-green-500" />;
const reviewIcon = <MessageSquare className="h-5 w-5 text-yellow-500" />;

export const NOTIFICATION_TYPES: Record<string, NotificationTypeEntry> = {
  // ─── Leads ─────────────────────────────────────────────────────────
  new_lead: { label: "New Inquiry", icon: leadIcon, route: "/provider/inquiries", category: "leads" },
  high_intent_lead: { label: "🔥 High Intent", icon: <UserPlus className="h-5 w-5 text-orange-500" />, route: "/provider/inquiries", category: "leads" },
  lead_received: { label: "New Inquiry", icon: leadIcon, route: "/provider/inquiries", category: "leads" },
  lead_reminder: { label: "Reminder", icon: <Bell className="h-5 w-5 text-amber-500" />, route: "/provider/inquiries", category: "leads" },
  lead_expired: { label: "Lead Expired", icon: errIcon, route: "/provider/inquiries", category: "leads" },
  lead_status_changed: { label: "Inquiry Update", icon: <MessageSquare className="h-5 w-5 text-blue-500" />, route: "/provider/inquiries", category: "leads" },
  lead_redistributed: { label: "New Inquiry", icon: leadIcon, route: "/provider/inquiries", category: "leads" },
  lead_unlocked: { label: "Lead Unlocked", icon: successIcon, route: "/provider/inquiries", category: "leads" },

  // ─── Billing / subscription ─────────────────────────────────────────
  subscription_active: { label: "Pro Activated", icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />, route: "/provider/billing", category: "billing" },
  subscription_updated: { label: "Subscription", icon: billingIcon, route: "/provider/billing", category: "billing" },
  subscription_renewal: { label: "Renewal", icon: billingIcon, route: "/provider/billing", category: "billing" },
  subscription_cancelled: { label: "Cancelled", icon: errIcon, route: "/provider/billing", category: "billing" },
  subscription_recovered: { label: "Payment Recovered", icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, route: "/provider/billing", category: "billing" },
  subscription_past_due: { label: "Past Due", icon: errIcon, route: "/provider/billing", category: "billing" },
  subscription_pending_cancel: { label: "Pending Cancel", icon: warnIcon, route: "/provider/billing", category: "billing" },
  payment_failed: { label: "Payment Failed", icon: errIcon, route: "/provider/billing", category: "billing" },
  payment_confirmation: { label: "Payment Received", icon: successIcon, route: "/provider/billing", category: "billing" },
  low_credits_warning: { label: "Low Credits", icon: warnIcon, route: "/provider/billing", category: "billing" },
  lead_limit_warning: { label: "Lead Limit", icon: warnIcon, route: "/provider/billing", category: "billing" },
  credits_added: { label: "Credits Added", icon: <CreditCard className="h-5 w-5 text-green-500" />, route: "/provider/billing", category: "billing" },
  concierge_invoice_issued: { label: "Invoice Issued", icon: billingIcon, route: "/provider/billing", category: "billing" },
  concierge_invoice_paid: { label: "Invoice Paid", icon: <CreditCard className="h-5 w-5 text-green-500" />, route: "/provider/billing", category: "billing" },

  // ─── Listings / facility ────────────────────────────────────────────
  listing_approved: { label: "Listing Approved", icon: shieldIcon, route: "/provider/listings", category: "listings" },
  listing_rejected: { label: "Listing Rejected", icon: errIcon, route: "/provider/listings", category: "listings" },
  listing_needs_edits: { label: "Needs Edits", icon: warnIcon, route: "/provider/listings", category: "listings" },
  flagged_image: { label: "Image Flagged", icon: <ImageOff className="h-5 w-5 text-red-500" />, route: "/provider/listings", category: "listings" },
  image_flagged: { label: "Image Flagged", icon: <ImageOff className="h-5 w-5 text-red-500" />, route: "/provider/listings", category: "listings" },
  credential_verified: { label: "Credential Verified", icon: shieldIcon, route: "/provider/listings", category: "listings" },
  credential_rejected: { label: "Credential Rejected", icon: errIcon, route: "/provider/listings", category: "listings" },
  facilities_reactivated: { label: "Listings Reactivated", icon: <Sparkles className="h-5 w-5 text-emerald-500" />, route: "/provider/listings", category: "listings" },
  facilities_suspended: { label: "Listings Paused", icon: warnIcon, route: "/provider/listings", category: "listings" },

  // ─── Marketing / placements ─────────────────────────────────────────
  featured_activated: { label: "Featured", icon: <Sparkles className="h-5 w-5 text-amber-500" />, route: "/provider/marketing/featured", category: "placements" },
  featured_expired: { label: "Featured", icon: <Sparkles className="h-5 w-5 text-muted-foreground" />, route: "/provider/marketing/featured", category: "placements" },
  featured_addon_active: { label: "Featured Active", icon: <Sparkles className="h-5 w-5 text-emerald-500" />, route: "/provider/marketing/featured", category: "placements" },
  featured_rotation: { label: "Featured Rotation", icon: <Sparkles className="h-5 w-5 text-amber-500" />, route: "/provider/marketing/featured", category: "placements" },
  concierge_addon_active: { label: "Concierge Active", icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />, route: "/provider/marketing/concierge", category: "placements" },
  placement_introduction: { label: "Placement", icon: <UserPlus className="h-5 w-5 text-indigo-500" />, route: "/provider/marketing/concierge", category: "placements" },
  concierge_seeker_confirmed: { label: "Placement Confirmed", icon: successIcon, route: "/provider/marketing/concierge", category: "placements" },
  concierge_placement_complete: { label: "Placement Complete", icon: successIcon, route: "/provider/marketing/concierge", category: "placements" },
  tour_request: { label: "Tour Request", icon: <MessageSquare className="h-5 w-5 text-blue-500" />, route: "/provider/inquiries", category: "placements" },
  tour_confirmed: { label: "Tour Confirmed", icon: successIcon, route: "/provider/inquiries", category: "placements" },
  tour_cancelled: { label: "Tour Cancelled", icon: errIcon, route: "/provider/inquiries", category: "placements" },

  // ─── Reviews / system ───────────────────────────────────────────────
  new_review: { label: "Review", icon: reviewIcon, route: "/provider/reviews", category: "system" },
  review_received: { label: "Review", icon: reviewIcon, route: "/provider/reviews", category: "system" },
  review_pending: { label: "Review Pending", icon: <MessageSquare className="h-5 w-5 text-amber-500" />, route: "/provider/reviews", category: "system" },
  system: { label: "System", icon: <Settings className="h-5 w-5 text-muted-foreground" />, route: "/provider/dashboard", category: "system" },
};

export const FALLBACK_ENTRY: NotificationTypeEntry = {
  label: "Notification",
  icon: <Settings className="h-5 w-5 text-muted-foreground" />,
  route: "/provider/dashboard",
  category: "system",
};

/**
 * Resolve a registry entry for a notification type. Logs (in dev) when
 * the type isn't registered so new backend-emitted types surface during
 * QA instead of silently rendering as "Notification".
 */
export function getNotificationEntry(type: string | null | undefined): NotificationTypeEntry {
  if (!type) return FALLBACK_ENTRY;
  const entry = NOTIFICATION_TYPES[type];
  if (entry) return entry;
  if (import.meta.env.DEV) {
    console.warn("[providerNotifications] unknown notification type:", type);
  }
  return FALLBACK_ENTRY;
}

/**
 * Resolve the destination URL for a notification. Prefers an explicit
 * `metadata.link` (set by backend handlers that have row-specific deep
 * links) and falls back to the registry route for the type.
 */
export function getNotificationRoute(
  type: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): string {
  const explicit = metadata && typeof metadata.link === "string" ? metadata.link : null;
  if (explicit && explicit.startsWith("/")) return explicit;
  return getNotificationEntry(type).route;
}

export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, string[]> = (() => {
  const out: Record<NotificationCategory, string[]> = {
    leads: [],
    billing: [],
    listings: [],
    placements: [],
    system: [],
  };
  for (const [type, entry] of Object.entries(NOTIFICATION_TYPES)) {
    out[entry.category].push(type);
  }
  return out;
})();
