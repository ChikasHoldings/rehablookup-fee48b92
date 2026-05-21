import React from "react";
import {
  Bell, Send, Heart, Star, Building2, MapPin, Calendar, HeartHandshake, UserCheck, CheckCircle,
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
    review_response: <Star className="h-4 w-4 text-warning" />,
    review_approved: <Star className="h-4 w-4 text-success" />,
    review_rejected: <Star className="h-4 w-4 text-destructive" />,
    tour_proposed: <Calendar className="h-4 w-4 text-primary" />,
    tour_confirmed: <Calendar className="h-4 w-4 text-success" />,
    tour_cancelled: <Calendar className="h-4 w-4 text-destructive" />,
    concierge_intake_received: <HeartHandshake className="h-4 w-4 text-primary" />,
    concierge_matches_found: <MapPin className="h-4 w-4 text-success" />,
    concierge_provider_interested: <UserCheck className="h-4 w-4 text-primary" />,
    concierge_provider_confirmed: <Building2 className="h-4 w-4 text-success" />,
    concierge_placement_complete: <CheckCircle className="h-4 w-4 text-success" />,
    concierge_tour_proposed: <Calendar className="h-4 w-4 text-primary" />,
    concierge_tour_confirmed: <Calendar className="h-4 w-4 text-success" />,
    concierge_tour_cancelled: <Calendar className="h-4 w-4 text-destructive" />,
    concierge_message_received: <Send className="h-4 w-4 text-primary" />,
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
    review_response: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />,
    review_approved: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    review_rejected: <Star className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
    tour_proposed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    tour_confirmed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    tour_cancelled: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
    concierge_intake_received: <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_matches_found: <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_provider_interested: <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_provider_confirmed: <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_placement_complete: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_tour_proposed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
    concierge_tour_confirmed: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-success" />,
    concierge_tour_cancelled: <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />,
    concierge_message_received: <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />,
  };
  return map[type] || <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />;
}

const TYPE_ROUTES: Record<string, string> = {
  // Request / inquiry flow
  request_update: "/account/requests",
  request_confirmation: "/account/requests",
  facility_contacted: "/account/requests",
  facility_contacted_you: "/account/requests",
  tour_proposed: "/account/requests",
  tour_confirmed: "/account/requests",
  tour_cancelled: "/account/requests",
  // Review flow
  review_response: "/account/reviews",
  review_approved: "/account/reviews",
  review_rejected: "/account/reviews",
  // Concierge flow
  concierge_intake_received: "/account/concierge",
  concierge_matches_found: "/account/concierge",
  concierge_provider_interested: "/account/concierge",
  concierge_provider_confirmed: "/account/concierge",
  concierge_placement_complete: "/account/concierge",
  concierge_message_received: "/account/concierge",
  concierge_tour_proposed: "/account/concierge",
  concierge_tour_confirmed: "/account/concierge",
  concierge_tour_cancelled: "/account/concierge",
  // Facility / saved flow
  saved_facility: "/account/saved",
  facility_update: "/account/saved",
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
