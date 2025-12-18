import { Link } from "react-router-dom";
import { Heart, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, ArrowRight, BookOpen } from "lucide-react";

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

export function Footer() {
  return (
    <footer className="border-t border-border bg-slate-900 text-white">
      {/* Featured Articles Section - SEO Boost */}
      <div className="border-b border-white/10">
        <div className="container py-10">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Recovery Resources & Guides</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredArticles.map((article) => (
              <Link
                key={article.slug}
                to={article.slug}
                className="group rounded-lg bg-white/5 p-4 transition-all hover:bg-white/10"
              >
                <span className="text-xs font-medium text-primary/80 uppercase tracking-wide">
                  {article.category}
                </span>
                <h4 className="mt-2 text-sm font-medium text-white/90 group-hover:text-white line-clamp-2 leading-snug">
                  {article.title}
                </h4>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary group-hover:gap-2 transition-all">
                  Read Article <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container py-12 md:py-14">
        {/* Mobile Logo Section */}
        <div className="flex flex-col items-center mb-10 md:hidden">
          <Link to="/" className="inline-block mb-4">
            <img 
              src="/logo-dark.svg" 
              alt="Rehab-Lookup" 
              className="h-11 w-auto"
            />
          </Link>
          <p className="text-center text-sm leading-relaxed text-white/60 max-w-[280px]">
            Connecting families with trusted treatment centers nationwide.
          </p>
          
          {/* Social Media - Mobile */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
              aria-label="Follow us on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid gap-8 grid-cols-2 md:grid-cols-6">
          {/* Brand & Social - Desktop Only */}
          <div className="hidden md:block space-y-5 col-span-2">
            <Link to="/" className="inline-block">
              <img 
                src="/logo-dark.svg" 
                alt="Rehab-Lookup" 
                className="h-10 w-auto"
              />
            </Link>
            
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Connecting families with trusted treatment centers nationwide. Free, confidential support available 24/7.
            </p>
            
            {/* Social Media Links - Desktop */}
            <div className="flex items-center gap-2">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-primary hover:text-white"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Find Treatment */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white/80">
              Find Treatment
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/rehab-centers" className="text-sm text-white/60 transition-colors hover:text-white">
                  Find Rehab Centers
                </Link>
              </li>
              <li>
                <Link to="/treatment-types" className="text-sm text-white/60 transition-colors hover:text-white">
                  Treatment Types
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-white/60 transition-colors hover:text-white">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/request-help?source=footer" className="text-sm text-white/60 transition-colors hover:text-white">
                  Get Help Now
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white/80">
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/resources" className="text-sm text-white/60 transition-colors hover:text-white">
                  Guides & Articles
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-white/60 transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-white/60 transition-colors hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-white/60 transition-colors hover:text-white">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white/80">
              For Providers
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/for-providers" className="text-sm text-white/60 transition-colors hover:text-white">
                  List Your Facility
                </Link>
              </li>
              <li>
                <Link to="/provider-resources" className="text-sm text-white/60 transition-colors hover:text-white">
                  Provider Resources
                </Link>
              </li>
              <li>
                <Link to="/provider-login" className="text-sm text-white/60 transition-colors hover:text-white">
                  Provider Login
                </Link>
              </li>
              <li>
                <Link to="/provider-support" className="text-sm text-white/60 transition-colors hover:text-white">
                  Provider Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Company */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-white/80">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/about" className="text-sm text-white/60 transition-colors hover:text-white">
                  About RehabLookup
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="text-sm text-white/60 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-sm text-white/60 transition-colors hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Bar */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3 rounded-xl bg-white/5 p-5">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-white/50">Need Help?</p>
              <Link to="/request-help?source=footer" className="font-medium text-white transition-colors hover:text-primary">
                Request Help Now
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-white/50">Email Us</p>
              <a href="mailto:help@rehablookup.com" className="font-medium text-white transition-colors hover:text-primary">
                help@rehablookup.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-white/50">Availability</p>
              <span className="font-medium text-white">24/7 Nationwide</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t border-white/10 pt-6 md:flex-row md:justify-between">
          <p className="text-sm text-white/50 text-center md:text-left">
            © {new Date().getFullYear()} RehabLookup.com. All rights reserved.
          </p>
          <p className="text-xs text-white/40 text-center md:text-right max-w-md">
            RehabLookup is a directory service connecting individuals with treatment providers. We are not a treatment provider.
          </p>
        </div>
      </div>
    </footer>
  );
}
