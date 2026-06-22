import React from "react";
import {
  Bell, Send, Heart, Star, Building2, MapPin, Calendar, HeartHandshake, UserCheck, CheckCircle, LifeBuoy,
} from "lucide-react";

// Single source of truth for seeker-notification UI + routing.
//
// Previously the icon map and the type-→-route table lived in TWO
// places (SeekerHeader + SeekerNotifications) and had silently
// diverged: the Header had types like `inquiry_update` / `inquiry_status`
// which no edge function emits, while the Page covered the actual
// concierge / request types correctly. Header clicks on real
// notifications fell through to `/account/notifications` instead of
// the relevant section. Extracted here so both surfaces share the
// canonical mapping and any new notification type is added once.

/**
 * Compact icon (used inside the header dropdown — h-4 w-4).
 */
export function notificationIconCompact(type: string): React.ReactNode {
  const map: Record<string, React.ReactNode> = {
    system: <Bell className="h-4 w-4 text-primary" />,
    welcome: <Bell className="h-4 w-4 text-success" />,
    facility_update: <Building2 className="h-4 w-4 text-primary" />,
    saved_facility: <Heart className="h-4 w-4 text-primary" />,
    facility_contacted: <Send className="h-4 w-4 text-primary" />,
    facility_contacted_you: <Send className="h-4 w-4 text-primary" />,
    request_update: <Send className="h-4 w-4 text-success" />,
    request_confirmation: <Send className="h-4 w-4 text-success" />,
    lead_message: <Send className="h-4 w-4 text-primary" />,
    review_response: <Star className="h-4 w-4 text-warning" />,
    review_approved: <Star className="h-4 w-4 text-success" />,
    review_rejected: <Star className="h-4 w-4 text-destructive" />,
    tour_proposed: <Calendar className="h-4 w-4 text-primary" />,
    tour_confirmed: <Calendar className="h-4 w-4 text-success" />,
    tour_cancelled: <Calendar className="h-4 w-4 text-destructive" />,
    concierge_intake_received: <HeartHandshake className="h-4 w-4 text-primary" />,
    concierge_matches_found: <MapPin className="h-4 w-4 text-success" />,
    concierge_introductions_sent: <UserCheck className="h-4 w-4 text-primary" />,
    concierge_options_ready: <MapPin className="h-4 w-4 text-success" />,
    concierge_provider_interested: <UserCheck className="h-4 w-4 text-primary" />,
    concierge_provider_confirmed: <Building2 className="h-4 w-4 text-success" />,
    concierge_progress_update: <HeartHandshake className="h-4 w-4 text-primary" />,
    concierge_advisor_assigned: <UserCheck className="h-4 w-4 text-primary" />,
    concierge_placement_complete: <CheckCircle className="h-4 w-4 text-success" />,
    concierge_case_closed: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
    concierge_tour_proposed: <Calendar className="h-4 w-4 text-primary" />,
    concierge_tour_confirmed: <Calendar className="h-4 w-4 text-success" />,
    concierge_tour_completed: <Calendar className="h-4 w-4 text-success" />,
    concierge_tour_cancelled: <Calendar className="h-4 w-4 text-destructive" />,
    concierge_admission_updated: <Building2 className="h-4 w-4 text-primary" />,
    concierge_move_in_scheduled: <Calendar className="h-4 w-4 text-primary" />,
    concierge_moved_in: <CheckCircle className="h-4 w-4 text-success" />,
    concierge_message_received: <Send className="h-4 w-4 text-primary" />,
    placement_intro: <UserCheck className="h-4 w-4 text-primary" />,
    support_reply: <LifeBuoy className="h-4 w-4 text-primary" />,
    support_resolved: <CheckCircle className="h-4 w-4 text-success" />,
    support_reopened: <LifeBuoy className="h-4 w-4 text-warning" />,
  };
  return map[type] || <Bell className="h-4 w-4 text-muted-foreground" />;
}

/**
 * Roomy icon (used in the full-page list — h-4 w-4 sm:h-5 sm:w-5).
 */
