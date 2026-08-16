import { getPhoneDigits, formatPhoneNumber } from "@/lib/phoneUtils";

/**
 * THE PUBLIC FACILITY PHONE RULE — one definition, used by every public
 * surface (profile, contact modal, search cards, compare, saved, Featured
 * rails).
 *
 * Publishing a facility's phone number is a PAID CONTACT FEATURE of an active
 * Pro subscription. Nothing else unlocks it:
 *
 *   Featured        → paid VISIBILITY only. Never unlocks contact features.
 *   verified        → an accreditation signal, not a payment.
 *   claimed         → says who manages a listing, not what they bought.
 *   bed_count, rating, ranking score, "hasPaidPlan"-style flags → irrelevant.
 *
 * FAIL CLOSED. The gate is `isPro === true`, not truthiness: `undefined`,
 * `null` and any non-boolean all resolve to hidden. This matters during the
 * controlled rollout, when the frontend can be live against a backend whose
 * phone-masking migration has not been applied yet and which therefore still
 * returns a Free facility's raw number. The client refuses to render it
 * either way, so the UI is safe on the OLD schema as well as the new one.
 *
 * The seeker's own callback number is unrelated to this rule and is never
 * gated — see FacilityInquiryForm.
 */
export interface PublicPhoneInput {
  /** Canonical `has_active_pro()` projection. Anything but `true` hides. */
  isPro?: boolean | null;
  phone?: string | null;
}

export interface PublicPhonePresentation {
  /** True only for a confirmed Pro facility with a dialable number. */
  visible: boolean;
  /** Formatted for display, or null. Never populated when `visible` is false. */
  display: string | null;
  /** `tel:` href, or null. Never populated when `visible` is false. */
  telHref: string | null;
}

const HIDDEN: PublicPhonePresentation = { visible: false, display: null, telHref: null };

/**
 * Resolve whether — and how — a facility's phone may be shown publicly.
 * Returns a fully-hidden result for every non-Pro case, so callers cannot
 * accidentally render digits by reading the wrong field.
 */
export function resolvePublicFacilityPhone(input: PublicPhoneInput | null | undefined): PublicPhonePresentation {
  if (!input) return HIDDEN;
  if (input.isPro !== true) return HIDDEN;

  const raw = input.phone?.trim();
  if (!raw) return HIDDEN;

  const digits = getPhoneDigits(raw);
  // A partial or junk number is worse than none: it produces a dead tel: link.
  if (!digits || digits.length < 10) return HIDDEN;

  return {
    visible: true,
    display: formatPhoneNumber(raw),
    telHref: `tel:+1${digits}`,
  };
}
