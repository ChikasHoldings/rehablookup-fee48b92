import { Link } from "react-router-dom";
import { Heart, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        {/* Mobile Logo - Centered and Bigger */}
        <div className="flex flex-col items-center mb-10 md:hidden">
          <Link to="/" className="inline-block mb-4">
            <img 
              src="/logo-dark.svg" 
              alt="Rehab-Lookup" 
              className="h-12 w-auto"
            />
          </Link>
          <p className="text-center text-sm leading-relaxed text-primary-foreground/60 max-w-[280px]">
            Connecting families with trusted treatment centers nationwide.
          </p>
          
          {/* Social Media - Mobile */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
              aria-label="Follow us on Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
              aria-label="Follow us on Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
              aria-label="Follow us on LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid gap-8 grid-cols-2 md:grid-cols-6 lg:grid-cols-6">
          {/* Brand & Social - Desktop Only */}
          <div className="hidden md:block space-y-6 col-span-2">
            <Link to="/" className="inline-block">
              <img 
                src="/logo-dark.svg" 
                alt="Rehab-Lookup" 
                className="h-8 w-auto"
              />
            </Link>
            
            <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/60">
              Connecting families with trusted treatment centers nationwide.
            </p>
            
            {/* Social Media Links - Desktop */}
            <div className="flex items-center gap-2">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Treatment */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-primary-foreground/90">
              Treatment
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/rehab-centers" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Find Centers
                </Link>
              </li>
              <li>
                <Link to="/treatment-types" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Treatment Types
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-primary-foreground/90">
              Resources
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/resources" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Guides & Articles
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Providers */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-primary-foreground/90">
              Providers
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/for-providers" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  List Your Facility
                </Link>
              </li>
              <li>
                <Link to="/provider-resources" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Provider Resources
                </Link>
              </li>
              <li>
                <Link to="/provider-login" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Provider Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-display text-xs font-semibold uppercase tracking-widest text-primary-foreground/90">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy-policy" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Bar - Mobile Optimized */}
        <div className="mt-10 md:mt-12 flex flex-col gap-4 md:grid md:grid-cols-3 rounded-xl bg-primary-foreground/5 p-5">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-10 w-10 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Heart className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">Need Help?</p>
              <Link to="/request-help?source=footer" className="font-medium text-primary-foreground transition-colors hover:text-primary-foreground/80">
                Request Help Now
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-10 w-10 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <Mail className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">Email Us</p>
              <a href="mailto:help@rehablookup.com" className="font-medium text-primary-foreground transition-colors hover:text-primary-foreground/80">
                help@rehablookup.com
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-10 w-10 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-accent/20">
              <MapPin className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/50">Availability</p>
              <span className="font-medium text-primary-foreground">24/7 Nationwide</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Mobile Optimized */}
        <div className="mt-8 md:mt-10 flex flex-col items-center gap-3 border-t border-primary-foreground/10 pt-6 md:pt-8 md:flex-row md:justify-between md:gap-4">
          <p className="text-sm text-primary-foreground/60 text-center md:text-left">
            © {new Date().getFullYear()} RehabLookup.com. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/40 text-center md:text-right">
            RehabLookup is a directory service. We are not a treatment provider.
          </p>
        </div>
      </div>
    </footer>
  );
}
