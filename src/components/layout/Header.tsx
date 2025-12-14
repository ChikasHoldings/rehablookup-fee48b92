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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/98 backdrop-blur-sm shadow-sm">
      <div className="container flex h-16 items-center justify-between md:h-18">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary transition-transform group-hover:scale-105">
            <Heart className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold text-foreground">
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
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                location.pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:text-foreground hover:bg-secondary"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <a href="tel:1-800-555-0199" className="hidden lg:block">
            <Button variant="ghost" size="sm" className="gap-2 text-foreground/70 hover:text-foreground">
              <Phone className="h-4 w-4" />
              1-800-555-0199
            </Button>
          </a>
          <Link to="/rehab-centers" className="hidden sm:block">
            <Button size="sm" className="shadow-sm">
              Get Help Now
            </Button>
          </Link>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-card md:hidden animate-fade-in">
          <nav className="container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "rounded-lg px-4 py-3 text-base font-medium transition-all",
                  location.pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground"
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
                <Button className="w-full">
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
