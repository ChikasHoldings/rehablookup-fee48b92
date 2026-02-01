import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, ChevronRight, Heart, MapPin, Shield, BookOpen, Building2, Phone, HelpCircle, Info, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { useUserRole } from "@/hooks/useUserRole";
import { useFavorites } from "@/hooks/useFavorites";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Provider dropdown links
const providerDropdownLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/provider-faq", label: "FAQ" },
  { href: "/provider-support", label: "Support" },
];

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
  { href: "/insurance", label: "Insurance" },
  { href: "/concierge", label: "Concierge" },
  { href: "/for-providers", label: "For Providers" },
];

// Icon mapping for nav links
const navIcons: Record<string, React.ElementType> = {
  "/rehab-centers": MapPin,
  "/treatment-types": Building2,
  "/insurance": Shield,
  "/concierge": Heart,
  "/for-providers": Building2,
  "/about": Info,
  "/contact": Phone,
  "/faq": HelpCircle,
};

export function Header({ 
  navLinks = defaultNavLinks, 
  ctaLink = "/account/concierge",
  ctaLabel = "Get Matched",
  variant = "default"
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Use unified role system - only show "My Account" for seekers (not admin/provider)
  const { role, isLoading: roleLoading, isAuthenticated } = useUserRole();
  const isSeekerLoggedIn = isAuthenticated && role === "seeker";
  const { favoritesCount } = useFavorites();

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

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background border-border">
        <div className="container flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/logo.png"
              alt="RehabLookup" 
              className="h-7 md:h-9 w-auto"
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href || 
                (link.href !== "/" && location.pathname.startsWith(link.href));
              const isForProviders = link.href === "/for-providers";
              
              // For Providers dropdown
              if (isForProviders) {
                return (
                  <DropdownMenu key={link.href} open={providerDropdownOpen} onOpenChange={setProviderDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center gap-1 px-3.5 py-2 text-sm font-medium transition-colors",
                          isActive || location.pathname.startsWith("/provider")
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {link.label}
                        <ChevronDown className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          providerDropdownOpen && "rotate-180"
                        )} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {providerDropdownLinks.map((dropdownLink) => (
                        <DropdownMenuItem key={dropdownLink.href} asChild>
                          <PrefetchLink
                            to={dropdownLink.href}
                            className="w-full cursor-pointer"
                            onClick={() => setProviderDropdownOpen(false)}
                          >
                            {dropdownLink.label}
                          </PrefetchLink>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              
              return (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </PrefetchLink>
              );
            })}
          </nav>

          {/* CTA & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              {!roleLoading && isSeekerLoggedIn ? (
                <PrefetchLink to="/account">
                  <Button size="sm" variant="ghost" className="h-8 text-sm gap-1.5 relative">
                    <User className="h-4 w-4" />
                    My Account
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Button>
                </PrefetchLink>
              ) : (
                <>
                  <PrefetchLink to="/provider-signup">
                    <Button size="sm" variant="outline" className="h-8 text-sm">
                      List Facility
                    </Button>
                  </PrefetchLink>
                  <PrefetchLink to="/login">
                    <Button size="sm" className="h-8 text-sm gap-1.5">
                      <User className="h-4 w-4" />
                      Sign In
                    </Button>
                  </PrefetchLink>
                </>
              )}
            </div>
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
            <nav className="px-5 pt-6 pb-4">
              <div className="space-y-1">
                {navLinks.map((link, index) => {
                  const isActive = location.pathname === link.href;
                  const isForProviders = link.href === "/for-providers";
                  const Icon = navIcons[link.href] || ChevronRight;
                  const delay = 150 + index * 40;
                  
                  const linkClasses = cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted active:scale-[0.98]",
                    mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                  );

                  const content = (
                    <>
                      <Icon className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span>{link.label}</span>
                    </>
                  );
                  
                  // For Providers with sub-links
                  if (isForProviders) {
                    const isProviderActive = location.pathname.startsWith("/for-providers") || location.pathname.startsWith("/provider");
                    return (
                      <div key={link.href}>
                        <PrefetchLink
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            linkClasses,
                            isProviderActive && "bg-primary/10 text-primary"
                          )}
                          style={{ transitionDelay: mobileMenuOpen ? `${delay}ms` : '0ms' }}
                        >
                          <Icon className={cn(
                            "h-5 w-5 shrink-0",
                            isProviderActive ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span>{link.label}</span>
                        </PrefetchLink>
                        {/* Provider sub-links */}
                        <div className="ml-8 mt-1 space-y-1">
                          {providerDropdownLinks.slice(1).map((subLink, subIndex) => (
                            <PrefetchLink
                              key={subLink.href}
                              to={subLink.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                                location.pathname === subLink.href
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-foreground",
                                mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                              )}
                              style={{ transitionDelay: mobileMenuOpen ? `${delay + 30 + subIndex * 20}ms` : '0ms' }}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                              {subLink.label}
                            </PrefetchLink>
                          ))}
                        </div>
                      </div>
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
          </div>

          {/* Premium CTA Footer */}
          <div className={cn(
            "border-t border-border/30 p-5 bg-gradient-to-t from-muted/40 to-transparent transition-all duration-500 delay-600",
            mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <div className="space-y-3">
              {!roleLoading && isSeekerLoggedIn ? (
                <PrefetchLink to="/account" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button variant="outline" className="w-full h-11 text-sm font-medium rounded-xl gap-2 relative">
                    <User className="h-4 w-4" />
                    My Account
                    {favoritesCount > 0 && (
                      <span className="absolute top-2 right-3 h-5 w-5 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Button>
                </PrefetchLink>
              ) : (
                <div className="space-y-2.5">
                  <PrefetchLink to="/login" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button className="w-full h-12 text-sm font-medium rounded-xl bg-gradient-to-r from-primary via-primary to-primary/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 gap-2">
                      <User className="h-4 w-4" />
                      Sign In
                    </Button>
                  </PrefetchLink>
                  <PrefetchLink to="/provider-signup" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button variant="outline" className="w-full h-11 text-sm rounded-xl">
                      List Facility
                    </Button>
                  </PrefetchLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}