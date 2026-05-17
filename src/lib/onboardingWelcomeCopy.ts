/**
 * Welcome modal copy. Lives in /lib so marketing can iterate
 * without touching component code.
 */

export interface ModalSection {
  label: string;
  href: string;
  description: string;
}

/** Sourced from the actual ProviderSidebar tile labels. */
export const DASHBOARD_SECTIONS: ModalSection[] = [
  { label: "Dashboard", href: "/provider/dashboard", description: "Lead volume, recent activity, and quick stats at a glance." },
  { label: "Leads",     href: "/provider/inquiries", description: "Inbox of inquiries from families. Reply within 24 hours to keep your response score up." },
  { label: "My Listing",href: "/provider/listings",  description: "Edit photos, services, insurance, and the description that families see." },
  { label: "Analytics", href: "/provider/analytics", description: "Profile views, search appearances, and where your inquiries are coming from." },
  { label: "Reviews",   href: "/provider/reviews",   description: "Verified reviews from past clients + your replies." },
  { label: "Subscription", href: "/provider/billing", description: "Plan, payment method, invoices, and Featured slot management." },
];

export const WELCOME_COPY = {
  freeOffer: {
    eyebrow: "Pro offer",
    title: "Try Pro free for 14 days",
    body:
      "10 photos, 1 facility video, lead analytics, priority placement on city + state pages. " +
      "No charge until your trial ends — cancel anytime.",
    cta: "Start free trial",
    /** True while we don't yet have a trial_period_days configured on
     *  the Stripe Pro product. When the trial is configured, flip this
     *  to false. Until then we render the button as "Upgrade to Pro"
     *  (no trial) per spec §9. */
    trialNotYetConfigured: true,
  },
  proOffer: {
    eyebrow: "Featured add-on",
    title: "Stand out with the Featured add-on",
    body:
      "Priority placement on the homepage and your state directory. Featured listings see 4x the " +
      "profile views of comparable non-Featured listings.",
    cta: "Add Featured",
  },
};
