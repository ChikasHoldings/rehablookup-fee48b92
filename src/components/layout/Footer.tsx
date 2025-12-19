import { Link } from "react-router-dom";
import { Heart, Mail, Shield, Clock, Facebook, Twitter, Instagram, Linkedin, ChevronRight, MapPin, Stethoscope, Phone } from "lucide-react";

const crisisHotlines = [
  { name: "SAMHSA Helpline", phone: "1-800-662-4357", description: "24/7, free, confidential" },
  { name: "988 Suicide & Crisis", phone: "988", description: "Call or text anytime" },
  { name: "Crisis Text Line", phone: "Text HOME to 741741", description: "Free 24/7 support" },
];

const footerLinks = {
  findHelp: [
    { label: "Find Rehab Centers", href: "/rehab-centers" },
    { label: "Browse Locations", href: "/locations" },
    { label: "Treatment Types", href: "/treatment-types" },
    { label: "Request Help", href: "/request-help?source=footer" },
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
    { label: "Provider Support", href: "/provider-support" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
  ],
};

const popularLocations = [
  // States
  { label: "California", href: "/locations/california", type: "state" },
  { label: "Florida", href: "/locations/florida", type: "state" },
  { label: "Texas", href: "/locations/texas", type: "state" },
  { label: "Arizona", href: "/locations/arizona", type: "state" },
  { label: "New York", href: "/locations/new-york", type: "state" },
  { label: "Colorado", href: "/locations/colorado", type: "state" },
];

const popularCities = [
  { label: "Los Angeles, CA", href: "/locations/california/los-angeles" },
  { label: "Miami, FL", href: "/locations/florida/miami" },
  { label: "Houston, TX", href: "/locations/texas/houston" },
  { label: "Phoenix, AZ", href: "/locations/arizona/phoenix" },
  { label: "New York City", href: "/locations/new-york/new-york-city" },
  { label: "Denver, CO", href: "/locations/colorado/denver" },
  { label: "San Diego, CA", href: "/locations/california/san-diego" },
  { label: "Tampa, FL", href: "/locations/florida/tampa" },
  { label: "Dallas, TX", href: "/locations/texas/dallas" },
  { label: "Scottsdale, AZ", href: "/locations/arizona/scottsdale" },
  { label: "Chicago, IL", href: "/locations/illinois/chicago" },
  { label: "Atlanta, GA", href: "/locations/georgia/atlanta" },
];

const treatmentTypes = [
  { label: "Medical Detox", href: "/treatment-types/medical-detox" },
  { label: "Residential Inpatient", href: "/treatment-types/residential-inpatient" },
  { label: "Outpatient Programs", href: "/treatment-types/outpatient-programs" },
  { label: "Dual Diagnosis", href: "/treatment-types/dual-diagnosis" },
  { label: "Alcohol Rehab", href: "/treatment-types/alcohol-rehabilitation" },
  { label: "Drug Addiction", href: "/treatment-types/drug-addiction" },
  { label: "Holistic Therapy", href: "/treatment-types/holistic-therapy" },
  { label: "Luxury Rehab", href: "/treatment-types/luxury-rehab" },
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
      {/* Main Footer */}
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-5">
            <Link to="/" className="inline-block">
              <img 
                src="/logo-dark.svg" 
                alt="Rehab-Lookup" 
                className="h-10 w-auto"
                loading="lazy"
              />
            </Link>
            <p className="text-sm text-primary-foreground/70 leading-relaxed max-w-xs">
              Connecting families with trusted treatment centers nationwide. Free, confidential support available 24/7.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
                <Shield className="h-4 w-4 text-accent" />
                <span>Verified Centers</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
                <Clock className="h-4 w-4 text-accent" />
                <span>24/7 Support</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2 pt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-primary-foreground/70 transition-all hover:bg-accent hover:text-accent-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
              {/* Find Help */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50 mb-4">
                  Find Help
                </h4>
                <ul className="space-y-2.5">
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

              {/* Resources */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50 mb-4">
                  Resources
                </h4>
                <ul className="space-y-2.5">
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

              {/* For Providers */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50 mb-4">
                  Providers
                </h4>
                <ul className="space-y-2.5">
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

              {/* Contact */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50 mb-4">
                  Contact
                </h4>
                <ul className="space-y-3">
                  <li>
                    <a 
                      href="mailto:help@rehablookup.com" 
                      className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                      <Mail className="h-4 w-4 text-accent" />
                      <span>help@rehablookup.com</span>
                    </a>
                  </li>
                  <li>
                    <Link 
                      to="/request-help?source=footer" 
                      className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                      <Heart className="h-4 w-4 text-accent" />
                      <span>Request Help</span>
                    </Link>
                  </li>
                  <li className="pt-2">
                    <Link
                      to="/request-help?source=footer_cta"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
                    >
                      Get Help Now
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Locations & Treatment Types - SEO Section */}
      <div className="border-t border-white/10">
        <div className="container py-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Popular States */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50">
                  Popular States
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularLocations.map((location) => (
                  <Link
                    key={location.href}
                    to={location.href}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                  >
                    {location.label}
                  </Link>
                ))}
                <Link
                  to="/locations"
                  className="rounded-full bg-accent/20 px-2.5 py-1 text-xs text-accent hover:bg-accent/30 transition-colors"
                >
                  All →
                </Link>
              </div>
            </div>

            {/* Popular Cities */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50">
                  Popular Cities
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularCities.map((city) => (
                  <Link
                    key={city.href}
                    to={city.href}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                  >
                    {city.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Treatment Types */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/50">
                  Treatment Types
                </h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {treatmentTypes.map((treatment) => (
                  <Link
                    key={treatment.href}
                    to={treatment.href}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground transition-colors"
                  >
                    {treatment.label}
                  </Link>
                ))}
                <Link
                  to="/treatment-types"
                  className="rounded-full bg-accent/20 px-2.5 py-1 text-xs text-accent hover:bg-accent/30 transition-colors"
                >
                  All →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crisis Hotlines Section */}
      <div className="border-t border-white/10 bg-destructive/10">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-primary-foreground">
                Need Immediate Help?
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              {crisisHotlines.map((hotline) => (
                <div key={hotline.name} className="flex items-center gap-2">
                  <a
                    href={hotline.phone.startsWith("Text") ? undefined : `tel:${hotline.phone.replace(/-/g, "")}`}
                    className="text-sm font-medium text-primary-foreground hover:text-accent transition-colors"
                  >
                    {hotline.name}: <span className="text-accent">{hotline.phone}</span>
                  </a>
                  <span className="hidden md:inline text-xs text-primary-foreground/50">
                    ({hotline.description})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-primary-foreground/50">
              <span>© {new Date().getFullYear()} RehabLookup</span>
              <span className="hidden sm:inline">•</span>
              {footerLinks.legal.map((link, index) => (
                <span key={link.href} className="flex items-center gap-x-4">
                  <Link to={link.href} className="hover:text-primary-foreground transition-colors">
                    {link.label}
                  </Link>
                  {index < footerLinks.legal.length - 1 && <span className="hidden sm:inline">•</span>}
                </span>
              ))}
            </div>
            <p className="text-xs text-primary-foreground/40 max-w-md md:text-right">
              RehabLookup is a directory service. We are not a treatment provider.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
