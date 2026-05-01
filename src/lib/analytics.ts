// Google Analytics Event Tracking Utility

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type GAEventParams = {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: unknown;
};

// GA4 Ecommerce item type
interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}

export const trackEvent = (
  eventName: string,
  params?: GAEventParams
): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
};

// Pre-defined event tracking functions for common actions
export const analytics = {
  // Form submissions
  formSubmit: (formName: string, success: boolean = true) => {
    trackEvent('form_submit', {
      event_category: 'Form',
      event_label: formName,
      value: success ? 1 : 0,
    });
  },

  // Lead form specific
  leadFormStart: () => {
    trackEvent('lead_form_start', {
      event_category: 'Lead',
      event_label: 'Form Started',
    });
  },

  leadFormStep: (stepNumber: number, stepName: string) => {
    trackEvent('lead_form_step', {
      event_category: 'Lead',
      event_label: stepName,
      value: stepNumber,
    });
  },

  leadFormComplete: (source?: string) => {
    trackEvent('lead_form_complete', {
      event_category: 'Lead',
      event_label: source || 'Direct',
    });
  },

  // CTA clicks
  ctaClick: (ctaName: string, location?: string) => {
    trackEvent('cta_click', {
      event_category: 'CTA',
      event_label: ctaName,
      cta_location: location,
    });
  },

  // Search actions
  search: (searchTerm: string, resultsCount?: number) => {
    trackEvent('search', {
      event_category: 'Search',
      search_term: searchTerm,
      results_count: resultsCount,
    });
  },

  // Facility interactions
  facilityView: (facilityId: string, facilityName: string) => {
    trackEvent('facility_view', {
      event_category: 'Facility',
      event_label: facilityName,
      facility_id: facilityId,
    });
  },

  facilityContact: (facilityId: string, contactMethod: string) => {
    trackEvent('facility_contact', {
      event_category: 'Facility',
      event_label: contactMethod,
      facility_id: facilityId,
    });
  },

  // Phone clicks
  phoneClick: (location: string) => {
    trackEvent('phone_click', {
      event_category: 'Contact',
      event_label: location,
    });
  },

  // Insurance check
  insuranceCheck: (insuranceProvider: string) => {
    trackEvent('insurance_check', {
      event_category: 'Insurance',
      event_label: insuranceProvider,
    });
  },

  // Navigation
  navClick: (navItem: string) => {
    trackEvent('navigation_click', {
      event_category: 'Navigation',
      event_label: navItem,
    });
  },

  // Outbound links
  outboundClick: (url: string, linkText?: string) => {
    trackEvent('outbound_click', {
      event_category: 'Outbound',
      event_label: linkText || url,
      outbound_url: url,
    });
  },

  // Error tracking
  error: (errorType: string, errorMessage: string) => {
    trackEvent('error', {
      event_category: 'Error',
      event_label: errorType,
      error_message: errorMessage,
    });
  },

  // 404 / NotFound view — captures the exact path + referrer so we can
  // identify the top sources of dead-end traffic the next day. Fires both
  // a GA event AND a backend insert via the log-not-found edge function so
  // we have first-party data even when GA is blocked by ad-blockers.
  pageNotFound: (params: {
    path: string;
    search?: string;
    referrer?: string;
    viewport?: string;
    userId?: string | null;
    sessionId?: string | null;
    /** HTTP method used for the navigation. Browser SPA nav is always GET. */
    httpMethod?: string;
    /** URL hash fragment (including the leading "#"), if any. */
    hash?: string;
    /** Full original URL (origin + path + search + hash). */
    fullUrl?: string;
  }) => {
    const {
      path,
      search,
      referrer,
      viewport,
      userId,
      sessionId,
      httpMethod,
      hash,
      fullUrl,
    } = params;

    // Classify the request: SPA route vs. static asset (image, pdf, json,
    // etc.). Asset 404s usually indicate broken <img> src or stale CDN
    // references and are triaged differently from real navigation 404s.
    // We look at the LAST segment only so paths like
    //   /rehab-centers/california         -> spa_route
    //   /og/center-foo.png                -> static_asset (.png)
    //   /sitemap-extras.xml               -> static_asset (.xml)
    const lastSegment = path.split('/').pop() || '';
    const extMatch = lastSegment.match(/\.([a-zA-Z0-9]{2,5})$/);
    const assetExtension = extMatch ? `.${extMatch[1].toLowerCase()}` : null;
    // Treat .html specially — those are pre-rendered SPA routes, not assets.
    const requestKind =
      assetExtension && assetExtension !== '.html' ? 'static_asset' : 'spa_route';

    // 1) GA event (page_not_found is a custom event; page_location is the
    // standard GA dimension so it shows up in the event report without
    // extra config).
    trackEvent('page_not_found', {
      event_category: 'Error',
      event_label: path,
      page_location: path + (search || '') + (hash || ''),
      page_referrer: referrer || '(direct)',
      viewport: viewport,
      http_method: httpMethod || 'GET',
      request_kind: requestKind,
      asset_extension: assetExtension || undefined,
    });

    // 2) Backend insert (fire-and-forget). We import lazily to avoid pulling
    // the supabase client into pages that never 404.
    if (typeof window === 'undefined') return;
    import('@/integrations/supabase/client')
      .then(({ supabase }) => {
        supabase.functions
          .invoke('log-not-found', {
            body: {
              path,
              search: search || null,
              referrer: referrer || null,
              viewport: viewport || null,
              userId: userId || null,
              sessionId: sessionId || null,
              httpMethod: httpMethod || 'GET',
              hash: hash || null,
              fullUrl: fullUrl || null,
              requestKind,
              assetExtension,
            },
          })
          .catch(() => {
            /* fire-and-forget; never block the user */
          });
      })
      .catch(() => {
        /* ignore — analytics must never break navigation */
      });
  },

  // ========== NOTFOUND SEARCH RECOVERY TRACKING ==========
  //
  // Fires when a visitor uses the recovery search box on the 404 page.
  // We log to GA *and* persist via the log-not-found-search edge function
  // so admins can see what users typed and add redirects or content for
  // the top queries — even when GA is blocked.
  notFoundSearchSubmit: (params: {
    location?: string;
    treatment?: string;
    insurance?: string;
    sourcePath?: string;
    referrer?: string;
    viewport?: string;
    sessionId?: string | null;
    userId?: string | null;
  }) => {
    trackEvent('not_found_search_submit', {
      event_category: 'NotFoundRecovery',
      event_label: params.location || params.treatment || params.insurance || '(empty)',
      search_location: params.location,
      search_treatment: params.treatment,
      search_insurance: params.insurance,
      source_path: params.sourcePath,
    });
    if (typeof window === 'undefined') return;
    import('@/integrations/supabase/client')
      .then(({ supabase }) => {
        supabase.functions
          .invoke('log-not-found-search', {
            body: {
              eventKind: 'submit',
              location: params.location || null,
              treatment: params.treatment || null,
              insurance: params.insurance || null,
              sourcePath: params.sourcePath || null,
              referrer: params.referrer || null,
              viewport: params.viewport || null,
              sessionId: params.sessionId || null,
              userId: params.userId || null,
            },
          })
          .catch(() => {
            /* fire-and-forget */
          });
      })
      .catch(() => {
        /* ignore */
      });
  },

  // Fires after /search-results reports zero matches for a query that
  // originated from the 404 recovery box (?from=404).
  notFoundSearchZeroResults: (params: {
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
    trackEvent('not_found_search_zero_results', {
      event_category: 'NotFoundRecovery',
      event_label: params.location || params.treatment || params.insurance || '(empty)',
      search_location: params.location,
      search_treatment: params.treatment,
      search_insurance: params.insurance,
      results_count: params.resultsCount,
    });
    if (typeof window === 'undefined') return;
    import('@/integrations/supabase/client')
      .then(({ supabase }) => {
        supabase.functions
          .invoke('log-not-found-search', {
            body: {
              eventKind: 'zero_results',
              location: params.location || null,
              treatment: params.treatment || null,
              insurance: params.insurance || null,
              resultsCount: params.resultsCount,
              sourcePath: params.sourcePath || null,
              referrer: params.referrer || null,
              viewport: params.viewport || null,
              sessionId: params.sessionId || null,
              userId: params.userId || null,
            },
          })
          .catch(() => {
            /* fire-and-forget */
          });
      })
      .catch(() => {
        /* ignore */
      });
  },

  // ========== ENHANCED ECOMMERCE TRACKING ==========
  
  // View subscription plan (view_item)
  viewSubscriptionPlan: (planId: string, planName: string, price: number) => {
    trackEvent('view_item', {
      currency: 'USD',
      value: price,
      items: [{
        item_id: planId,
        item_name: planName,
        item_category: 'Subscription',
        price: price,
        quantity: 1,
      }] as EcommerceItem[],
    });
  },

  // Select subscription plan (add_to_cart equivalent)
  selectSubscriptionPlan: (planId: string, planName: string, price: number) => {
    trackEvent('add_to_cart', {
      currency: 'USD',
      value: price,
      items: [{
        item_id: planId,
        item_name: planName,
        item_category: 'Subscription',
        price: price,
        quantity: 1,
      }] as EcommerceItem[],
    });
  },

  // Begin checkout for subscription
  beginSubscriptionCheckout: (planId: string, planName: string, price: number, promoCode?: string) => {
    trackEvent('begin_checkout', {
      currency: 'USD',
      value: price,
      coupon: promoCode || undefined,
      items: [{
        item_id: planId,
        item_name: planName,
        item_category: 'Subscription',
        price: price,
        quantity: 1,
      }] as EcommerceItem[],
    });
  },

  // Subscription purchase complete
  subscriptionPurchase: (
    planId: string, 
    planName: string, 
    price: number, 
    transactionId?: string,
    promoCode?: string
  ) => {
    trackEvent('purchase', {
      transaction_id: transactionId || `sub_${Date.now()}`,
      currency: 'USD',
      value: price,
      coupon: promoCode || undefined,
      items: [{
        item_id: planId,
        item_name: planName,
        item_category: 'Subscription',
        price: price,
        quantity: 1,
      }] as EcommerceItem[],
    });
  },

  // Subscription upgrade
  subscriptionUpgrade: (fromPlan: string, toPlan: string, newPrice: number) => {
    trackEvent('subscription_upgrade', {
      event_category: 'Subscription',
      event_label: `${fromPlan} to ${toPlan}`,
      value: newPrice,
      from_plan: fromPlan,
      to_plan: toPlan,
    });
  },

  // Subscription cancellation
  subscriptionCancel: (planId: string, planName: string) => {
    trackEvent('subscription_cancel', {
      event_category: 'Subscription',
      event_label: planName,
      item_id: planId,
    });
  },

  // View billing page
  viewBillingPage: () => {
    trackEvent('view_billing', {
      event_category: 'Subscription',
      event_label: 'Billing Page View',
    });
  },

  // Promo code applied
  promoCodeApplied: (promoCode: string, discount: string, planId: string) => {
    trackEvent('promo_code_applied', {
      event_category: 'Subscription',
      event_label: promoCode,
      discount: discount,
      plan_id: planId,
    });
  },

  // Checkout abandoned (user starts checkout but doesn't complete)
  checkoutAbandoned: (planId: string, planName: string, price: number) => {
    trackEvent('checkout_abandoned', {
      event_category: 'Subscription',
      event_label: planName,
      value: price,
      item_id: planId,
    });
  },
};
