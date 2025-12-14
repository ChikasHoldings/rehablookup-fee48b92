import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
}

export interface HeaderProps {
  navLinks?: NavLink[];
  ctaLink?: string;
  ctaLabel?: string;
  variant?: "default" | "provider";
}

const defaultNavLinks: NavLink[] = [
  { href: "/rehab-centers", label: "Find Rehab" },
  { href: "/treatment-types", label: "Treatment Types" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-providers", label: "For Providers" },
];

export function Header({ 
  navLinks = defaultNavLinks, 
  ctaLink = "/rehab-centers",
  ctaLabel = "Get Help Now",
  variant = "default"
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between md:h-18">
        {/* Logo */}
        <Link to={variant === "provider" ? "/provider-login" : "/"} className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary transition-transform group-hover:scale-105">
            <Heart className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold text-foreground">
            RehabLookup
            {variant === "provider" && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">Providers</span>
            )}
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
          <Link to={ctaLink} className="hidden sm:block">
            <Button size="sm" className="shadow-sm">
              {ctaLabel}
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
            <div className="mt-4 border-t border-border pt-4">
              <Link to={ctaLink} onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">
                  {ctaLabel}
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
