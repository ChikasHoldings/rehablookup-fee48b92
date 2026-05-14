/**
 * First-party analytics client. Replaces the GA4 stub.
 *
 * Events are accumulated in memory and flushed in batches of up to
 * BATCH_MAX_EVENTS every FLUSH_INTERVAL_MS, plus on visibility/unload via
 * navigator.sendBeacon so we don't lose tail events. Sends are
 * fire-and-forget; failures are silent.
 *
 * Server endpoint: supabase function `log-analytics-event` (verify_jwt=false,
 * sanitizes PII keys, drops malformed names).
 */

const FLUSH_INTERVAL_MS = 5_000;
const BATCH_MAX_EVENTS = 25;
const QUEUE_HARD_CAP = 200;
const SESSION_KEY = "rl_session_id";

interface EventPayload {
  event_name: string;
  category?: string;
  params?: Record<string, unknown>;
  path?: string;
  referrer?: string;
  viewport?: string;
  session_id?: string;
}

function getOrCreateSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

function getEndpoint(): string | null {
  const supabaseUrl = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/functions/v1/log-analytics-event`;
}

function getAnonKey(): string | null {
  return (
    (import.meta as unknown as { env?: { VITE_SUPABASE_ANON_KEY?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY ??
    (import.meta as unknown as { env?: { VITE_SUPABASE_PUBLISHABLE_KEY?: string } }).env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
    null
  );
}

const queue: EventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let unloadHooksInstalled = false;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush(false);
  }, FLUSH_INTERVAL_MS);
}

async function flush(useBeacon: boolean): Promise<void> {
  if (queue.length === 0) return;
  const endpoint = getEndpoint();
  if (!endpoint) {
    queue.length = 0;
    return;
  }
  const apiKey = getAnonKey();
  const batch = queue.splice(0, BATCH_MAX_EVENTS);
  const body = JSON.stringify({ events: batch });

  // On unload, beacon is the only reliable transport. It can't set custom
  // headers (so the function falls back to anonymous user_id), but the
  // event still lands in the table.
  if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    } catch {
      // fall through to fetch
    }
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["apikey"] = apiKey;
      // The edge function also accepts a Bearer token to attribute user_id.
      // We don't have direct access to the session JWT from here without a
      // circular import, so we leave Authorization out — events stay
      // attributed by session_id rather than user_id. Anonymous-friendly.
    }
    await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      keepalive: true,
    });
  } catch {
    // Swallow — we never block the UI on analytics failures.
  }
}

function installUnloadHooks() {
  if (unloadHooksInstalled || typeof window === "undefined") return;
  unloadHooksInstalled = true;
  const handler = () => {
    void flush(true);
  };
  // Use pagehide + visibilitychange (most reliable across browsers).
  window.addEventListener("pagehide", handler, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") handler();
  });
}

function enqueue(event_name: string, params?: Record<string, unknown>, category?: string): void {
  if (typeof window === "undefined") return;
  if (queue.length >= QUEUE_HARD_CAP) {
    // Drop oldest to avoid unbounded growth.
    queue.shift();
  }
  const path = window.location.pathname + window.location.search;
  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  queue.push({
    event_name,
    category,
    params: params && Object.keys(params).length > 0 ? params : undefined,
    path,
    referrer: document.referrer || undefined,
    viewport,
    session_id: getOrCreateSessionId(),
  });
  installUnloadHooks();
  if (queue.length >= BATCH_MAX_EVENTS) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flush(false);
  } else {
    scheduleFlush();
  }
}

export const trackEvent = (eventName: string, params?: Record<string, unknown>): void => {
  enqueue(eventName, params);
};

export const analytics = {
  formSubmit: (formName: string, success?: boolean) =>
    enqueue("form_submit", { form: formName, success: success ?? true }, "form"),
  leadFormStart: () => enqueue("lead_form_start", undefined, "lead"),
  leadFormStep: (stepNumber: number, stepName: string) =>
    enqueue("lead_form_step", { step: stepNumber, step_name: stepName }, "lead"),
  leadFormComplete: (source?: string) =>
    enqueue("lead_form_complete", source ? { source } : undefined, "lead"),
  ctaClick: (ctaName: string, location?: string) =>
    enqueue("cta_click", { cta: ctaName, ...(location ? { location } : {}) }, "cta"),
  search: (
    searchTerm: string,
    resultsCount?: number,
    extra?: { treatment?: string; insurance?: string; source?: string },
  ) =>
    enqueue(
      "search",
      {
        term: searchTerm,
        ...(typeof resultsCount === "number" ? { results: resultsCount } : {}),
        ...(extra ?? {}),
      },
      "search",
    ),
  directoryFilter: (
    action: "change" | "clear" | "relax" | "paginate",
    p: {
      filter?: "treatment" | "insurance" | "all";
      value?: string;
      page?: number;
      results_count?: number;
      source?: string;
    },
  ) => enqueue("directory_filter", { action, ...p }, "search"),
  facilityView: (facilityId: string, facilityName: string) =>
    enqueue("facility_view", { facility_id: facilityId, facility_name: facilityName }, "facility"),
  facilityContact: (facilityId: string, contactMethod: string) =>
    enqueue("facility_contact", { facility_id: facilityId, method: contactMethod }, "facility"),
  phoneClick: (location: string) => enqueue("phone_click", { location }, "facility"),
  insuranceCheck: (insuranceProvider: string) =>
    enqueue("insurance_check", { provider: insuranceProvider }, "insurance"),
  navClick: (navItem: string) => enqueue("nav_click", { item: navItem }, "nav"),
  outboundClick: (url: string, linkText?: string) =>
    enqueue("outbound_click", { url, ...(linkText ? { text: linkText } : {}) }, "nav"),
  error: (errorType: string, errorMessage: string) =>
    enqueue("error", { type: errorType, message: errorMessage.slice(0, 240) }, "error"),

  // ── 404 + zero-result paths kept their old contract because they write
  //    to a separate `log-not-found` / `log-not-found-search` table.
  pageNotFound: (_params: {
    path: string;
    search?: string;
    referrer?: string;
    viewport?: string;
    userId?: string | null;
    sessionId?: string | null;
    httpMethod?: string;
    hash?: string;
    fullUrl?: string;
  }) => {
    if (typeof window === "undefined") return;
    const { path, search, referrer, viewport, userId, sessionId, httpMethod, hash, fullUrl } =
      _params;
    const lastSegment = path.split("/").pop() || "";
    const extMatch = lastSegment.match(/\.([a-zA-Z0-9]{2,5})$/);
    const assetExtension = extMatch ? `.${extMatch[1].toLowerCase()}` : null;
    const requestKind =
      assetExtension && assetExtension !== ".html" ? "static_asset" : "spa_route";
    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        supabase.functions
          .invoke("log-not-found", {
            body: {
              path,
              search: search || null,
              referrer: referrer || null,
              viewport: viewport || null,
              userId: userId || null,
              sessionId: sessionId || null,
              httpMethod: httpMethod || "GET",
              hash: hash || null,
              fullUrl: fullUrl || null,
              requestKind,
              assetExtension,
            },
          })
          .catch(() => { /* fire-and-forget */ });
      })
      .catch(() => { /* ignore */ });
  },
  notFoundSearchSubmit: (p: {
    location?: string;
    treatment?: string;
    insurance?: string;
    sourcePath?: string;
    referrer?: string;
    viewport?: string;
    sessionId?: string | null;
    userId?: string | null;
  }) => {
    if (typeof window === "undefined") return;
    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        supabase.functions
          .invoke("log-not-found-search", {
            body: {
              eventKind: "submit",
              location: p.location || null,
              treatment: p.treatment || null,
              insurance: p.insurance || null,
              sourcePath: p.sourcePath || null,
              referrer: p.referrer || null,
              viewport: p.viewport || null,
              sessionId: p.sessionId || null,
              userId: p.userId || null,
            },
          })
          .catch(() => { /* fire-and-forget */ });
      })
      .catch(() => { /* ignore */ });
  },
  notFoundSearchZeroResults: (p: {
    location?: string;
    treatment?: string;
    insurance?: string;
    resultsCount: number;
    sourcePath?: string;
    referrer?: string;
    viewport?: string;
    sessionId?: string | null;
    userId?: string | null;
  }) => {
    if (typeof window === "undefined") return;
    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        supabase.functions
          .invoke("log-not-found-search", {
            body: {
              eventKind: "zero_results",
              location: p.location || null,
              treatment: p.treatment || null,
              insurance: p.insurance || null,
              resultsCount: p.resultsCount,
              sourcePath: p.sourcePath || null,
              referrer: p.referrer || null,
              viewport: p.viewport || null,
              sessionId: p.sessionId || null,
              userId: p.userId || null,
            },
          })
          .catch(() => { /* fire-and-forget */ });
      })
      .catch(() => { /* ignore */ });
  },

  viewSubscriptionPlan: (planId: string, planName: string, price: number) =>
    enqueue("subscription_view", { plan_id: planId, plan_name: planName, price }, "subscription"),
  selectSubscriptionPlan: (planId: string, planName: string, price: number) =>
    enqueue("subscription_select", { plan_id: planId, plan_name: planName, price }, "subscription"),
  beginSubscriptionCheckout: (planId: string, planName: string, price: number, promoCode?: string) =>
    enqueue(
      "subscription_checkout",
      { plan_id: planId, plan_name: planName, price, ...(promoCode ? { promo: promoCode } : {}) },
      "subscription",
    ),
  subscriptionPurchase: (
    planId: string,
    planName: string,
    price: number,
    transactionId?: string,
    promoCode?: string,
  ) =>
    enqueue(
      "subscription_purchase",
      {
        plan_id: planId,
        plan_name: planName,
        price,
        ...(transactionId ? { txn: transactionId } : {}),
        ...(promoCode ? { promo: promoCode } : {}),
      },
      "subscription",
    ),
  subscriptionUpgrade: (fromPlan: string, toPlan: string, newPrice: number) =>
    enqueue("subscription_upgrade", { from: fromPlan, to: toPlan, price: newPrice }, "subscription"),
  subscriptionCancel: (planId: string, planName: string) =>
    enqueue("subscription_cancel", { plan_id: planId, plan_name: planName }, "subscription"),
  viewBillingPage: () => enqueue("billing_view", undefined, "subscription"),
  promoCodeApplied: (promoCode: string, discount: string, planId: string) =>
    enqueue("promo_applied", { promo: promoCode, discount, plan_id: planId }, "subscription"),
  checkoutAbandoned: (planId: string, planName: string, price: number) =>
    enqueue("subscription_abandon", { plan_id: planId, plan_name: planName, price }, "subscription"),
  beginCreditPurchase: (amountCents: number, facilityId: string) =>
    enqueue("credit_purchase_begin", { amount_cents: amountCents, facility_id: facilityId }, "credits"),
  creditPurchaseComplete: (amountCents: number) =>
    enqueue("credit_purchase_complete", { amount_cents: amountCents }, "credits"),
  leadUnlocked: (
    leadId: string,
    facilityId: string,
    priceCents: number,
    paymentMethod: string,
    discountApplied?: boolean,
  ) =>
    enqueue(
      "lead_unlocked",
      {
        lead_id: leadId,
        facility_id: facilityId,
        price_cents: priceCents,
        method: paymentMethod,
        discount: !!discountApplied,
      },
      "lead",
    ),
  conciergeIntakeSubmitted: () => enqueue("concierge_intake_submitted", undefined, "concierge"),
  beginInternationalCheckout: (country: string) =>
    enqueue("international_checkout_begin", { country }, "international"),
  internationalPaymentComplete: (sessionId: string) =>
    enqueue("international_payment_complete", { session: sessionId }, "international"),
  placementFeeCharged: (
    facilityId: string,
    amountCents: number,
    caseId: string,
    isInternational?: boolean,
  ) =>
    enqueue(
      "placement_fee_charged",
      {
        facility_id: facilityId,
        amount_cents: amountCents,
        case_id: caseId,
        international: !!isInternational,
      },
      "placement",
    ),
  signupComplete: (role: "seeker" | "provider", method: string) =>
    enqueue("signup_complete", { role, method }, "auth"),
  loginComplete: (role: string, method: string) =>
    enqueue("login_complete", { role, method }, "auth"),
};
