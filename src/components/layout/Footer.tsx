import { forwardRef, memo, SVGProps, useState, useCallback } from "react";
import logoDarkBg from "@/assets/logo-dark-bg.webp";
import { Link } from "react-router-dom";
import { Mail, ChevronDown, ArrowRight, Globe, Heart, Phone, Shield, Star } from "lucide-react";

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

const locationLinks: FooterLink[] = [
  { name: "California", path: "/rehab-centers/california", badge: "Popular" },
  { name: "Florida", path: "/rehab-centers/florida", badge: "Popular" },
  { name: "Texas", path: "/rehab-centers/texas" },
  { name: "New York", path: "/rehab-centers/new-york" },
  { name: "Arizona", path: "/rehab-centers/arizona" },
  { name: "Colorado", path: "/rehab-centers/colorado" },
  { name: "Ohio", path: "/rehab-centers/ohio" },
  { name: "Pennsylvania", path: "/rehab-centers/pennsylvania" },
  { name: "View All States →", path: "/locations", highlight: true },
];

const treatmentLinks: FooterLink[] = [
  { name: "Detox Programs", path: "/treatment-types/detox-programs" },
  { name: "Inpatient Rehab", path: "/treatment-types/residential-inpatient" },
  { name: "Outpatient Programs", path: "/treatment-types/outpatient-programs" },
  { name: "Alcohol Rehabilitation", path: "/treatment-types/alcohol-rehabilitation" },
  { name: "Drug Addiction Treatment", path: "/treatment-types/drug-addiction-treatment" },
  { name: "Dual Diagnosis", path: "/treatment-types/dual-diagnosis-treatment" },
  { name: "Holistic Therapy", path: "/treatment-types/holistic-therapy" },
  { name: "Luxury Rehab", path: "/treatment-types/luxury-rehab" },
  { name: "All Treatment Types", path: "/treatment-types", highlight: true },
];

const insuranceLinks: FooterLink[] = [
  { name: "Aetna Coverage", path: "/insurance/aetna-rehab" },
  { name: "Blue Cross Blue Shield", path: "/insurance/bcbs-treatment" },
  { name: "Cigna Rehab Coverage", path: "/insurance/cigna-rehab" },
  { name: "UnitedHealthcare", path: "/insurance/united-healthcare-rehab" },
  { name: "Humana", path: "/insurance/humana-rehab" },
  { name: "Medicare", path: "/insurance/medicare-rehab" },
  { name: "Medicaid", path: "/insurance/medicaid-rehab" },
  { name: "Anthem", path: "/insurance/anthem-rehab" },
  { name: "All Insurance Plans", path: "/insurance", highlight: true },
];

const programLinks: FooterLink[] = [
  { name: "Best Rehab in USA", path: "/us-rehab/best-rehab-usa", badge: "Top" },
  { name: "Luxury Rehab America", path: "/us-rehab/luxury-rehab-america" },
  { name: "Private Rehab USA", path: "/us-rehab/private-rehab-america" },
  { name: "Executive Rehab", path: "/us-rehab/executive-rehab" },
  { name: "Affordable Rehab", path: "/affordable-rehab-in-usa" },
  { name: "Fast Admission", path: "/fast-admission-rehab-usa" },
  { name: "Same-Day Detox", path: "/same-day-detox-usa" },
  { name: "Top Detox Centers", path: "/top-detox-centers-usa" },
];

const internationalLinks: FooterLink[] = [
  { name: "International Placement", path: "/international", badge: "Hub" },
  { name: "UK & Ireland Patients", path: "/us-rehab/uk-patients" },
  { name: "Canadian Patients", path: "/us-rehab/canadian-patients" },
  { name: "European Patients", path: "/us-rehab/european-patients" },
  { name: "UAE & Middle East", path: "/us-rehab/uae-middle-east" },
  { name: "Australian Patients", path: "/us-rehab/australian-patients" },
  { name: "Travel to USA for Rehab", path: "/travel-to-usa-for-rehab" },
  { name: "International Costs", path: "/cost-of-rehab-in-usa-for-international-patients" },
  { name: "International Admissions", path: "/can-foreigners-go-to-rehab-in-usa" },
];

const resourceLinks: FooterLink[] = [
  { name: "Guides & Articles", path: "/resources" },
  { name: "Signs of Addiction", path: "/resources/signs-of-addiction" },
  { name: "What to Expect in Rehab", path: "/resources/what-to-expect-in-rehab" },
  { name: "Insurance Coverage Guide", path: "/resources/insurance-coverage-guide" },
  { name: "Paying for Rehab", path: "/resources/paying-for-rehab" },
  { name: "Detox Timeline", path: "/resources/detox-timeline" },
  { name: "Cost Estimator", path: "/cost-estimator" },
  { name: "General FAQ", path: "/faq" },
];

