import { Link } from "react-router-dom";
import { Heart, Mail, Phone, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Popular locations for SEO
const popularLocations = [
  { name: "California", path: "/rehab-centers/california" },
  { name: "Florida", path: "/rehab-centers/florida" },
  { name: "Texas", path: "/rehab-centers/texas" },
  { name: "New York", path: "/rehab-centers/new-york" },
  { name: "Arizona", path: "/rehab-centers/arizona" },
  { name: "Colorado", path: "/rehab-centers/colorado" },
];

// Treatment types for SEO
const treatmentTypes = [
  { name: "Detox Programs", path: "/treatment-types/detox-programs" },
  { name: "Inpatient Rehab", path: "/treatment-types/residential-inpatient" },
  { name: "Outpatient Programs", path: "/treatment-types/outpatient-programs" },
  { name: "Alcohol Rehab", path: "/treatment-types/alcohol-rehabilitation" },
  { name: "Drug Addiction", path: "/treatment-types/drug-addiction-treatment" },
  { name: "Dual Diagnosis", path: "/treatment-types/dual-diagnosis-treatment" },
];

// Resources
const resources = [
  { name: "Guides & Articles", path: "/resources" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "FAQ", path: "/faq" },
  { name: "About Us", path: "/about" },
  { name: "Contact", path: "/contact" },
];

// Company/Provider links
const providerLinks = [
  { name: "List Your Facility", path: "/for-providers" },
  { name: "Provider Resources", path: "/provider-resources" },
  { name: "Provider Login", path: "/provider-login" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      {/* CTA Section */}
      <div className="border-b border-border">
        <div className="container py-10 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-1">
                Need Help Finding Treatment?
              </h3>
              <p className="text-muted-foreground text-sm">
                Connect with verified treatment centers. Free & confidential.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild size="default" className="gap-2">
                <Link to="/request-help?source=footer">
                  <Heart className="h-4 w-4" />
                  Get Help Now
                </Link>
              </Button>
              <a 
                href="tel:1-800-555-0199" 
                className="hidden sm:inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                1-800-555-0199
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Links */}
      <div className="container py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 lg:pr-8">
            <Link to="/" className="inline-block mb-4">
              <img 
                src="/logo.svg" 
                alt="RehabLookup" 
                className="h-8 w-auto dark:hidden"
                loading="lazy"
              />
              <img 
                src="/logo-dark.svg" 
                alt="RehabLookup" 
                className="h-8 w-auto hidden dark:block"
                loading="lazy"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-xs">
              Connecting individuals with trusted addiction treatment centers nationwide.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <a 
                href="mailto:help@rehablookup.com" 
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                help@rehablookup.com
              </a>
            </div>
          </div>

          {/* Locations */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              Locations
            </h4>
            <ul className="space-y-2.5">
              {popularLocations.map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link 
                  to="/locations" 
                  className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  View All
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Treatment */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              Treatment
            </h4>
            <ul className="space-y-2.5">
              {treatmentTypes.map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5">
              {resources.map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">
              For Providers
            </h4>
            <ul className="space-y-2.5">
              {providerLinks.map((item) => (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} RehabLookup. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link 
                to="/privacy-policy" 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link 
                to="/terms-of-service" 
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
