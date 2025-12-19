import { Link } from "react-router-dom";
import { Mail, Shield, Clock, Facebook, Twitter, Instagram, Linkedin, MapPin, Phone, CreditCard } from "lucide-react";

const crisisHotlines = [
  { name: "SAMHSA", phone: "1-800-662-4357", description: "24/7 free & confidential" },
  { name: "988 Crisis Line", phone: "988", description: "Call or text" },
  { name: "Crisis Text", phone: "Text HOME to 741741", description: "24/7 support" },
];

const footerLinks = {
  findHelp: [
    { label: "Find Rehab Centers", href: "/rehab-centers" },
    { label: "Browse by Location", href: "/locations" },
    { label: "Treatment Types", href: "/treatment-types" },
    { label: "Request Help", href: "/request-help?source=footer" },
    { label: "How It Works", href: "/how-it-works" },
  ],
  resources: [
    { label: "Recovery Resources", href: "/resources" },
    { label: "FAQ", href: "/faq" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  providers: [
    { label: "List Your Facility", href: "/for-providers" },
    { label: "Provider Resources", href: "/provider-resources" },
    { label: "Provider Login", href: "/provider-login" },
    { label: "Provider FAQ", href: "/provider-faq" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
  ],
};

const popularStates = [
  "California", "Florida", "Texas", "Arizona", "New York", "Colorado",
  "Pennsylvania", "Ohio", "Illinois", "Georgia", "New Jersey", "Massachusetts",
  "Washington", "Tennessee", "North Carolina", "Michigan",
];

const popularCities = [
  { label: "Los Angeles", href: "/locations/california/los-angeles" },
  { label: "Miami", href: "/locations/florida/miami" },
  { label: "Houston", href: "/locations/texas/houston" },
  { label: "Phoenix", href: "/locations/arizona/phoenix" },
  { label: "New York City", href: "/locations/new-york/new-york-city" },
  { label: "Denver", href: "/locations/colorado/denver" },
  { label: "San Diego", href: "/locations/california/san-diego" },
  { label: "Chicago", href: "/locations/illinois/chicago" },
  { label: "Atlanta", href: "/locations/georgia/atlanta" },
  { label: "Dallas", href: "/locations/texas/dallas" },
];

const treatmentTypes = [
  { label: "Medical Detox", href: "/treatment-types/medical-detox" },
  { label: "Inpatient Rehab", href: "/treatment-types/residential-inpatient" },
  { label: "Outpatient", href: "/treatment-types/outpatient-programs" },
  { label: "Dual Diagnosis", href: "/treatment-types/dual-diagnosis" },
  { label: "Alcohol Rehab", href: "/treatment-types/alcohol-rehabilitation" },
  { label: "Drug Treatment", href: "/treatment-types/drug-addiction" },
  { label: "Holistic", href: "/treatment-types/holistic-therapy" },
  { label: "Luxury Rehab", href: "/treatment-types/luxury-rehab" },
];

const insuranceTypes = [
  "Medicaid", "Medicare", "Blue Cross", "Aetna", "Cigna", "United", "Self-Pay"
];

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Crisis Hotlines - Top Priority */}
      <div className="bg-destructive/15 border-b border-white/10">
        <div className="container py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-8">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-primary-foreground">
                Immediate Help:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {crisisHotlines.map((hotline) => (
                <a
                  key={hotline.name}
                  href={hotline.phone.startsWith("Text") ? undefined : `tel:${hotline.phone.replace(/-/g, "")}`}
                  className="text-sm text-primary-foreground/90 hover:text-accent transition-colors"
                >
                  <span className="font-medium">{hotline.name}:</span>{" "}
                  <span className="text-accent font-semibold">{hotline.phone}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-12 md:py-14">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-3 space-y-5">
            <Link to="/" className="inline-block">
              <img 
                src="/logo-dark.svg" 
                alt="RehabLookup" 
                className="h-12 w-auto"
                loading="lazy"
              />
            </Link>
            
            <div className="space-y-3">
              <a 
                href="mailto:help@rehablookup.com" 
                className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <Mail className="h-4 w-4 text-accent" />
                help@rehablookup.com
              </a>
              <div className="flex items-center gap-3 text-xs text-primary-foreground/50">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-accent" />
                  <span>Verified</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  <span>24/7</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-primary-foreground/60 transition-all hover:bg-accent hover:text-accent-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-9">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:grid-cols-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40 mb-3">
                  Find Help
                </h4>
                <ul className="space-y-2">
                  {footerLinks.findHelp.map((link) => (
                    <li key={link.href}>
                      <Link 
                        to={link.href} 
                        className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40 mb-3">
                  Treatment
                </h4>
                <ul className="space-y-2">
                  {treatmentTypes.map((type) => (
                    <li key={type.href}>
                      <Link 
                        to={type.href} 
                        className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                      >
                        {type.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40 mb-3">
                  Resources
                </h4>
                <ul className="space-y-2">
                  {footerLinks.resources.map((link) => (
                    <li key={link.href}>
                      <Link 
                        to={link.href} 
                        className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40 mb-3">
                  For Providers
                </h4>
                <ul className="space-y-2">
                  {footerLinks.providers.map((link) => (
                    <li key={link.href}>
                      <Link 
                        to={link.href} 
                        className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Links Section */}
      <div className="border-t border-white/10 bg-white/[0.02]">
        <div className="container py-8">
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-3">
            {/* States */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40">
                  States
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularStates.map((state) => (
                  <Link
                    key={state}
                    to={`/locations/${state.toLowerCase().replace(/\s+/g, '-')}`}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                  >
                    {state}
                  </Link>
                ))}
                <Link
                  to="/locations"
                  className="rounded-full bg-accent/20 px-2.5 py-1 text-xs text-accent hover:bg-accent/30 transition-colors font-medium"
                >
                  All States →
                </Link>
              </div>
            </div>

            {/* Cities */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40">
                  Cities
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularCities.map((city) => (
                  <Link
                    key={city.href}
                    to={city.href}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                  >
                    {city.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Insurance */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/40">
                  Insurance
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {insuranceTypes.map((insurance) => (
                  <Link
                    key={insurance}
                    to={`/rehab-centers?insurance=${insurance.toLowerCase().replace(/\s+/g, '-')}`}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                  >
                    {insurance}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary-foreground/40">
              <span>© {new Date().getFullYear()} RehabLookup</span>
              {footerLinks.legal.map((link) => (
                <Link key={link.href} to={link.href} className="hover:text-primary-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="text-xs text-primary-foreground/30">
              Directory service only. Not a treatment provider.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}