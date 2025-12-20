import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, ChevronRight, Heart, MapPin, Shield, BookOpen, Building2, Phone, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

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
  { href: "/treatment-types", label: "Treatment" },
  { href: "/insurance", label: "Insurance" },
  { href: "/resources", label: "Resources" },
  { href: "/for-providers", label: "For Providers" },
];

// Icon mapping for nav links
const navIcons: Record<string, React.ElementType> = {
  "/rehab-centers": MapPin,
  "/treatment-types": Building2,
  "/insurance": Shield,
  "/resources": BookOpen,
  "/for-providers": Building2,
  "/about": Info,
  "/contact": Phone,
  "/faq": HelpCircle,
};

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
        <div className="container flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={variant === "provider" ? "/logo-dark.svg?v=2" : "/logo.svg?v=2"}
              alt="RehabLookup" 
              className="h-8 md:h-10 w-auto"
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
                    className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                    "px-3.5 py-2 text-sm font-medium transition-colors",
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
              <PrefetchLink 
                to={ctaLink} 
                className="hidden sm:block"
                onClick={() => analytics.ctaClick(ctaLabel, "header")}
              >
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

      {/* Luxury Mobile Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] md:hidden transition-all duration-500 ease-out",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        {/* Gradient backdrop with blur */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-foreground/20 via-foreground/30 to-foreground/40 backdrop-blur-md transition-all duration-500",
          mobileMenuOpen ? "opacity-100" : "opacity-0"
        )} />
      </div>

      {/* Luxury Slide Menu Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-[101] h-full w-[320px] max-w-[85vw] md:hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Glass morphism background */}
        <div className="absolute inset-0 bg-background border-l border-border/40 shadow-2xl shadow-foreground/10" />
        
        {/* Decorative accent line with glow */}
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-primary via-primary/30 to-transparent">
          <div className="absolute top-0 left-0 w-4 h-32 bg-gradient-to-r from-primary/20 to-transparent blur-xl" />
        </div>
        
        {/* Content container */}
        <div className="relative h-full flex flex-col">
          {/* Elegant Menu Header */}
          <div className={cn(
            "flex items-center justify-between px-6 h-16 border-b border-border/30 transition-all duration-500 delay-100",
            mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="text-primary-foreground font-display font-bold text-sm">R</span>
              </div>
              <span className="font-display text-base font-semibold tracking-tight text-foreground">Menu</span>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-105 active:scale-95 transition-all duration-200"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Menu Content with refined spacing */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Primary Navigation */}
            <nav className="px-4 pt-6 pb-4">
              <p className={cn(
                "px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 transition-all duration-500 delay-150",
                mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}>
                Navigation
              </p>
              <div className="space-y-1.5">
                {navLinks.map((link, index) => {
                  const isActive = location.pathname === link.href;
                  const isForProviders = link.href === "/for-providers" && variant === "default";
                  const Icon = navIcons[link.href] || ChevronRight;
                  const delay = 200 + index * 50;
                  
                  const linkClasses = cn(
                    "group flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary shadow-sm"
                      : "text-foreground/80 hover:text-foreground hover:bg-muted/70 active:scale-[0.98]",
                    mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                  );

                  const content = (
                    <>
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                        isActive 
                          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30" 
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground group-hover:scale-105"
                      )}>
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{link.label}</span>
                        {isActive && (
                          <span className="text-[10px] text-primary/70 font-normal">Current page</span>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground/40 transition-all duration-300",
                        "group-hover:text-foreground/60 group-hover:translate-x-1"
                      )} />
                    </>
                  );
                  
                  if (isForProviders) {
                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className={linkClasses}
                        style={{ transitionDelay: mobileMenuOpen ? `${delay}ms` : '0ms' }}
                      >
                        {content}
                      </a>
                    );
                  }
                  
                  return (
                    <PrefetchLink
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={linkClasses}
                      style={{ transitionDelay: mobileMenuOpen ? `${delay}ms` : '0ms' }}
                    >
                      {content}
                    </PrefetchLink>
                  );
                })}
              </div>
            </nav>

            {/* Elegant divider with shimmer */}
            <div className={cn(
              "mx-6 h-px bg-gradient-to-r from-transparent via-border to-transparent transition-all duration-500 delay-400",
              mobileMenuOpen ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
            )} />

            {/* Secondary Links */}
            <nav className="px-4 py-4">
              <p className={cn(
                "px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 transition-all duration-500 delay-450",
                mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}>
                More
              </p>
              <div className="space-y-0.5">
                {[
                  { href: "/about", label: "About Us" },
                  { href: "/contact", label: "Contact" },
                  { href: "/faq", label: "FAQ" },
                ].map((link, index) => {
                  const Icon = navIcons[link.href] || ChevronRight;
                  const delay = 500 + index * 40;
                  return (
                    <PrefetchLink
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all duration-300",
                        mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
                      )}
                      style={{ transitionDelay: mobileMenuOpen ? `${delay}ms` : '0ms' }}
                    >
                      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      <span className="flex-1">{link.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
                    </PrefetchLink>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Premium CTA Footer */}
          <div className={cn(
            "border-t border-border/30 p-5 bg-gradient-to-t from-muted/40 to-transparent transition-all duration-500 delay-600",
            mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            {variant === "provider" ? (
              <>
                {isLoggedIn ? (
                  <div className="space-y-2.5">
                    <Link to="/provider-dashboard" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full h-12 text-sm font-medium rounded-xl border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full h-11 text-sm gap-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50" 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <Link to="/provider-signup" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button className="w-full h-12 text-sm font-medium rounded-xl bg-gradient-to-r from-primary via-primary to-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30">
                        Get Started
                      </Button>
                    </Link>
                    <Link to="/provider-login" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="ghost" className="w-full h-11 text-sm text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <PrefetchLink to={ctaLink} onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button className="w-full h-12 text-sm font-medium rounded-xl bg-gradient-to-r from-primary via-primary to-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 gap-2">
                    <Heart className="h-4 w-4 animate-pulse" />
                    {ctaLabel}
                  </Button>
                </PrefetchLink>
                <p className="text-center text-[11px] text-muted-foreground/60">
                  Free & confidential support available 24/7
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}