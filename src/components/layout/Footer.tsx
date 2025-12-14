import { Link } from "react-router-dom";
import { Heart, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Social */}
          <div className="space-y-5 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/15">
                <Heart className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold text-primary-foreground">
                RehabLookup
              </span>
            </Link>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground/70 transition-all hover:bg-primary-foreground/20 hover:text-primary-foreground"
                aria-label="Follow us on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Treatment */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              Treatment
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/rehab-centers" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Find Treatment Centers
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
              <li>
                <Link to="/for-providers" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  For Providers
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              Resources
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/resources" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Resources & Guides
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
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              Providers
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/for-providers" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  For Providers
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
            <h4 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground">
              Legal
            </h4>
            <ul className="space-y-2.5">
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

        {/* Contact Bar */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 rounded-xl bg-primary-foreground/5 p-4 md:justify-between">
          <div className="flex items-center gap-2.5 text-sm text-primary-foreground/80">
            <Phone className="h-4 w-4 text-accent" />
            <a href="tel:1-800-555-0199" className="transition-colors hover:text-primary-foreground font-medium">
              1-800-555-0199
            </a>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-primary-foreground/80">
            <Mail className="h-4 w-4 text-accent" />
            <a href="mailto:help@rehablookup.com" className="transition-colors hover:text-primary-foreground">
              help@rehablookup.com
            </a>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-primary-foreground/80">
            <MapPin className="h-4 w-4 text-accent" />
            <span>Available 24/7 Nationwide</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-primary-foreground/15 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <p className="text-sm text-primary-foreground/70">
              © {new Date().getFullYear()} RehabLookup.com. All rights reserved.
            </p>
            <p className="text-xs text-primary-foreground/50">
              RehabLookup is a directory service. We are not a treatment provider.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
