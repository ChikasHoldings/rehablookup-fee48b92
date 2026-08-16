import { forwardRef, memo, SVGProps, useState, useCallback } from "react";
import logoDarkBg from "@/assets/logo-dark-bg.webp";
import { Link } from "react-router-dom";
import { Mail, ChevronDown, ArrowRight, Heart, MapPin, Scale } from "lucide-react";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface FooterLink {
  name: string;
  path: string;
  badge?: string; // e.g. "New", "Popular"
  highlight?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

// ─── LINK DATA ─────────────────────────────────────────────────────────────────

// ─── FOOTER IA ─────────────────────────────────────────────────────────────────
//
// Five sections, mirroring the header's directory jobs. Rules for anything
// added here (enforced by src/__tests__/public-navigation-contract.test.tsx):
//
//   • canonical destinations only — never a redirect source
//     (/search-results, not /rehab-centers; /provider-resources, not
//     /providers/resources)
//   • no retired placement / matching / concierge / VOB destinations or copy
//   • public site map only — authenticated seeker features (Saved Searches)
//     belong in the account experience, not here
//
// Deliberately removed in the pre-merge navigation cutover:
//   "Featured Programs" and "International Rehab" as standalone sections (the
//   underlying /us-rehab/* and /international SEO pages remain live and
//   indexable, they are simply no longer global-nav categories);
//   "Verify My Insurance" → /insurance-verification; "Saved Searches";
//   "How It Works" (page still carries retired operational copy — see
//   docs/directory-cutover-premerge-public-navigation.md).

const findTreatmentLinks: FooterLink[] = [
  { name: "Search Treatment Centers", path: "/search-results" },
  { name: "Compare Facilities", path: "/compare" },
  { name: "Drug Rehab Near Me", path: "/drug-rehab-near-me" },
  { name: "Alcohol Rehab Near Me", path: "/alcohol-rehab-near-me" },
  { name: "Detox Near Me", path: "/detox-near-me" },
  { name: "California", path: "/rehab-centers/california" },
  { name: "Florida", path: "/rehab-centers/florida" },
  { name: "Texas", path: "/rehab-centers/texas" },
  { name: "New York", path: "/rehab-centers/new-york" },
  { name: "Browse All States", path: "/locations", highlight: true },
];

const treatmentInsuranceLinks: FooterLink[] = [
  { name: "Detox Programs", path: "/treatment-types/detox-programs" },
  { name: "Inpatient Rehab", path: "/treatment-types/residential-inpatient" },
  { name: "Outpatient Programs", path: "/treatment-types/outpatient-programs" },
  { name: "Dual Diagnosis", path: "/treatment-types/dual-diagnosis-treatment" },
  { name: "All Treatment Types", path: "/treatment-types", highlight: true },
  { name: "Aetna Coverage", path: "/insurance/aetna-rehab" },
  { name: "Blue Cross Blue Shield", path: "/insurance/bcbs-treatment" },
  { name: "Cigna Rehab Coverage", path: "/insurance/cigna-rehab" },
  { name: "UnitedHealthcare", path: "/insurance/united-healthcare-rehab" },
  { name: "Medicaid", path: "/insurance/medicaid-rehab" },
  { name: "Insurance Hub", path: "/insurance", highlight: true },
];

const resourceLinks: FooterLink[] = [
  { name: "Guides & Articles", path: "/resources" },
  // Phase AD: link directly at the canonical published articles (the
  // legacy hand-picked slugs above didn't exist in blog_articles and
  // were silently redirecting to /resources, which masked them as
  // 404s once we removed the silent redirect in phase AA).
  { name: "Signs of Addiction", path: "/resources/youth-addiction-warning-signs" },
  { name: "Withdrawal Timeline", path: "/resources/drug-withdrawal-symptoms-timeline" },
  { name: "Insurance Appeals", path: "/resources/insurance-appeal-rehab-denial" },
  { name: "Paying for Rehab", path: "/resources/how-much-does-rehab-cost-per-day" },
  { name: "Detox Timeline", path: "/resources/detox-timeline" },
  { name: "Cost Estimator", path: "/cost-estimator" },
  { name: "General FAQ", path: "/faq" },
  // Secondary informational link only. /international is a directory-oriented
  // overview page (its placement/application funnel was retired in stage 1);
  // it is NOT an admissions or application CTA, and the retired
  // /international/apply|intake|thank-you routes are not linked anywhere.
  { name: "International Patients", path: "/international" },
];

const providerLinks: FooterLink[] = [
  { name: "Why List With Us", path: "/for-providers" },
  { name: "Provider Resources", path: "/provider-resources" },
  { name: "Provider FAQ", path: "/provider-faq" },
  { name: "Provider Support", path: "/provider-support" },
  { name: "List Your Facility", path: "/provider/onboarding", highlight: true },
];

const companyLinks: FooterLink[] = [
  { name: "About Us", path: "/about" },
  { name: "How We Make Money", path: "/how-we-make-money" },
  { name: "Contact Us", path: "/contact" },
  { name: "Editorial Team", path: "/authors" },
  { name: "Editorial Policy", path: "/editorial-policy" },
  { name: "Medical Disclaimer", path: "/medical-disclaimer" },
];

// Popular city markets — the directory-style "browse by city" strip
// (Healthgrades / Yelp pattern). Slugs match registered routes in
// rehab-centers/:state/:city and the city entries in locationSeoData.
const popularCities: { name: string; state: string; href: string }[] = [
  { name: "Los Angeles",   state: "CA", href: "/rehab-centers/california/los-angeles" },
  { name: "New York City", state: "NY", href: "/rehab-centers/new-york/new-york-city" },
  { name: "Chicago",       state: "IL", href: "/rehab-centers/illinois/chicago" },
  { name: "Houston",       state: "TX", href: "/rehab-centers/texas/houston" },
  { name: "Phoenix",       state: "AZ", href: "/rehab-centers/arizona/phoenix" },
  { name: "Philadelphia",  state: "PA", href: "/rehab-centers/pennsylvania/philadelphia" },
  { name: "San Antonio",   state: "TX", href: "/rehab-centers/texas/san-antonio" },
  { name: "San Diego",     state: "CA", href: "/rehab-centers/california/san-diego" },
  { name: "Dallas",        state: "TX", href: "/rehab-centers/texas/dallas" },
  { name: "Austin",        state: "TX", href: "/rehab-centers/texas/austin" },
  { name: "Jacksonville",  state: "FL", href: "/rehab-centers/florida/jacksonville" },
  { name: "San Francisco", state: "CA", href: "/rehab-centers/california/san-francisco" },
  { name: "Miami",         state: "FL", href: "/rehab-centers/florida/miami" },
  { name: "Atlanta",       state: "GA", href: "/rehab-centers/georgia/atlanta" },
  { name: "Boston",        state: "MA", href: "/rehab-centers/massachusetts/boston" },
  { name: "Seattle",       state: "WA", href: "/rehab-centers/washington/seattle" },
  { name: "Denver",        state: "CO", href: "/rehab-centers/colorado/denver" },
  { name: "Las Vegas",     state: "NV", href: "/rehab-centers/nevada/las-vegas" },
  { name: "Nashville",     state: "TN", href: "/rehab-centers/tennessee/nashville" },
  { name: "Portland",      state: "OR", href: "/rehab-centers/oregon/portland" },
];

const allSections: FooterSection[] = [
  { title: "Find Treatment", links: findTreatmentLinks },
  { title: "Treatment & Insurance", links: treatmentInsuranceLinks },
  { title: "Resources", links: resourceLinks },
  { title: "For Providers", links: providerLinks },
  { title: "Company", links: companyLinks },
];

// ─── SOCIAL ICONS ──────────────────────────────────────────────────────────────

const XIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
));
XIcon.displayName = "XIcon";

const FacebookIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
));
FacebookIcon.displayName = "FacebookIcon";

const InstagramIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" {...props}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
));
InstagramIcon.displayName = "InstagramIcon";

const LinkedInIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg ref={ref} viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
));
LinkedInIcon.displayName = "LinkedInIcon";

const socialLinks = [
  { Icon: XIcon, href: "https://x.com/rehablookup", label: "X (Twitter)" },
  { Icon: FacebookIcon, href: "https://facebook.com/rehablookup", label: "Facebook" },
  { Icon: InstagramIcon, href: "https://instagram.com/rehablookup", label: "Instagram" },
  { Icon: LinkedInIcon, href: "https://linkedin.com/company/rehablookup", label: "LinkedIn" },
];

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

const FooterLinkItem = memo(function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <li>
      <Link
        to={link.path}
        className={`inline-flex items-center gap-1.5 text-sm leading-relaxed transition-colors duration-150 ${
          link.highlight
            ? "text-accent font-medium hover:text-accent/80"
            : "text-primary-foreground/55 hover:text-primary-foreground"
        }`}
      >
        {link.highlight && <ArrowRight className="h-3 w-3" />}
        <span>{link.name}</span>
        {link.badge && (
          <span className="ml-1 inline-flex items-center rounded-full bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent leading-none">
            {link.badge}
          </span>
        )}
      </Link>
    </li>
  );
});

