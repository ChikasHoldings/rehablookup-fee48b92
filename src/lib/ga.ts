/**
 * Typed Google Analytics 4 helpers.
 *
 * Background: pre-2026-05-21 the SPA fired generic `gtag('event','page_view',{path,location,title})`
 * via `RouteChangeTracker` and routed every richer signal (facility view,
 * phone click, etc.) to a first-party Supabase pipeline + the
 * `provider_events` table. That meant:
 *  - GA reports couldn't slice traffic by `facility_id`, state, or facility
 *    type — the dimensions only existed in our own DB.
 *  - Admin "visitor" counts (from `provider_events`) ran higher than GA
 *    because the admin stream had no bot filter and no internal-traffic
 *    exclusion.
 *
 * This module:
 *  - Mirrors the most important first-party events into GA4 as custom
 *    events with structured parameters, so GA reports can break down by
 *    facility_id / facility_state / content_group.
 *  - Sets a `traffic_type` user property (`internal` for staff sessions,
 *    `external` for everyone else) so GA4 reports can exclude internal
 *    traffic without an IP filter — handled by
 *    `src/hooks/useGAInternalTrafficFlag.ts`.
 *
 * Everything in here is a no-op when `window.gtag` is undefined (SSR,
 * ad-blocker, consent denial), so the call sites can fire freely without
 * defensive guards.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Trim every string value, strip undefineds, and cap value length at 100
 *  chars (GA4's per-param limit). Returns a clean object safe to forward
 *  to gtag. */
function sanitizeParams<T extends Record<string, unknown>>(params: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) continue;
      out[key] = trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed;
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

function gtagSafe(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const fn = window.gtag;
  if (typeof fn !== "function") return;
  try {
    fn(...args);
  } catch {
    // Never let analytics crash a render.
  }
}

export interface FacilityViewParams {
  facility_id: string;
  facility_slug?: string | null;
  facility_name?: string | null;
  facility_state?: string | null;
  facility_city?: string | null;
  facility_type?: string | null;
  /** "public" for /center/<slug>, "seeker_panel" for /account/facility/<id>. */
  surface?: "public" | "seeker_panel";
}

/**
 * Fires a GA4 `facility_view` custom event on facility profile mount.
 * Register `facility_id`, `facility_state`, `facility_type`, and
 * `facility_slug` as Custom Dimensions in GA4 ➜ Admin ➜ Custom definitions
 * to make them queryable in reports. Without that registration the events
 * still record but the dimensions don't surface in explorations.
 */
export const gaFacilityView = (p: FacilityViewParams): void => {
  gtagSafe("event", "facility_view", sanitizeParams({
    facility_id: p.facility_id,
    facility_slug: p.facility_slug,
    facility_name: p.facility_name,
    facility_state: p.facility_state,
    facility_city: p.facility_city,
    facility_type: p.facility_type,
    surface: p.surface ?? "public",
    content_group: "facility",
  }));
};

export type FacilityContactMethod =
  | "call"
  | "website"
  | "directions"
  | "send_request"
  | "tour_request"
  | "ready_to_connect";

export interface FacilityContactParams {
  facility_id: string;
  method: FacilityContactMethod;
  facility_slug?: string | null;
  facility_state?: string | null;
}

/**
 * Fires a GA4 `facility_contact` event when a user takes an engagement
 * action on a facility profile (phone click, website click, directions,
 * send-request CTA, etc.). Parallel to the first-party `provider_events`
 * row written by `useProviderEventTracking` so the two streams can be
 * reconciled per facility.
 */
export const gaFacilityContact = (p: FacilityContactParams): void => {
  gtagSafe("event", "facility_contact", sanitizeParams({
    facility_id: p.facility_id,
    method: p.method,
    facility_slug: p.facility_slug,
    facility_state: p.facility_state,
    content_group: "facility",
  }));
};

/**
 * Sets the `traffic_type` user property on the GA4 session. Call once on
 * app mount after the user's role is known. `internal` flags staff
 * (admin/super_admin/manager) sessions so GA4 reports can exclude them via
 * an Audience or Comparison filter — no IP-allowlist required.
 *
 * This mirrors the `is_internal` flag the `track-provider-event` edge
 * function writes to `provider_events`, so admin-side dashboards and GA4
 * reports apply the same exclusion logic.
 */
export const gaSetTrafficType = (kind: "internal" | "external"): void => {
  gtagSafe("set", "user_properties", { traffic_type: kind });
};

/**
 * Resolves the GA4 `content_group` for a given URL path so reports can
 * slice traffic by section without registering 50 custom dimensions.
 * Mirrors the buckets used in /admin/analytics.
 */
export const resolveContentGroup = (pathname: string): string => {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return "home";
  if (p.startsWith("/center/")) return "facility";
  if (p.startsWith("/rehab-centers/") && p.split("/").length >= 4) return "city";
  if (p.startsWith("/rehab-centers/")) return "state";
  if (p === "/rehab-centers") return "directory";
  if (p.startsWith("/search-results")) return "search";
  if (p.startsWith("/treatment-types/")) return "treatment_hub";
  if (p.includes("-near-me")) return "near_me";
  if (p.startsWith("/insurance/")) return "insurance_hub";
  if (p.startsWith("/resources/")) return "resources";
  if (p.startsWith("/account/") || p.startsWith("/seeker/")) return "seeker_panel";
  if (p.startsWith("/provider/")) return "provider_panel";
  if (p.startsWith("/admin/")) return "admin_panel";
  if (p.startsWith("/blog") || p.startsWith("/articles")) return "blog";
  return "other";
};

/**
 * Re-export the typed gtag for callers that need to drop down past the
 * helpers (e.g. an experiment tag, A/B variant assignment). Prefer the
 * named helpers above for anything that has a canonical event shape.
 */
export const gtagRaw = gtagSafe;
