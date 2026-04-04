import { forwardRef, memo, SVGProps } from "react";
import logoDarkBg from "@/assets/logo-dark-bg.webp";
import { Link } from "react-router-dom";
import { Mail, MapPin, ChevronDown, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Popular locations for SEO
const popularLocations = [
  { name: "California", path: "/rehab-centers/california" },
  { name: "Florida", path: "/rehab-centers/florida" },
  { name: "Texas", path: "/rehab-centers/texas" },
  { name: "New York", path: "/rehab-centers/new-york" },
  { name: "Arizona", path: "/rehab-centers/arizona" },
  { name: "All States", path: "/locations", highlight: true },
];

// Treatment types for SEO
const treatmentTypes = [
  { name: "Detox Programs", path: "/treatment-types/detox-programs" },
  { name: "Inpatient Rehab", path: "/treatment-types/residential-inpatient" },
  { name: "Outpatient Programs", path: "/treatment-types/outpatient-programs" },
  { name: "Alcohol Rehab", path: "/treatment-types/alcohol-rehabilitation" },
  { name: "Dual Diagnosis", path: "/treatment-types/dual-diagnosis-treatment" },
  { name: "All Treatment Types", path: "/treatment-types", highlight: true },
];

// Resources
const resources = [
  { name: "Guides & Articles", path: "/resources" },
  { name: "Insurance Guide", path: "/insurance" },
  { name: "Cost Estimator", path: "/cost-estimator" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "FAQ", path: "/faq" },
  { name: "About Us", path: "/about" },
];

// International Rehab SEO links
const internationalLinks = [
  { name: "International Placement", path: "/international" },
  { name: "Rehab for UK Patients", path: "/us-rehab/uk-patients" },
  { name: "Rehab for Canadians", path: "/us-rehab/canadian-patients" },
  { name: "Travel to USA for Rehab", path: "/travel-to-usa-for-rehab" },
  { name: "International Admissions", path: "/can-foreigners-go-to-rehab-in-usa" },
  { name: "Cost of Rehab in USA", path: "/cost-of-rehab-in-usa-for-international-patients" },
];

// Company/Provider links
const providerLinks = [
  { name: "Why List With Us", path: "/for-providers" },
  { name: "Resource Hub", path: "/providers/resources" },
  { name: "Growth Guides", path: "/provider-guides/get-more-rehab-patients" },
  { name: "Marketing Strategies", path: "/provider-guides/rehab-marketing-strategies" },
  { name: "Lead Generation", path: "/provider-guides/addiction-treatment-lead-generation" },
  { name: "Provider FAQ", path: "/provider-faq" },
  { name: "List Your Facility", path: "/provider-signup", highlight: true },
];

// Social icons as inline SVGs with forwardRef for proper ref handling
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

// Footer link column component
interface FooterColumnProps {
  title: string;
  links: { name: string; path: string; highlight?: boolean }[];
}

const FooterColumn = memo(forwardRef<HTMLDivElement, FooterColumnProps>(function FooterColumn({ title, links }, ref) {
  return (
    <div ref={ref}>
      <p className="text-sm font-semibold text-primary-foreground uppercase tracking-wider mb-4" role="heading" aria-level={6}>
        {title}
      </p>
      <ul className="space-y-3">
        {links.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`text-sm transition-colors duration-200 ${
                item.highlight
                  ? "text-accent font-medium hover:text-accent/80 inline-flex items-center gap-1"
                  : "text-primary-foreground/70 hover:text-primary-foreground"
              }`}
            >
              {item.name}
              {item.highlight && <ExternalLink className="h-3 w-3" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}));
FooterColumn.displayName = "FooterColumn";

// Mobile accordion section
interface MobileAccordionProps {
  title: string;
  links: { name: string; path: string; highlight?: boolean }[];
}

const MobileAccordion = forwardRef<HTMLDetailsElement, MobileAccordionProps>(function MobileAccordion({ title, links }, ref) {
  return (
    <details ref={ref} className="group border-b border-primary-foreground/10 last:border-b-0">
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
        <h4 className="text-sm font-semibold text-primary-foreground">{title}</h4>
        <ChevronDown className="h-4 w-4 text-primary-foreground/60 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-4">
        <ul className="space-y-3">
          {links.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`text-sm transition-colors ${
                  item.highlight
                    ? "text-accent font-medium inline-flex items-center gap-1 hover:text-accent/80"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                {item.name}
                {item.highlight && <ExternalLink className="h-3 w-3" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
});

// Social link component
const socialLinks = [
  { Icon: XIcon, href: "https://x.com/rehablookup", label: "X (Twitter)" },
  { Icon: FacebookIcon, href: "https://facebook.com/rehablookup", label: "Facebook" },
  { Icon: InstagramIcon, href: "https://instagram.com/rehablookup", label: "Instagram" },
  { Icon: LinkedInIcon, href: "https://linkedin.com/company/rehablookup", label: "LinkedIn" },
];

export const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer Content */}
      <div className="container px-4 md:px-6 lg:px-8">
        {/* Desktop Layout */}
        <div className="hidden md:block py-8 lg:py-10">
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-3 space-y-4">
              <Link to="/" className="inline-block">
                <img
                  src={logoDarkBg}
                  alt="RehabLookup"
                  className="h-8 w-auto"
                  width={153}
                  height={32}
                  loading="lazy"
                />
              </Link>
              <p className="text-sm text-primary-foreground/70">
                Find trusted addiction treatment centers nationwide.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <a
                  href="mailto:help@rehablookup.com"
                  className="flex items-center gap-2.5 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  help@rehablookup.com
                </a>
                <div className="flex items-start gap-2.5 text-sm text-primary-foreground/70">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Nationwide Coverage</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center gap-2">
                {socialLinks.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-all duration-200"
                    aria-label={`Follow us on ${label}`}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            <div className="lg:col-span-2">
              <FooterColumn title="Locations" links={popularLocations} />
            </div>
            <div className="lg:col-span-2">
              <FooterColumn title="Treatment" links={treatmentTypes} />
            </div>
            <div className="lg:col-span-2">
              <FooterColumn title="Resources" links={resources} />
            </div>
            <div className="lg:col-span-1">
              <FooterColumn title="🌍 International" links={internationalLinks} />
            </div>
            <div className="lg:col-span-2">
              <FooterColumn title="For Providers" links={providerLinks} />
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {/* Brand Section */}
          <div className="py-6 text-center border-b border-primary-foreground/10">
            <Link to="/" className="inline-block mb-3">
              <img
                src={logoDarkBg}
                alt="RehabLookup"
                className="h-7 w-auto mx-auto"
                width={134}
                height={28}
                loading="lazy"
              />
            </Link>
            <p className="text-sm text-primary-foreground/70 mb-4">
              Find trusted addiction treatment centers nationwide.
            </p>

            {/* Contact */}
            <div className="flex flex-col items-center gap-2 mb-4">
              <a
                href="mailto:help@rehablookup.com"
                className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                help@rehablookup.com
              </a>
            </div>

            {/* Social Links */}
            <div className="flex items-center justify-center gap-2">
              {socialLinks.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground transition-all"
                  aria-label={`Follow us on ${label}`}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Accordion Links */}
          <div className="border-b border-primary-foreground/10">
            <MobileAccordion title="Locations" links={popularLocations} />
            <MobileAccordion title="Treatment Types" links={treatmentTypes} />
            <MobileAccordion title="Resources" links={resources} />
            <MobileAccordion title="For Providers" links={providerLinks} />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Copyright */}
            <p className="text-xs text-primary-foreground/60 text-center md:text-left">
              © {currentYear} RehabLookup. All rights reserved.
            </p>

            {/* Legal Links */}
            <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
              <Link
                to="/privacy-policy"
                className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms-of-service"
                className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                to="/contact"
                className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                Contact Us
              </Link>
              <a
                href="/sitemap.xml"
                className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sitemap
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
});
