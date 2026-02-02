import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, ChevronRight, Heart, MapPin, Shield, BookOpen, Building2, Phone, HelpCircle, Info, User, ChevronDown, Search } from "lucide-react";
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
  ctaLink = "/concierge",
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
        <div className="container flex h-14 md:h-16 items-center justify-between gap-2">
          {/* Logo - Left aligned */}
          <Link to="/" className="flex items-center">
            <img 
              src="/logo.png"
              alt="RehabLookup" 
              className="h-8 md:h-9 w-auto"
              width={134}
              height={32}
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
                          "flex items-center gap-1 px-3.5 py-2 text-[15px] font-medium transition-colors",
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
                    "px-3.5 py-2 text-[15px] font-medium transition-colors",
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

          {/* CTA & Mobile Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Mobile Search Icon */}
            <PrefetchLink
              to="/rehab-centers"
              className="flex h-10 w-10 items-center justify-center rounded-lg md:hidden text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Search facilities"
            >
              <Search className="h-5 w-5" />
            </PrefetchLink>

            {/* Mobile Hamburger Button */}
            <button
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg md:hidden transition-all duration-200 bg-primary hover:bg-primary/90 active:scale-95",
                mobileMenuOpen && "bg-primary/90"
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-primary-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-primary-foreground" />
              )}
            </button>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
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
          </div>
        </div>
      </header>

      {/* Super Menu - Full Screen Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] md:hidden transition-all duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Clean backdrop */}
        <div 
          className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Super Menu Panel */}
        <div 
          className={cn(
            "absolute inset-x-0 top-0 bg-background transition-all duration-400 ease-out overflow-hidden",
            mobileMenuOpen ? "max-h-[90vh] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-border">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <img 
                src="/logo.png"
                alt="RehabLookup" 
                className="h-8 w-auto"
              />
            </Link>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-56px)] overscroll-contain">
            {/* Quick Actions */}
            <div className="px-4 py-4 border-b border-border/50">
              <div className="grid grid-cols-2 gap-3">
                <PrefetchLink 
                  to="/rehab-centers" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Find Rehab</span>
                </PrefetchLink>
                <PrefetchLink 
                  to="/concierge" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent/5 hover:bg-accent/10 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Concierge</span>
                </PrefetchLink>
              </div>
            </div>

            {/* Primary Navigation */}
            <nav className="px-4 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Navigate</p>
              <div className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.href || 
                    (link.href !== "/" && location.pathname.startsWith(link.href));
                  const isForProviders = link.href === "/for-providers";
                  const Icon = navIcons[link.href] || ChevronRight;
                  
                  // Skip concierge and find rehab since they're in quick actions
                  if (link.href === "/rehab-centers" || link.href === "/concierge") return null;
                  
                  if (isForProviders) {
                    const isProviderActive = location.pathname.startsWith("/for-providers") || location.pathname.startsWith("/provider");
                    return (
                      <div key={link.href} className="space-y-1">
                        <PrefetchLink
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                            isProviderActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={cn("h-5 w-5", isProviderActive ? "text-primary" : "text-muted-foreground")} />
                            <span>{link.label}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </PrefetchLink>
                        <div className="ml-8 pl-3 border-l-2 border-border space-y-0.5">
                          {providerDropdownLinks.slice(1).map((subLink) => (
                            <PrefetchLink
                              key={subLink.href}
                              to={subLink.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                                location.pathname === subLink.href
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
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
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-3 text-[15px] font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span>{link.label}</span>
                      </div>
                    </PrefetchLink>
                  );
                })}
              </div>
            </nav>

            {/* Secondary Links */}
            <div className="px-4 py-4 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Resources</p>
              <div className="grid grid-cols-2 gap-2">
                <PrefetchLink 
                  to="/about" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Info className="h-4 w-4" />
                  About Us
                </PrefetchLink>
                <PrefetchLink 
                  to="/contact" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Contact
                </PrefetchLink>
                <PrefetchLink 
                  to="/faq" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  FAQ
                </PrefetchLink>
                <PrefetchLink 
                  to="/blog" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Blog
                </PrefetchLink>
              </div>
            </div>

            {/* CTA Footer */}
            <div className="px-4 py-5 bg-muted/30 border-t border-border/50">
              {!roleLoading && isSeekerLoggedIn ? (
                <PrefetchLink to="/account" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button variant="outline" className="w-full h-12 text-sm font-medium rounded-lg gap-2 relative">
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
                <div className="flex gap-3">
                  <PrefetchLink to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                    <Button className="w-full h-12 text-sm font-medium rounded-lg gap-2">
                      <User className="h-4 w-4" />
                      Sign In
                    </Button>
                  </PrefetchLink>
                  <PrefetchLink to="/provider-signup" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                    <Button variant="outline" className="w-full h-12 text-sm font-medium rounded-lg">
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