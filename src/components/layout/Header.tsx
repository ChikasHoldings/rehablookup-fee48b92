import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/rehab-centers", label: "Find Treatment" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/95 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between md:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold text-foreground">
            RehabLookup
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                location.pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <a href="tel:1-800-555-0199" className="hidden lg:block">
            <Button variant="outline" size="sm" className="gap-2">
              <Phone className="h-4 w-4" />
              1-800-555-0199
            </Button>
          </a>
          <Link to="/rehab-centers" className="hidden sm:block">
            <Button variant="success" size="sm">
              Get Help Now
            </Button>
          </Link>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-secondary md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-card md:hidden">
          <nav className="container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "rounded-lg px-4 py-3 text-base font-medium transition-colors",
                  location.pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <a href="tel:1-800-555-0199">
                <Button variant="outline" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  1-800-555-0199
                </Button>
              </a>
              <Link to="/rehab-centers" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="success" className="w-full">
                  Get Help Now
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
