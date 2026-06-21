// Provider-facing listing status metadata.
//
// Previously both the listing editor (ListingEditor.getStatusConfig) and the
// ListingStatusCard mapped only `approved` → "Live" and `pending` → "Under
// Review", with EVERYTHING ELSE falling through to "Draft". That meant an
// admin-`rejected` listing, a `needs_edits` listing, and a `pending_review`
// listing all rendered to the provider as a benign "Draft" with no signal that
// action was required — the rejection reason lives only in admin_audit_log, so
// the provider had no way to even know the listing was rejected. This shared
// map gives each moderation state a distinct, honest label + description.
//
// `tone` is a presentation-neutral bucket so callers can pick their own
// icon/colour without this module importing UI deps (keeps it unit-testable).

export type ListingStatusTone = "live" | "review" | "attention" | "draft" | "paused";

export interface ListingStatusMeta {
  label: string;
  tone: ListingStatusTone;
  /** Short provider-facing explanation of what this state means / next step. */
  description: string;
  /** Whether the listing is publicly visible in this state. */
  isPublic: boolean;
}

/**
 * Resolve provider-facing status metadata for a facility listing.
 *
 * @param status    `facilities.status` (approved | pending | pending_review |
 *                  needs_edits | rejected | draft | …)
 * @param suspended `facilities.suspended` — a suspended facility is never
 *                  public regardless of status, so it takes precedence.
 */
export function getListingStatusMeta(
  status: string | null | undefined,
  suspended?: boolean | null,
): ListingStatusMeta {
  if (suspended) {
    return {
      label: "Paused",
      tone: "paused",
      description: "Paused — not shown publicly. Contact support to reactivate.",
      isPublic: false,
    };
  }

  switch (status) {
    case "approved":
      return {
        label: "Live",
        tone: "live",
        description: "Visible to families in search results.",
        isPublic: true,
      };
    case "pending":
    case "pending_review":
      return {
        label: "Under Review",
        tone: "review",
        description: "Our team is reviewing your listing — usually 24–48 hours.",
        isPublic: false,
      };
    case "needs_edits":
      return {
        label: "Changes Requested",
        tone: "attention",
        description: "An admin asked for changes before this listing can go live.",
        isPublic: false,
      };
    case "rejected":
      return {
        label: "Not Approved",
        tone: "attention",
        description: "This listing wasn't approved. Contact support to request another review.",
        isPublic: false,
      };
    case "draft":
    default:
      return {
        label: "Draft",
        tone: "draft",
        description: "Not published yet.",
        isPublic: false,
      };
  }
}
