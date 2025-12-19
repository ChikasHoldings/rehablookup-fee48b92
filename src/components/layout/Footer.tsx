import { Link } from "react-router-dom";
import { Heart, Mail, Facebook, Twitter, Instagram, Linkedin, ArrowRight, BookOpen } from "lucide-react";
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
  { name: "Detox Programs", path: "/treatment-types/drug-addiction-treatment" },
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
    <footer className="border-t border-border bg-slate-900">
      {/* Featured Articles Section - SEO Boost */}
      <div className="border-b border-white/10">
        <div className="container py-10">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-amber-400" />
            <h3 className="font-display text-lg font-semibold text-white">Recovery Resources & Guides</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredArticles.map((article) => (
              <Link
                key={article.slug}
                to={article.slug}
                className="group rounded-lg bg-white/5 p-4 transition-all hover:bg-white/10 border border-white/5 hover:border-white/10"
              >
                <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                  {article.category}
                </span>
                <h4 className="mt-2 text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                  {article.title}
                </h4>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400 group-hover:gap-2 transition-all font-medium">
                  Read Article <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container py-12 md:py-14">
        {/* Top Section: Logo + Contact */}
        <div className="flex flex-col items-center text-center mb-12 pb-10 border-b border-white/10">
          <Link to="/" className="inline-block mb-6">
            <img 
              src="/logo-dark.svg" 
              alt="Rehab-Lookup" 
              className="h-14 md:h-16 w-auto"
              loading="lazy"
              decoding="async"
            />
          </Link>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Button asChild variant="default" size="lg" className="gap-2">
              <Link to="/request-help?source=footer">
                <Heart className="h-4 w-4" />
                Get Help Now
              </Link>
            </Button>
            <a 
              href="mailto:help@rehablookup.com" 
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4 text-amber-400" />
              help@rehablookup.com
            </a>
          </div>
          
          {/* Social Media Links */}
          <div className="flex items-center gap-2">
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-all hover:bg-amber-500 hover:text-white"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-all hover:bg-amber-500 hover:text-white"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-all hover:bg-amber-500 hover:text-white"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-all hover:bg-amber-500 hover:text-white"
              aria-label="Follow us on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* SEO Links Grid */}
        <div className="grid gap-8 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 mb-12">
          {/* Popular Locations */}
          <div className="col-span-2">
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white">
              Popular Locations
            </h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {popularLocations.map((location) => (
                <div key={location.name}>
                  <Link 
                    to={location.path} 
                    className="text-sm font-medium text-slate-200 transition-colors hover:text-amber-400"
                  >
                    {location.name}
                  </Link>
                  <ul className="mt-1.5 space-y-1">
                    {location.cities.map((city) => (
                      <li key={city.slug}>
                        <Link 
                          to={`/rehab-centers/${location.slug}/${city.slug}`}
                          className="text-xs text-slate-400 transition-colors hover:text-slate-200"
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
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white">
              Treatment Types
            </h4>
            <ul className="space-y-2">
              {treatmentTypes.map((type) => (
                <li key={type.name}>
                  <Link to={type.path} className="text-sm text-slate-300 transition-colors hover:text-white">
                    {type.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Insurance Accepted */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white">
              Insurance Accepted
            </h4>
            <ul className="space-y-2">
              {insuranceTypes.map((type) => (
                <li key={type.name}>
                  <Link to={type.path} className="text-sm text-slate-300 transition-colors hover:text-white">
                    {type.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/resources" className="text-sm text-slate-300 transition-colors hover:text-white">
                  Guides & Articles
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-slate-300 transition-colors hover:text-white">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-slate-300 transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-slate-300 transition-colors hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-slate-300 transition-colors hover:text-white">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* For Providers & Company */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white">
              For Providers
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/for-providers" className="text-sm text-slate-300 transition-colors hover:text-white">
                  List Your Facility
                </Link>
              </li>
              <li>
                <Link to="/provider-resources" className="text-sm text-slate-300 transition-colors hover:text-white">
                  Provider Resources
                </Link>
              </li>
              <li>
                <Link to="/provider-login" className="text-sm text-slate-300 transition-colors hover:text-white">
                  Provider Login
                </Link>
              </li>
            </ul>
            
            <h4 className="mt-6 mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy-policy" className="text-sm text-slate-300 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-sm text-slate-300 transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center gap-3 border-t border-white/10 pt-6 md:flex-row md:justify-between">
          <p className="text-sm text-slate-400 text-center md:text-left">
            © {new Date().getFullYear()} RehabLookup.com. All rights reserved.
          </p>
          <p className="text-xs text-slate-500 text-center md:text-right max-w-md">
            RehabLookup is a directory service connecting individuals with treatment providers. We are not a treatment provider.
          </p>
        </div>
      </div>
    </footer>
  );
}
