import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, ChevronRight, Heart, MapPin, Shield, BookOpen, Building2, Phone, HelpCircle, Info } from "lucide-react";
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
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={variant === "provider" ? "/logo-dark.svg" : "/logo.svg"}
              alt="RehabLookup" 
              className="h-10 w-auto"
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

      {/* Luxury Mobile Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] md:hidden transition-all duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/98 to-background backdrop-blur-xl" />
      </div>

      {/* Luxury Slide Menu Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-[101] h-full w-[320px] max-w-[85vw] md:hidden transition-all duration-300 ease-out",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Glass morphism background */}
        <div className="absolute inset-0 bg-gradient-to-b from-card via-card to-card/95 backdrop-blur-2xl border-l border-border/50 shadow-2xl shadow-foreground/5" />
        
        {/* Decorative accent line */}
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
        
        {/* Content container */}
        <div className="relative h-full flex flex-col">
          {/* Elegant Menu Header */}
          <div className="flex items-center justify-between px-6 h-16 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span className="text-primary font-display font-bold text-sm">R</span>
              </div>
              <span className="font-display text-base font-semibold tracking-tight text-foreground">Menu</span>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 hover:scale-105"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Menu Content with refined spacing */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Primary Navigation */}
            <nav className="px-4 pt-6 pb-4">
              <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                Navigation
              </p>
              <div className="space-y-1">
                {navLinks.map((link, index) => {
                  const isActive = location.pathname === link.href;
                  const isForProviders = link.href === "/for-providers" && variant === "default";
                  const Icon = navIcons[link.href] || ChevronRight;
                  
                  const linkClasses = cn(
                    "group flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-foreground/80 hover:text-foreground hover:bg-muted/80"
                  );

                  const content = (
                    <>
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                      )}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{link.label}</span>
                        {isActive && (
                          <span className="text-[10px] text-primary/70 font-normal">Current page</span>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground/40 transition-all duration-200",
                        "group-hover:text-muted-foreground group-hover:translate-x-0.5"
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
                        style={{ animationDelay: `${index * 50}ms` }}
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
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {content}
                    </PrefetchLink>
                  );
                })}
              </div>
            </nav>

            {/* Elegant divider */}
            <div className="mx-6 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

            {/* Secondary Links */}
            <nav className="px-4 py-4">
              <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
                More
              </p>
              <div className="space-y-0.5">
                {[
                  { href: "/about", label: "About Us" },
                  { href: "/contact", label: "Contact" },
                  { href: "/faq", label: "FAQ" },
                ].map((link) => {
                  const Icon = navIcons[link.href] || ChevronRight;
                  return (
                    <PrefetchLink
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{link.label}</span>
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-200" />
                    </PrefetchLink>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Premium CTA Footer */}
          <div className="border-t border-border/30 p-5 bg-gradient-to-t from-muted/30 to-transparent">
            {variant === "provider" ? (
              <>
                {isLoggedIn ? (
                  <div className="space-y-2.5">
                    <Link to="/provider-dashboard" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full h-12 text-sm font-medium rounded-xl border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
                        Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full h-11 text-sm gap-2 text-muted-foreground hover:text-foreground rounded-xl" 
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
                      <Button className="w-full h-12 text-sm font-medium rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/25">
                        Get Started
                      </Button>
                    </Link>
                    <Link to="/provider-login" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="ghost" className="w-full h-11 text-sm text-muted-foreground hover:text-foreground rounded-xl">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <PrefetchLink to={ctaLink} onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button className="w-full h-12 text-sm font-medium rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/25 gap-2">
                    <Heart className="h-4 w-4" />
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