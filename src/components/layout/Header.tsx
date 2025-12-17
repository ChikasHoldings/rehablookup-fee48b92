import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  ctaLink = "/request-help?source=header",
  ctaLabel = "Get Help Now",
  variant = "default"
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Track scroll position for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (variant === "provider") {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsLoggedIn(!!session);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setIsLoggedIn(!!session);
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [variant]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/provider-login");
  };

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 w-full border-b border-border bg-card transition-all duration-300",
        isScrolled 
          ? "shadow-md backdrop-blur-md bg-card/95" 
          : "shadow-sm"
      )}>
        <div className={cn(
          "container flex items-center justify-between transition-all duration-300",
          isScrolled ? "h-12 md:h-16" : "h-16 md:h-18"
        )}>
          {/* Logo - Bigger on mobile, shrinks when scrolled */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="/logo.svg" 
              alt="Rehab-Lookup" 
              className={cn(
                "w-auto transition-all duration-300 group-hover:scale-105",
                isScrolled ? "h-7 md:h-8" : "h-10 md:h-8"
              )}
            />
            {variant === "provider" && (
              <span className="text-xs font-medium text-muted-foreground">Providers</span>
            )}
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
            {variant === "provider" ? (
              <>
                {/* Provider CTAs - both List Facility and Login/Logout */}
                <Link to="/provider-signup" className="hidden sm:block">
                  <Button size="sm" variant="outline" className="shadow-sm">
                    List Your Facility
                  </Button>
                </Link>
                {isLoggedIn ? (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link to="/provider-dashboard">
                      <Button size="sm" variant="ghost">
                        Dashboard
                      </Button>
                    </Link>
                    <Button size="sm" variant="secondary" onClick={handleLogout} className="gap-1.5">
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Link to="/provider-login" className="hidden sm:block">
                    <Button size="sm" className="shadow-sm">
                      Provider Login
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <Link to={ctaLink} className="hidden sm:block">
                <Button size="sm" className="shadow-sm">
                  {ctaLabel}
                </Button>
              </Link>
            )}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground bg-secondary/50 hover:bg-secondary md:hidden transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-foreground/60 backdrop-blur-sm md:hidden transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Slide Menu - 80% width from right */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-[101] h-full w-[80%] max-w-sm bg-card shadow-2xl md:hidden transition-transform duration-300 ease-out",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>
            <img 
              src="/logo.svg" 
              alt="Rehab-Lookup" 
              className="h-9 w-auto"
            />
          </Link>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground bg-secondary/50 hover:bg-secondary transition-colors"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex flex-col h-[calc(100%-76px)] overflow-y-auto">
          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6">
            <div className="space-y-1">
              {navLinks.map((link, index) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-4 text-base font-medium transition-all",
                    location.pathname === link.href
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground hover:bg-secondary"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span>{link.label}</span>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-colors",
                    location.pathname === link.href ? "text-primary-foreground/70" : "text-muted-foreground"
                  )} />
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-border" />

            {/* Quick Links */}
            <div className="space-y-1">
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <span>About Us</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <span>Contact</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <span>FAQ</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>

          {/* Bottom CTA Section */}
          <div className="border-t border-border bg-secondary/30 p-6 space-y-3">
            {variant === "provider" ? (
              <>
                <Link to="/provider-signup" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button variant="outline" className="w-full h-12 text-base font-medium rounded-xl">
                    List Your Facility
                  </Button>
                </Link>
                {isLoggedIn ? (
                  <>
                    <Link to="/provider-dashboard" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="secondary" className="w-full h-12 text-base font-medium rounded-xl">
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full h-12 text-base font-medium rounded-xl gap-2" 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Link to="/provider-login" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button className="w-full h-12 text-base font-medium rounded-xl shadow-lg">
                      Provider Login
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <Link to={ctaLink} onClick={() => setMobileMenuOpen(false)} className="block">
                <Button className="w-full h-14 text-base font-semibold rounded-xl shadow-lg bg-primary hover:bg-primary/90">
                  {ctaLabel}
                </Button>
              </Link>
            )}
            
            {/* Trust indicator */}
            <p className="text-center text-xs text-muted-foreground pt-2">
              Trusted by thousands of families nationwide
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
