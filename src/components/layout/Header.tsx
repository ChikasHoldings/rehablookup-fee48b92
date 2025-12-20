import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, ChevronRight, Heart } from "lucide-react";
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
  { href: "/locations", label: "Locations" },
  { href: "/treatment-types", label: "Treatment" },
  { href: "/resources", label: "Resources" },
  { href: "/for-providers", label: "For Providers" },
];

export function Header({ 
  navLinks = defaultNavLinks, 
  ctaLink = "/request-help?source=header",
  ctaLabel = "Get Help",
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
        "sticky top-0 z-50 w-full border-b",
        variant === "provider" 
          ? "bg-primary border-primary/20" 
          : "bg-background/95 backdrop-blur-sm border-border"
      )}>
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={variant === "provider" ? "/logo-dark.svg" : "/logo.svg"}
              alt="RehabLookup" 
              className="h-8 w-auto"
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href || 
                (link.href !== "/" && location.pathname.startsWith(link.href));
              const isForProviders = link.href === "/for-providers" && variant === "default";
              
              if (isForProviders) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                );
              }
              
              return (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-colors",
                    variant === "provider" ? (
                      isActive
                        ? "text-white"
                        : "text-white/70 hover:text-white"
                    ) : (
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )
                  )}
                >
                  {link.label}
                </PrefetchLink>
              );
            })}
          </nav>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-3">
            {variant === "provider" ? (
              <>
                {isLoggedIn ? (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link to="/provider-dashboard">
                      <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 h-8 text-sm">
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      onClick={handleLogout} 
                      variant="ghost"
                      className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10 h-8 text-sm"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link to="/provider-login">
                      <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 h-8 text-sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/provider-signup">
                      <Button size="sm" className="bg-white text-primary hover:bg-white/90 h-8 text-sm">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <PrefetchLink to={ctaLink} className="hidden sm:block">
                <Button size="sm" className="h-8 text-sm gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  {ctaLabel}
                </Button>
              </PrefetchLink>
            )}
            <button
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md md:hidden transition-colors",
                variant === "provider"
                  ? "text-white hover:bg-white/10"
                  : "text-foreground hover:bg-muted"
              )}
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
          "fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm md:hidden transition-opacity duration-200",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Slide Menu */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-[101] h-full w-[280px] bg-background border-l border-border md:hidden transition-transform duration-200 ease-out",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between border-b border-border px-4 h-14">
          <span className="text-sm font-medium text-foreground">Menu</span>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex flex-col h-[calc(100%-56px)] overflow-y-auto">
          {/* Navigation Links */}
          <nav className="flex-1 p-3">
            <div className="space-y-0.5">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                const isForProviders = link.href === "/for-providers" && variant === "default";
                
                if (isForProviders) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  );
                }
                
                return (
                  <PrefetchLink
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-4 w-4" />
                  </PrefetchLink>
                );
              })}
            </div>

            <div className="my-3 border-t border-border" />

            {/* Quick Links */}
            <div className="space-y-0.5">
              <PrefetchLink
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span>About</span>
                <ChevronRight className="h-4 w-4" />
              </PrefetchLink>
              <PrefetchLink
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span>Contact</span>
                <ChevronRight className="h-4 w-4" />
              </PrefetchLink>
              <PrefetchLink
                to="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span>FAQ</span>
                <ChevronRight className="h-4 w-4" />
              </PrefetchLink>
            </div>
          </nav>

          {/* Bottom CTA */}
          <div className="border-t border-border p-4 space-y-2">
            {variant === "provider" ? (
              <>
                {isLoggedIn ? (
                  <>
                    <Link to="/provider-dashboard" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full h-10 text-sm">
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full h-10 text-sm gap-2 text-muted-foreground" 
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
                  <>
                    <Link to="/provider-login" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full h-10 text-sm">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/provider-signup" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button className="w-full h-10 text-sm">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </>
            ) : (
              <PrefetchLink to={ctaLink} onClick={() => setMobileMenuOpen(false)} className="block">
                <Button className="w-full h-10 text-sm gap-1.5">
                  <Heart className="h-4 w-4" />
                  {ctaLabel}
                </Button>
              </PrefetchLink>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
