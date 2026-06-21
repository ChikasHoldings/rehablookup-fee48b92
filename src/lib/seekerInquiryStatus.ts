/**
 * Seeker-facing inquiry/lead status resolution.
 *
 * The "Facility Responded" indicator a seeker sees MUST reflect an actual
 * provider response. The canonical signal is `provider_responded_at` (set
 * atomically when a provider responds) or `provider_response_status === 'responded'`.
 *
 * The admin/provider PIPELINE column `leads.status` (e.g. 'contacted') is NOT a
 * reliable seeker-facing "responded" signal: it can be set by admin/redistribution
 * actions or drift from the best-effort forward-sync, so labeling pipeline
 * status='contacted' as "Facility Responded" can mislead the seeker into thinking
 * the facility reached out when it may not have. Keep the seeker-facing response
 * label driven by the provider-response columns; pipeline labels stay separate.
 */
export type SeekerInquiryStatusKey =
  | "responded"
  | "pending"
  | "in_progress"
  | "scheduled"
  | "admitted"
  | "closed"
  | "expired"
  | "submitted";

export interface SeekerInquiryStatusInput {
  /** leads.status — admin/provider pipeline status (NOT the seeker response signal). */
  status?: string | null;
  /** leads.provider_responded_at — canonical "facility responded" timestamp. */
  providerRespondedAt?: string | null;
  /** leads.provider_response_status — 'responded' is the explicit response signal. */
  providerResponseStatus?: string | null;
}

/** True only when the provider has actually responded to the seeker. */
export function hasFacilityResponded(input: SeekerInquiryStatusInput): boolean {
  if (input.providerRespondedAt) return true;
  return (input.providerResponseStatus ?? "").toLowerCase() === "responded";
}

/** Resolve the seeker-facing status key. A real provider response wins over pipeline status. */
export function resolveSeekerInquiryStatus(
  input: SeekerInquiryStatusInput,
): SeekerInquiryStatusKey {
  if (hasFacilityResponded(input)) return "responded";

  switch ((input.status ?? "").toLowerCase()) {
    case "new":
      return "pending";
    // Pipeline-only states with NO provider response — never "responded".
    case "contacted":
    case "unlocked":
    case "in_progress":
    case "responding":
      return "in_progress";
    case "scheduled":
      return "scheduled";
    case "admitted":
      return "admitted";
    case "closed":
    case "converted":
    case "lost":
      return "closed";
    case "expired":
      return "expired";
    default:
      return "submitted";
  }
}
