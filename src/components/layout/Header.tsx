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
        "sticky top-0 z-50 w-full border-b backdrop-blur-sm shadow-sm",
        variant === "provider" 
          ? "bg-primary border-primary/20" 
          : "bg-white/95 border-border"
      )}>
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={variant === "provider" ? "/logo-dark.svg" : "/logo.svg"}
              alt="Rehab-Lookup" 
              className="h-11 w-auto"
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isForProviders = link.href === "/for-providers" && variant === "default";
              
              if (isForProviders) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "relative rounded-lg px-4 py-2 text-base font-medium transition-all duration-200",
                      "text-foreground hover:text-primary hover:bg-primary/5",
                      "after:absolute after:bottom-1 after:left-4 after:right-4 after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100"
                    )}
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
                    "relative rounded-lg px-4 py-2 text-base font-medium transition-all duration-200",
                    variant === "provider" ? (
                      location.pathname === link.href
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    ) : (
                      location.pathname === link.href
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground hover:text-primary hover:bg-primary/5"
                    ),
                    // Underline animation for non-active links
                    location.pathname !== link.href && variant !== "provider" && "after:absolute after:bottom-1 after:left-4 after:right-4 after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100"
                  )}
                >
                  {link.label}
                </PrefetchLink>
              );
            })}
          </nav>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-2">
            {variant === "provider" ? (
              <>
                {/* Provider CTAs */}
                {isLoggedIn ? (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link to="/provider-dashboard">
                      <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      onClick={handleLogout} 
                      className="gap-1.5 bg-white/10 text-white hover:bg-white/20 border-0"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                <div className="hidden sm:flex items-center gap-3">
                    <Link to="/provider-login">
                      <Button size="sm" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-md hover:shadow-lg transition-all">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/provider-signup">
                      <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <PrefetchLink to={ctaLink} className="hidden sm:block">
                <Button size="sm" className="shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {ctaLabel}
                </Button>
              </PrefetchLink>
            )}
            <button
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl md:hidden transition-all duration-200 active:scale-95",
                variant === "provider"
                  ? "text-white bg-white/10 hover:bg-white/20"
                  : "text-foreground bg-secondary hover:bg-primary hover:text-primary-foreground"
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
          "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Slide Menu - 80% width from right */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-[101] h-full w-[80%] max-w-sm bg-white shadow-2xl md:hidden transition-transform duration-300 ease-out",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Menu Header */}
        <div className={cn(
          "flex items-center justify-between border-b px-5 py-4",
          variant === "provider" 
            ? "bg-primary border-primary/20" 
            : "bg-secondary/30 border-border"
        )}>
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
            <img 
              src={variant === "provider" ? "/logo-dark.svg" : "/logo.svg"}
              alt="Rehab-Lookup" 
              className="h-10 w-auto"
              loading="lazy"
              decoding="async"
            />
          </Link>
          <button
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
              variant === "provider"
                ? "text-white bg-white/10 hover:bg-white/20"
                : "text-foreground bg-white shadow-sm hover:bg-primary hover:text-primary-foreground"
            )}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex flex-col h-[calc(100%-72px)] overflow-y-auto">
          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-5">
            <div className="space-y-1.5">
              {navLinks.map((link, index) => {
                const isForProviders = link.href === "/for-providers" && variant === "default";
                
                if (isForProviders) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="group flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-all duration-200 text-foreground hover:bg-primary/5 hover:text-primary active:bg-primary/10"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="h-4 w-4 transition-all duration-200 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5" />
                    </a>
                  );
                }
                
                return (
                  <PrefetchLink
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "group flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-all duration-200",
                      location.pathname === link.href
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-foreground hover:bg-primary/5 hover:text-primary active:bg-primary/10"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-all duration-200",
                      location.pathname === link.href 
                        ? "text-primary-foreground/70" 
                        : "text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5"
                    )} />
                  </PrefetchLink>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-5 border-t border-border" />

            {/* Quick Links */}
            <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Links
            </p>
            <div className="space-y-1">
              <PrefetchLink
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
              >
                <span>About Us</span>
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </PrefetchLink>
              <PrefetchLink
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
              >
                <span>Contact</span>
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </PrefetchLink>
              <PrefetchLink
                to="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
              >
                <span>FAQ</span>
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </PrefetchLink>
            </div>
          </nav>

          {/* Bottom CTA Section */}
          <div className="border-t border-border bg-gradient-to-b from-secondary/50 to-secondary/30 p-5 space-y-3">
            {variant === "provider" ? (
              <>
                <Link to="/provider-signup" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button variant="outline" className="w-full h-12 text-base font-medium rounded-xl hover:bg-primary/5 hover:border-primary transition-colors">
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
                      className="w-full h-12 text-base font-medium rounded-xl gap-2 hover:bg-destructive/10 hover:text-destructive" 
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
                    <Button className="w-full h-12 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                      Provider Login
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <PrefetchLink to={ctaLink} onClick={() => setMobileMenuOpen(false)} className="block">
                <Button className="w-full h-14 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 active:scale-[0.98]">
                  <Heart className="h-4 w-4 mr-2" />
                  {ctaLabel}
                </Button>
              </PrefetchLink>
            )}
            
            {/* Trust indicator */}
            <p className="text-center text-xs text-muted-foreground pt-1">
              Trusted by thousands of families nationwide
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