export function notificationIconLarge(type: string): React.ReactNode {
  const map: Record<string, React.ReactNode> = {
    system: <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    welcome: <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    facility_update: <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    saved_facility: <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    facility_contacted: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    facility_contacted_you: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    request_update: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    request_confirmation: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    lead_message: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    review_response: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />,
    review_approved: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    review_rejected: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
    tour_proposed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    tour_confirmed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    tour_cancelled: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
    concierge_intake_received: <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_matches_found: <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_introductions_sent: <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_options_ready: <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_provider_interested: <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_provider_confirmed: <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_progress_update: <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_advisor_assigned: <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_placement_complete: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_case_closed: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />,
    concierge_tour_proposed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_tour_confirmed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_tour_completed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_tour_cancelled: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
    concierge_admission_updated: <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_move_in_scheduled: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_moved_in: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_message_received: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    placement_intro: <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    support_reply: <LifeBuoy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    support_resolved: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    support_reopened: <LifeBuoy className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />,
  };
  return map[type] || <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />;
}

// request_confirmation, request_update, facility_contacted, etc. — the
// edge-function side of `request_confirmation` is dead code (the live
// inquiry-confirmation email goes out from submit-qualified-lead via a
// direct sendEmailWithRetry call, not via send-seeker-emails). The
// map entry below is retained as a graceful-fallback for ANY legacy
// seeker_notifications row that might still have this type — without
// it those rows would render the default Bell icon and route to
// /account/notifications. Cheap to keep, no harm if unused.
const TYPE_ROUTES: Record<string, string> = {
  // Request / inquiry flow
  request_update: "/account/requests",
  request_confirmation: "/account/requests",
  facility_contacted: "/account/requests",
  facility_contacted_you: "/account/requests",
  lead_message: "/account/requests",
  tour_proposed: "/account/requests",
  tour_confirmed: "/account/requests",
  tour_cancelled: "/account/requests",
  // Review flow
  review_response: "/account/reviews",
  review_approved: "/account/reviews",
  review_rejected: "/account/reviews",
  // Concierge flow. The full set below mirrors every seeker-facing `type`
  // written to seeker_notifications by send-concierge-notifications /
  // send-tour-notifications — without an entry these deep-linked to the generic
  // inbox (/account/notifications) instead of the concierge section.
  concierge_intake_received: "/account/concierge",
  concierge_matches_found: "/account/concierge",
  concierge_introductions_sent: "/account/concierge",
  concierge_options_ready: "/account/concierge",
  concierge_provider_interested: "/account/concierge",
  concierge_provider_confirmed: "/account/concierge",
  concierge_progress_update: "/account/concierge",
  concierge_advisor_assigned: "/account/concierge",
  concierge_placement_complete: "/account/concierge",
  concierge_case_closed: "/account/concierge",
  concierge_message_received: "/account/concierge",
  concierge_tour_proposed: "/account/concierge",
  concierge_tour_confirmed: "/account/concierge",
  concierge_tour_completed: "/account/concierge",
  concierge_tour_cancelled: "/account/concierge",
  concierge_admission_updated: "/account/concierge",
  concierge_move_in_scheduled: "/account/concierge",
  concierge_moved_in: "/account/concierge",
  placement_intro: "/account/concierge",
  // Facility / saved flow
  saved_facility: "/account/saved",
  facility_update: "/account/saved",
  // Support tickets — the producer sets metadata.link to
  // `/account/support?ticket=<id>`; this is the type-based fallback when
  // no explicit link is present.
  support_reply: "/account/support",
  support_resolved: "/account/support",
  support_reopened: "/account/support",
};

/**
 * Resolve the destination URL for a notification. Preference order:
 * 1. `notification.link` (if set by the producer)
 * 2. `notification.metadata.link` (legacy producers)
 * 3. Type-based fallback table
 * 4. `/account/notifications` (inbox view — final safety net)
 */
export function resolveNotificationRoute(notification: {
  link: string | null;
  type: string;
  metadata: Record<string, unknown> | null;
}): string {
  if (notification.link) return notification.link;
  const metaLink = notification.metadata?.link;
  if (typeof metaLink === "string" && metaLink.length > 0) return metaLink;
  return TYPE_ROUTES[notification.type] || "/account/notifications";
}