const providerLinks: FooterLink[] = [
  { name: "Why List With Us", path: "/for-providers" },
  { name: "Provider Resources", path: "/providers/resources" },
  { name: "Growth Guides", path: "/provider-guides/get-more-rehab-patients" },
  { name: "Marketing Strategies", path: "/provider-guides/rehab-marketing-strategies" },
  { name: "Lead Generation", path: "/provider-guides/addiction-treatment-lead-generation" },
  { name: "Provider FAQ", path: "/provider-faq" },
  { name: "List Your Facility", path: "/provider-signup", highlight: true },
];

const companyLinks: FooterLink[] = [
  { name: "About Us", path: "/about" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Contact Us", path: "/contact" },
  { name: "Treatment Placement", path: "/concierge" },
  { name: "Blog", path: "/blog" },
];

const allSections: FooterSection[] = [
  { title: "Find by State", links: locationLinks },
  { title: "Treatment Types", links: treatmentLinks },
  { title: "Insurance Coverage", links: insuranceLinks },
  { title: "Featured Programs", links: programLinks },
  { title: "International Rehab", links: internationalLinks },
  { title: "Resources & Guides", links: resourceLinks },
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

// ─── TRUST BADGES ──────────────────────────────────────────────────────────────

const trustBadges = [
  { icon: Shield, label: "HIPAA Compliant" },
  { icon: Star, label: "Verified Facilities" },
  { icon: Globe, label: "International Support" },
  { icon: Phone, label: "24/7 Support" },
];

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
                  Need Help Finding the Right Treatment?
                </p>
                <p className="text-[13px] text-primary-foreground/50 mt-0.5 leading-snug">
                  Our specialists match you with verified, accredited U.S. facilities — confidentially.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <Link
                to="/concierge"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 transition-all duration-150"
              >
                Get Matched Now <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/international"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-foreground/15 px-5 py-2.5 text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/5 hover:text-primary-foreground transition-all duration-150"
              >
                <Globe className="h-3.5 w-3.5" /> International Patients
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop Grid ───────────────────────────────────────────── */}
      <div className="container px-5 md:px-6 lg:px-8">
        <div className="hidden md:block py-12">
          {/* 4 columns on md, 4 on lg with 2-row layout = 8 sections */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            <FooterColumn title="Find by State" links={locationLinks} />
            <FooterColumn title="Treatment Types" links={treatmentLinks} />
            <FooterColumn title="Insurance Coverage" links={insuranceLinks} />
            <FooterColumn title="Featured Programs" links={programLinks} />
            <FooterColumn title="International Rehab" links={internationalLinks} />
            <FooterColumn title="Resources & Guides" links={resourceLinks} />
            <FooterColumn title="For Providers" links={providerLinks} />
            <FooterColumn title="Company" links={companyLinks} />
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
          <div className="py-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Brand */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to="/" className="inline-block shrink-0">
                <img
                  src={logoDarkBg}
                  alt="RehabLookup — Find Trusted Addiction Treatment Centers"
                  className="h-7 w-auto"
                  width={134}
                  height={28}
                  loading="lazy"
                />
              </Link>
              <div className="h-5 w-px bg-primary-foreground/10 hidden sm:block" />
              <p className="text-sm text-primary-foreground/45 leading-snug max-w-xs">
                Find trusted, accredited addiction treatment centers across the United States.
              </p>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-4">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-primary-foreground/40">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ─────────────────────────────────────────────── */}
      <div className="border-t border-primary-foreground/[0.06]">
        <div className="container px-5 md:px-6 lg:px-8">
          <div className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Left: Copyright + Legal */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-xs text-primary-foreground/40">
                © {currentYear} RehabLookup. All rights reserved. Not a medical provider.
              </p>
              <nav className="flex items-center gap-3">
                {[
                  { to: "/privacy-policy", label: "Privacy Policy" },
                  { to: "/terms-of-service", label: "Terms of Service" },
                  { to: "/contact", label: "Contact" },
                ].map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-xs text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
                <a
                  href="/sitemap.xml"
                  className="text-[11px] text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sitemap
                </a>
              </nav>
            </div>

            {/* Right: Social + Contact */}
            <div className="flex items-center gap-3">
              <a
                href="mailto:help@rehablookup.com"
                className="text-[11px] text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors hidden sm:inline-flex items-center gap-1"
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
