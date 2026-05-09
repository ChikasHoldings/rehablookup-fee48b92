/**
 * Analytics stub — Google Analytics has been removed from this platform.
 * All functions are preserved as no-ops so existing call sites continue
 * to compile and run without errors. No data is sent anywhere.
 *
 * To integrate a new analytics provider, replace the no-op bodies below.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const trackEvent = (_eventName: string, _params?: Record<string, unknown>): void => {
  // no-op
};

export const analytics = {
  formSubmit: (_formName: string, _success?: boolean) => {},
  leadFormStart: () => {},
  leadFormStep: (_stepNumber: number, _stepName: string) => {},
  leadFormComplete: (_source?: string) => {},
  ctaClick: (_ctaName: string, _location?: string) => {},
  search: (
    _searchTerm: string,
    _resultsCount?: number,
    _extra?: { treatment?: string; insurance?: string; source?: string },
  ) => {},
  directoryFilter: (
    _action: 'change' | 'clear' | 'relax' | 'paginate',
    _params: {
      filter?: 'treatment' | 'insurance' | 'all';
      value?: string;
      page?: number;
      results_count?: number;
      source?: string;
    },
  ) => {},
  facilityView: (_facilityId: string, _facilityName: string) => {},
  facilityContact: (_facilityId: string, _contactMethod: string) => {},
  phoneClick: (_location: string) => {},
  insuranceCheck: (_insuranceProvider: string) => {},
  navClick: (_navItem: string) => {},
  outboundClick: (_url: string, _linkText?: string) => {},
  error: (_errorType: string, _errorMessage: string) => {},
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
    // Still log 404s to the backend (first-party data, not GA)
    if (typeof window === 'undefined') return;
    const { path, search, referrer, viewport, userId, sessionId, httpMethod, hash, fullUrl } =
      _params;
    const lastSegment = path.split('/').pop() || '';
    const extMatch = lastSegment.match(/\.([a-zA-Z0-9]{2,5})$/);
    const assetExtension = extMatch ? `.${extMatch[1].toLowerCase()}` : null;
    const requestKind =
      assetExtension && assetExtension !== '.html' ? 'static_asset' : 'spa_route';
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
          .catch(() => {/* fire-and-forget */});
      })
      .catch(() => {/* ignore */});
  },
  notFoundSearchSubmit: (_params: {
    location?: string;
    treatment?: string;
    insurance?: string;
    sourcePath?: string;
    referrer?: string;
    viewport?: string;
    sessionId?: string | null;
    userId?: string | null;
  }) => {
    if (typeof window === 'undefined') return;
    import('@/integrations/supabase/client')
      .then(({ supabase }) => {
        supabase.functions
          .invoke('log-not-found-search', {
            body: {
              eventKind: 'submit',
              location: _params.location || null,
              treatment: _params.treatment || null,
              insurance: _params.insurance || null,
              sourcePath: _params.sourcePath || null,
              referrer: _params.referrer || null,
              viewport: _params.viewport || null,
              sessionId: _params.sessionId || null,
              userId: _params.userId || null,
            },
          })
          .catch(() => {/* fire-and-forget */});
      })
      .catch(() => {/* ignore */});
  },
  notFoundSearchZeroResults: (_params: {
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
    if (typeof window === 'undefined') return;
    import('@/integrations/supabase/client')
      .then(({ supabase }) => {
        supabase.functions
          .invoke('log-not-found-search', {
            body: {
              eventKind: 'zero_results',
              location: _params.location || null,
              treatment: _params.treatment || null,
              insurance: _params.insurance || null,
              resultsCount: _params.resultsCount,
              sourcePath: _params.sourcePath || null,
              referrer: _params.referrer || null,
              viewport: _params.viewport || null,
              sessionId: _params.sessionId || null,
              userId: _params.userId || null,
            },
          })
          .catch(() => {/* fire-and-forget */});
      })
      .catch(() => {/* ignore */});
  },
  viewSubscriptionPlan: (_planId: string, _planName: string, _price: number) => {},
  selectSubscriptionPlan: (_planId: string, _planName: string, _price: number) => {},
  beginSubscriptionCheckout: (_planId: string, _planName: string, _price: number, _promoCode?: string) => {},
  subscriptionPurchase: (
    _planId: string,
    _planName: string,
    _price: number,
    _transactionId?: string,
    _promoCode?: string,
  ) => {},
  subscriptionUpgrade: (_fromPlan: string, _toPlan: string, _newPrice: number) => {},
  subscriptionCancel: (_planId: string, _planName: string) => {},
  viewBillingPage: () => {},
  promoCodeApplied: (_promoCode: string, _discount: string, _planId: string) => {},
  checkoutAbandoned: (_planId: string, _planName: string, _price: number) => {},
  beginCreditPurchase: (_amountCents: number, _facilityId: string) => {},
  creditPurchaseComplete: (_amountCents: number) => {},
  leadUnlocked: (
    _leadId: string,
    _facilityId: string,
    _priceCents: number,
    _paymentMethod: string,
    _discountApplied?: boolean,
  ) => {},
  conciergeIntakeSubmitted: () => {},
  beginInternationalCheckout: (_country: string) => {},
  internationalPaymentComplete: (_sessionId: string) => {},
  placementFeeCharged: (
    _facilityId: string,
    _amountCents: number,
    _caseId: string,
    _isInternational?: boolean,
  ) => {},
  signupComplete: (_role: 'seeker' | 'provider', _method: string) => {},
  loginComplete: (_role: string, _method: string) => {},
};
