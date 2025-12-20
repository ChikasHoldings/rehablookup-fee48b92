import { Link } from "react-router-dom";
import { Heart, Mail, Facebook, Twitter, Instagram, Linkedin, ArrowRight, BookOpen, Phone, MapPin, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// SEO-friendly articles for footer
const featuredArticles = [
  {
    title: "Understanding the Different Types of Addiction Treatment",
    slug: "/resources/types-of-addiction-treatment",
    category: "Treatment Guide",
  },
  {
    title: "How to Choose the Right Rehab Center for Your Needs",
    slug: "/resources/choosing-rehab-center",
    category: "Getting Started",
  },
  {
    title: "What to Expect During Your First Week of Treatment",
    slug: "/resources/first-week-treatment",
    category: "Recovery Tips",
  },
  {
    title: "Insurance Coverage for Addiction Treatment Explained",
    slug: "/resources/insurance-coverage-guide",
    category: "Insurance",
  },
];

// Popular locations for SEO - using correct route pattern /rehab-centers/:state/:city
const popularLocations = [
  { name: "California", slug: "california", path: "/rehab-centers/california", cities: [
    { name: "Los Angeles", slug: "los-angeles" },
    { name: "San Diego", slug: "san-diego" },
    { name: "San Francisco", slug: "san-francisco" },
  ]},
  { name: "Florida", slug: "florida", path: "/rehab-centers/florida", cities: [
    { name: "Miami", slug: "miami" },
    { name: "Tampa", slug: "tampa" },
    { name: "Orlando", slug: "orlando" },
  ]},
  { name: "Texas", slug: "texas", path: "/rehab-centers/texas", cities: [
    { name: "Houston", slug: "houston" },
    { name: "Dallas", slug: "dallas" },
    { name: "Austin", slug: "austin" },
  ]},
  { name: "New York", slug: "new-york", path: "/rehab-centers/new-york", cities: [
    { name: "New York City", slug: "new-york-city" },
    { name: "Buffalo", slug: "buffalo" },
    { name: "Rochester", slug: "rochester" },
  ]},
  { name: "Arizona", slug: "arizona", path: "/rehab-centers/arizona", cities: [
    { name: "Phoenix", slug: "phoenix" },
    { name: "Scottsdale", slug: "scottsdale" },
    { name: "Tucson", slug: "tucson" },
  ]},
  { name: "Colorado", slug: "colorado", path: "/rehab-centers/colorado", cities: [
    { name: "Denver", slug: "denver" },
    { name: "Boulder", slug: "boulder" },
    { name: "Colorado Springs", slug: "colorado-springs" },
  ]},
];

// Treatment types for SEO
const treatmentTypes = [
  { name: "Detox Programs", path: "/treatment-types/detox-programs" },
  { name: "Inpatient Rehab", path: "/treatment-types/residential-inpatient" },
  { name: "Outpatient Programs", path: "/treatment-types/outpatient-programs" },
  { name: "Alcohol Rehab", path: "/treatment-types/alcohol-rehabilitation" },
  { name: "Drug Addiction", path: "/treatment-types/drug-addiction-treatment" },
  { name: "Dual Diagnosis", path: "/treatment-types/dual-diagnosis-treatment" },
  { name: "Holistic Therapy", path: "/treatment-types/holistic-therapy" },
  { name: "Medication-Assisted", path: "/resources/medication-assisted-treatment" },
];

// Insurance types for SEO
const insuranceTypes = [
  { name: "Medicaid", path: "/resources/insurance-coverage-guide" },
  { name: "Medicare", path: "/resources/insurance-coverage-guide" },
  { name: "Private Insurance", path: "/resources/insurance-coverage-guide" },
  { name: "Blue Cross Blue Shield", path: "/resources/insurance-coverage-guide" },
  { name: "Aetna", path: "/resources/insurance-coverage-guide" },
  { name: "Cigna", path: "/resources/insurance-coverage-guide" },
  { name: "United Healthcare", path: "/resources/insurance-coverage-guide" },
  { name: "Self-Pay Options", path: "/resources/insurance-coverage-guide" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Featured Articles Section */}
      <div className="relative border-b border-white/[0.06]">
        <div className="container py-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 ring-1 ring-amber-500/20">
              <BookOpen className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-white">Recovery Resources & Guides</h3>
              <p className="text-sm text-slate-400">Expert articles to help you on your journey</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredArticles.map((article) => (
              <Link
                key={article.slug}
                to={article.slug}
                className="group relative rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5 transition-all duration-300 hover:from-white/[0.08] hover:to-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20"
              >
                <span className="inline-block text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-1 rounded-md">
                  {article.category}
                </span>
                <h4 className="mt-3 text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-relaxed transition-colors">
                  {article.title}
                </h4>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-amber-400 font-semibold group-hover:gap-2.5 transition-all duration-300">
                  Read Article <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="relative border-b border-white/[0.06]">
        <div className="container py-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-8 md:p-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-xl">
                <h3 className="font-display text-xl md:text-2xl font-bold text-white mb-2">
                  Ready to Start Your Recovery Journey?
                </h3>
                <p className="text-slate-300 text-sm md:text-base">
                  Get matched with verified treatment centers that fit your needs. Free, confidential, and available 24/7.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button asChild size="lg" className="gap-2 shadow-lg shadow-primary/25 min-w-[160px]">
                  <Link to="/request-help?source=footer">
                    <Heart className="h-4 w-4" />
                    Get Help Now
                  </Link>
                </Button>
                <a 
                  href="tel:1-800-555-0199" 
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  <Phone className="h-4 w-4 text-amber-400" />
                  1-800-555-0199
                </a>
              </div>
            </div>
            {/* Trust indicators */}
            <div className="relative mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-x-8 gap-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>100% Confidential</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>24/7 Support Available</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span>Nationwide Coverage</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative container py-14 md:py-16">
        {/* Top Section: Logo + Contact */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10 mb-14 pb-12 border-b border-white/[0.06]">
          {/* Brand column */}
          <div className="lg:max-w-xs">
            <Link to="/" className="inline-block mb-5">
              <img 
                src="/logo-dark.svg" 
                alt="Rehab-Lookup" 
                className="h-12 w-auto"
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Connecting individuals and families with trusted addiction treatment centers across the nation. Your journey to recovery starts here.
            </p>
            <div className="flex flex-col gap-3">
              <a 
                href="mailto:help@rehablookup.com" 
                className="inline-flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <Mail className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-sm">help@rehablookup.com</span>
              </a>
              <a 
                href="tel:1-800-555-0199" 
                className="inline-flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <Phone className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-sm">1-800-555-0199</span>
              </a>
            </div>
          </div>
          
          {/* Social Media Links */}
          <div className="flex flex-col items-start lg:items-end gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Follow Us</span>
            <div className="flex items-center gap-2">
              {[
                { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
                { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
                { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
                { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
              ].map((social) => (
                <a 
                  key={social.label}
                  href={social.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-slate-400 border border-white/[0.06] transition-all duration-300 hover:bg-primary hover:text-white hover:border-primary hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                  aria-label={`Follow us on ${social.label}`}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* SEO Links Grid */}
        <div className="grid gap-10 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-14">
          {/* Popular Locations */}
          <div className="col-span-2">
            <h4 className="mb-5 font-display text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              Popular Locations
            </h4>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {popularLocations.map((location) => (
                <div key={location.name}>
                  <Link 
                    to={location.path} 
                    className="text-sm font-semibold text-slate-200 transition-colors hover:text-amber-400"
                  >
                    {location.name}
                  </Link>
                  <ul className="mt-2 space-y-1.5">
                    {location.cities.map((city) => (
                      <li key={city.slug}>
                        <Link 
                          to={`/rehab-centers/${location.slug}/${city.slug}`}
                          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
                        >
                          {city.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Types */}
          <div>
            <h4 className="mb-5 font-display text-xs font-bold uppercase tracking-widest text-white">
              Treatment Types
            </h4>
            <ul className="space-y-2.5">
              {treatmentTypes.map((type) => (
                <li key={type.name}>
                  <Link to={type.path} className="text-sm text-slate-400 transition-colors hover:text-white">
                    {type.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Insurance Accepted */}
          <div>
            <h4 className="mb-5 font-display text-xs font-bold uppercase tracking-widest text-white">
              Insurance Accepted
            </h4>
            <ul className="space-y-2.5">
              {insuranceTypes.map((type) => (
                <li key={type.name}>
                  <Link to={type.path} className="text-sm text-slate-400 transition-colors hover:text-white">
                    {type.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-5 font-display text-xs font-bold uppercase tracking-widest text-white">
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/resources" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Guides & Articles
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-slate-400 transition-colors hover:text-white">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-slate-400 transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-slate-400 transition-colors hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* For Providers & Legal */}
          <div>
            <h4 className="mb-5 font-display text-xs font-bold uppercase tracking-widest text-white">
              For Providers
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/for-providers" className="text-sm text-slate-400 transition-colors hover:text-white">
                  List Your Facility
                </Link>
              </li>
              <li>
                <Link to="/provider-resources" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Provider Resources
                </Link>
              </li>
              <li>
                <Link to="/provider-login" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Provider Login
                </Link>
              </li>
            </ul>
            
            <h4 className="mt-8 mb-5 font-display text-xs font-bold uppercase tracking-widest text-white">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/privacy-policy" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-sm text-slate-400 transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center gap-4 border-t border-white/[0.06] pt-8 md:flex-row md:justify-between">
          <p className="text-sm text-slate-500 text-center md:text-left">
            © {new Date().getFullYear()} RehabLookup.com. All rights reserved.
          </p>
          <p className="text-xs text-slate-600 text-center md:text-right max-w-lg leading-relaxed">
            RehabLookup is a directory service connecting individuals with treatment providers. We do not provide medical advice, diagnosis, or treatment.
          </p>
        </div>
      </div>
    </footer>
  );
}
