import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Directory cutover stage 2 — seeker facility-contact routing.
 *
 * RehabLookup is a directory. There are exactly two ways a visitor can
 * contact a facility they selected:
 *
 *   "pro"    — the facility has an ACTIVE Pro subscription, so we may offer
 *              the on-platform Request Info form. The inquiry goes to that
 *              one facility's inbox. RehabLookup does not match, reassign,
 *              advise, coordinate, or introduce.
 *   "direct" — everything else (Free, unclaimed, Featured-only, lapsed, or
 *              an entitlement we could not confirm). We collect no seeker
 *              PII; the visitor calls / visits / navigates to the facility
 *              themselves.
 *
 * Entitlement source of truth
 * ---------------------------
 * `public_facilities.is_pro` is the view projection of the canonical
 * grace-aware `has_active_pro()` predicate, and it is readable by anonymous
 * visitors (the majority of public-profile traffic). We deliberately do NOT
 * derive Pro from a caller-supplied `facilityPlan` prop, from Featured
 * status, from a badge, from claim state, or from `facility_subscriptions`
 * rows — any of those can be stale or wrong.
 *
 * This resolution is a UX gate only. `submit-qualified-lead` re-resolves
 * `has_active_pro()` server-side and remains authoritative; if it disagrees
 * it returns DIRECT_CONTACT_REQUIRED and the UI falls back to direct
 * contact (see RequestInfoModal).
 *
 * Fail-safe: a missing facility, a query error, or a non-approved listing
 * all resolve to "direct". We never open a PII form on an unconfirmed
 * entitlement.
 */
export type FacilityContactRouting = "pro" | "direct";

export interface FacilityDirectContactInfo {
  id: string;
  name: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  slug: string | null;
}

export interface FacilityContactRoutingResult {
  routing: FacilityContactRouting;
  contact: FacilityDirectContactInfo | null;
  /** True when the facility record itself could not be loaded. */
  facilityMissing: boolean;
}

const DIRECT_FALLBACK: FacilityContactRoutingResult = {
  routing: "direct",
  contact: null,
  facilityMissing: true,
};

export function useFacilityContactRouting(facilityId: string | null | undefined) {
  return useQuery<FacilityContactRoutingResult>({
    queryKey: ["facility-contact-routing", facilityId],
    queryFn: async () => {
      if (!facilityId) return DIRECT_FALLBACK;

      const { data, error } = await supabase
        .from("public_facilities")
        .select("id, name, phone, website, address, city, state, zip_code, slug, status, is_pro")
        .eq("id", facilityId)
        .maybeSingle();

      // Fail SAFE. An errored or empty lookup must never unlock the PII form.
      if (error || !data) return DIRECT_FALLBACK;

      const contact: FacilityDirectContactInfo = {
        id: data.id ?? facilityId,
        name: data.name ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zipCode: data.zip_code ?? null,
        slug: data.slug ?? null,
      };

      const eligible = data.status === "approved";

      return {
        routing: eligible && data.is_pro === true ? "pro" : "direct",
        contact,
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
  contact: Pick<FacilityDirectContactInfo, "address" | "city" | "state" | "zipCode"> | null,
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
