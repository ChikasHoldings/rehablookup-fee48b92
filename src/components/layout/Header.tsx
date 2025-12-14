import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/provider-login");
  };

  return (
    <header className="z-50 w-full border-b border-border bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between md:h-18">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img 
            src={logo} 
            alt="RehabLookup" 
            className="h-8 w-auto transition-transform group-hover:scale-105"
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
            <div className="mt-4 border-t border-border pt-4 space-y-2">
              {variant === "provider" ? (
                <>
                  <Link to="/provider-signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      List Your Facility
                    </Button>
                  </Link>
                  {isLoggedIn ? (
                    <>
                      <Link to="/provider-dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="secondary" className="w-full">
                          Dashboard
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full gap-2" 
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
                    <Link to="/provider-login" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">
                        Provider Login
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link to={ctaLink} onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">
                    {ctaLabel}
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
