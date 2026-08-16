import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * What a visitor may DO with the one facility they selected.
 *
 * Replaces the stage-2 `"pro" | "direct"` routing model, which encoded a
 * product rule that no longer exists (Pro → on-platform form, everyone else →
 * go phone them yourself). Both tiers now use the same inquiry form, so a
 * two-valued "route" is actively misleading. This hook returns capabilities
 * instead, and the two that matter are independent:
 *
 *   canSubmitInquiry — is NOT derived from entitlement. Any approved,
 *                      non-suspended listing may receive an inquiry from the
 *                      seeker who selected it: Free, claimed, unclaimed and
 *                      Featured-only alike.
 *
 *   showPhone        — IS derived from canonical Pro entitlement, and from
 *                      nothing else. Publishing the facility's phone number
 *                      is the paid contact feature.
 *
 * Entitlement source of truth
 * ---------------------------
 * `public_facilities.is_pro` is the view projection of the canonical,
 * grace-aware `has_active_pro()` predicate. Pro is never inferred from a
 * caller-supplied prop, from `featured`, from a badge, from `verified`, from
 * claim state, or from a `facility_subscriptions` row — each of those can be
 * stale, wrong, or (in Featured's case) a completely different product.
 *
 * Fail-closed on BOTH axes, for different reasons
 * -----------------------------------------------
 *   • `phone` is nulled unless `is_pro === true`, even if the server handed us
 *     a number. During the controlled rollout the frontend can be live against
 *     a database whose phone-masking migration has not been applied yet, so
 *     the OLD backend will happily return a Free facility's raw phone. The
 *     client must refuse to render it regardless. Never `?? facility.phone`
 *     from a parent prop here — that is the exact hole this closes.
 *   • `canSubmitInquiry` is false when the facility record could not be
 *     loaded or is not approved, so we never open a PII form pointed at a
 *     destination we could not confirm. `submit-qualified-lead` re-resolves
 *     the facility server-side and remains authoritative.
 */
export interface FacilityContactCapabilities {
  /** May we offer the on-platform inquiry form? Independent of entitlement. */
  canSubmitInquiry: boolean;
  /** May we publish this facility's phone number? Canonical Pro only. */
  showPhone: boolean;
  /** The publishable phone. ALWAYS null when `showPhone` is false. */
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  name: string | null;
  slug: string | null;
  id: string | null;
  /** True when the facility record itself could not be loaded. */
  facilityMissing: boolean;
}

const UNAVAILABLE: FacilityContactCapabilities = {
  canSubmitInquiry: false,
  showPhone: false,
  phone: null,
  website: null,
  address: null,
  city: null,
  state: null,
  zipCode: null,
  name: null,
  slug: null,
  id: null,
  facilityMissing: true,
};

export function useFacilityContactCapabilities(facilityId: string | null | undefined) {
  return useQuery<FacilityContactCapabilities>({
    queryKey: ["facility-contact-capabilities", facilityId],
    queryFn: async () => {
      if (!facilityId) return UNAVAILABLE;

      const { data, error } = await supabase
        .from("public_facilities")
        .select("id, name, phone, website, address, city, state, zip_code, slug, status, is_pro")
        .eq("id", facilityId)
        .maybeSingle();

      if (error || !data) return UNAVAILABLE;

      const isApproved = data.status === "approved";
      // Exact `=== true`. A null/undefined projection is not Pro.
      const showPhone = data.is_pro === true;

      return {
        // Entitlement is deliberately absent from this expression.
        canSubmitInquiry: isApproved,
        showPhone,
        // Hard client-side mask — see the fail-closed note above.
        phone: showPhone ? (data.phone ?? null) : null,
        website: data.website ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zipCode: data.zip_code ?? null,
        name: data.name ?? null,
        slug: data.slug ?? null,
        id: data.id ?? facilityId,
        facilityMissing: false,
      };
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

/**
 * Builds a Google Maps directions URL from whatever real location data the
 * facility actually has. Returns null when there is not enough to point a
 * map at — we never manufacture an address.
 *
 * "Enough" means a street address, or a city paired with a state. A bare
 * state (or a lone city) would send the seeker to a region centroid, which
 * is worse than showing no button at all.
 */
export function buildDirectionsUrl(
  contact: Pick<FacilityContactCapabilities, "address" | "city" | "state" | "zipCode"> | null,
): string | null {
  if (!contact) return null;

  const address = contact.address?.trim() || "";
  const city = contact.city?.trim() || "";
  const state = contact.state?.trim() || "";
  const zip = contact.zipCode?.trim() || "";

  const hasEnough = !!address || (!!city && !!state);
  if (!hasEnough) return null;

  const destination = [address, city, state, zip].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Normalises a facility website into a safe absolute https/http URL. */
export function buildWebsiteUrl(website: string | null | undefined): string | null {
  const raw = website?.trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