const FooterColumn = memo(function FooterColumn({ title, links }: FooterSection) {
  return (
    <div>
      <h3 className="text-xs font-bold text-primary-foreground/80 uppercase tracking-[0.15em] mb-4">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <FooterLinkItem key={link.path} link={link} />
        ))}
      </ul>
    </div>
  );
});

const MobileAccordion = memo(function MobileAccordion({ title, links }: FooterSection) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(p => !p), []);

  return (
    <div className="border-b border-primary-foreground/[0.06]">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between py-3.5 text-left"
        aria-expanded={open}
        aria-label={`Toggle ${title} menu`}
      >
        <span className="text-[15px] font-semibold text-primary-foreground/90">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-primary-foreground/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${
          open ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-2.5">
            {links.map((link) => (
              <FooterLinkItem key={link.path} link={link} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
});

// ─── BRAND STRIP ───────────────────────────────────────────────────────────────
//
// The trust-badge row that used to sit here ("HIPAA Compliant", "Verified
// Facilities", "International Support", "24/7 Support") was removed wholesale
// rather than trimmed.
//
//   • "International Support" and "24/7 Support" described a global
//     treatment-navigation service RehabLookup no longer operates.
//   • "Verified Facilities" and "HIPAA Compliant" read as blanket guarantees
//     about every listing and every interaction on the site. The data contract
//     does not support either as a GLOBAL claim, and a footer badge is exactly
//     where a visitor reads it as one.
//
// Nothing was invented to fill the space: what replaces it is a plain
// description of what the product does.
const DIRECTORY_BLURB =
  "Search and compare addiction treatment centers across the United States, then contact the facilities you choose directly.";

// ─── MAIN FOOTER ───────────────────────────────────────────────────────────────

export const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground" role="contentinfo">
      {/* ── CTA Strip ──────────────────────────────────────────────── */}
      <div className="border-b border-primary-foreground/[0.08]">
        <div className="container px-5 md:px-6 lg:px-8">
          <div className="py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 shrink-0">
                <Heart className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-primary-foreground leading-tight">
                  Looking for a Treatment Center?
                </p>
                <p className="text-[13px] text-primary-foreground/70 mt-0.5 leading-snug">
                  Search and compare licensed U.S. addiction-treatment providers, then contact them directly.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Link
                to="/search-results"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 transition-all duration-150"
              >
                Search Treatment Centers <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/compare"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-foreground/15 px-5 py-2.5 text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 hover:text-primary-foreground transition-all duration-150"
              >
                <Scale className="h-3.5 w-3.5" /> Compare Facilities
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Popular Cities Strip ──────────────────────────────────────
          Healthgrades / Yelp directory pattern: surface top markets
          inline so visitors can browse by city without scrolling
          through the full state list. Wraps on mobile, stays single
          row on wider viewports.                                  */}
      <div className="border-b border-primary-foreground/[0.06]">
        <div className="container px-5 md:px-6 lg:px-8">
          <div className="py-5 flex flex-col md:flex-row md:items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent shrink-0">
              <MapPin className="h-3 w-3" /> Popular Cities
            </span>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
              {popularCities.map((c, i) => (
                <li key={c.href} className="inline-flex items-center gap-3">
                  <Link
                    to={c.href}
                    className="text-[13px] text-primary-foreground/65 hover:text-primary-foreground transition-colors whitespace-nowrap"
                  >
                    {c.name}, <span className="text-primary-foreground/45">{c.state}</span>
                  </Link>
                  {i < popularCities.length - 1 && (
                    <span aria-hidden className="text-primary-foreground/20 text-[10px]">·</span>
                  )}
                </li>
              ))}
              <li className="inline-flex">
                <Link
                  to="/locations"
                  className="text-[13px] text-accent hover:text-accent/80 font-medium whitespace-nowrap inline-flex items-center gap-1"
                >
                  All 50 states <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Desktop Grid ───────────────────────────────────────────── */}
      <div className="container px-5 md:px-6 lg:px-8">
        <div className="hidden md:block py-12">
          {/* 3 columns on md (2 rows), all 5 sections in one row on lg.
              Single source of truth with the mobile accordions below. */}
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10">
            {allSections.map((section) => (
              <FooterColumn key={section.title} {...section} />
            ))}
          </div>
        </div>

        {/* ── Mobile Layout ───────────────────────────────────────── */}
        <div className="md:hidden py-6 px-1">
          {allSections.map((section) => (
            <MobileAccordion key={section.title} {...section} />
          ))}
        </div>
      </div>

      {/* ── Trust + Brand Bar ──────────────────────────────────────── */}
      <div className="border-t border-primary-foreground/[0.06]">
        <div className="container px-5 md:px-6 lg:px-8">
          <div className="py-8 flex flex-col items-center text-center lg:flex-row lg:items-center lg:justify-between lg:text-left gap-6">
            {/* Brand */}
            <div className="flex flex-col items-center lg:flex-row lg:items-center gap-4">
              <Link to="/" className="inline-block shrink-0">
                <img
                  src={logoDarkBg}
                  alt="RehabLookup — Addiction Treatment Directory"
                  className="h-7 w-auto"
                  width={400}
                  height={67}
                  loading="lazy"
                />
              </Link>
              <div className="h-5 w-px bg-primary-foreground/10 hidden lg:block" />
              <p className="text-sm text-primary-foreground/70 leading-snug max-w-md">
                {DIRECTORY_BLURB}
              </p>
            </div>

            <Link
              to="/how-we-make-money"
              className="text-xs font-medium text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors whitespace-nowrap"
            >
              How we make money
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ─────────────────────────────────────────────── */}
      <div className="border-t border-primary-foreground/[0.06] safe-area-bottom">
        <div className="container px-5 md:px-6 lg:px-8">
          <div className="py-4 flex flex-col items-center text-center gap-3 md:flex-row md:items-center md:justify-between md:text-left">
            {/* Left: Copyright + Legal */}
            <div className="flex flex-col items-center md:flex-row md:items-center gap-2 md:gap-4">
              <p className="text-xs text-primary-foreground/70">
                © {currentYear} RehabLookup. All rights reserved. Not a medical provider.
              </p>
              <nav className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { to: "/privacy-policy", label: "Privacy Policy" },
                  { to: "/terms-of-service", label: "Terms of Service" },
                  { to: "/editorial-policy", label: "Editorial Policy" },
                  { to: "/medical-disclaimer", label: "Medical Disclaimer" },
                  { to: "/contact", label: "Contact" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-xs text-primary-foreground/70 hover:text-primary-foreground/90 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
                <a
                  href="/sitemap.xml"
                  className="text-xs text-primary-foreground/70 hover:text-primary-foreground/90 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sitemap
                </a>
              </nav>
            </div>

            {/* Right: Social + Contact */}
            <div className="flex items-center justify-center gap-3">
              <a
                href="mailto:help@rehablookup.com"
                className="text-xs text-primary-foreground/70 hover:text-primary-foreground/90 transition-colors hidden sm:inline-flex items-center gap-1"
              >
                <Mail className="h-3 w-3" /> help@rehablookup.com
              </a>
              <div className="h-3.5 w-px bg-primary-foreground/10 hidden sm:block" />
              <div className="flex items-center gap-1">
                {socialLinks.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-primary-foreground/35 hover:bg-primary-foreground/8 hover:text-primary-foreground/70 transition-all duration-150"
                    aria-label={`Follow us on ${label}`}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});
