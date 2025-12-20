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
};
