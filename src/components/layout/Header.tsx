import { useState, useEffect, useRef } from "react";
import headerLogo from "@/assets/logo-header.webp";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, ChevronRight, Heart, MapPin, Shield, BookOpen, Building2, Phone, HelpCircle, Info, User, ChevronDown, Search, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { useUserRole } from "@/hooks/useUserRole";
import { useFavorites } from "@/hooks/useFavorites";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderMegaMenu, ProviderMegaMenuMobile } from "@/components/provider-guides/ProviderMegaMenu";

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

// Primary nav items shown on tablet+
const primaryNavLinks: NavLink[] = [
  { href: "/rehab-centers", label: "Find Rehab" },
  { href: "/concierge", label: "Concierge" },
];

// Secondary nav items shown in "More" dropdown on tablet, inline on desktop
const secondaryNavLinks: NavLink[] = [
  { href: "/insurance", label: "Insurance" },
  { href: "/international", label: "US Treatment" },
];

const defaultNavLinks: NavLink[] = [
  ...primaryNavLinks,
  ...secondaryNavLinks,
  { href: "/for-providers", label: "For Providers" },
];

// Icon mapping for nav links
const navIcons: Record<string, React.ElementType> = {
  "/rehab-centers": MapPin,
  "/treatment-types": Building2,
  "/insurance": Shield,
  "/concierge": Heart,
  "/international": Globe,
  "/for-providers": Building2,
  "/about": Info,
  "/contact": Phone,
  "/faq": HelpCircle,
};

export function Header({ 
  navLinks = defaultNavLinks, 
  ctaLink = "/concierge",
  ctaLabel = "Find Treatment",
  variant = "default"
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [mobileProviderExpanded, setMobileProviderExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Use unified role system - only show "My Account" for seekers (not admin/provider)
  const { role, isLoading: roleLoading, isAuthenticated, userId } = useUserRole();
  const isSeekerLoggedIn = isAuthenticated && role === "seeker";
  const { favoritesCount } = useFavorites();

  // Fetch seeker profile for avatar display on public navbar
  const { data: seekerProfile } = useQuery({
    queryKey: ['seeker-nav-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('seeker_profiles')
        .select('display_name, first_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      return data;
    },
    enabled: isSeekerLoggedIn && !!userId,
    staleTime: 60000,
  });

  const seekerDisplayName = seekerProfile?.first_name || seekerProfile?.display_name;
  const seekerInitials = seekerDisplayName
    ?.split(" ")
    .map((n: string) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

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
      <header className="sticky top-0 z-50 w-full border-b bg-background border-border will-change-transform" style={{ contain: 'layout style' }}>
        <div className="container flex h-16 items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          {/* Logo - Left aligned */}
          <Link to="/" className="flex-shrink-0">
            <img 
              src={headerLogo}
              alt="RehabLookup" 
              className="h-8 w-auto"
              width={134}
              height={32}
              loading="eager"
              decoding="async"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {/* Primary nav items - always visible on md+ */}
            {primaryNavLinks.map((link) => {
              const isActive = location.pathname === link.href || 
                (link.href !== "/" && location.pathname.startsWith(link.href));
              
              return (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center h-10 px-2.5 lg:px-3.5 text-sm lg:text-[15px] font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </PrefetchLink>
              );
            })}

            {/* Secondary nav items - hidden on tablet, visible on lg+ */}
            {secondaryNavLinks.map((link) => {
              const isActive = location.pathname === link.href || 
                (link.href !== "/" && location.pathname.startsWith(link.href));
              
              return (
                <PrefetchLink
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "hidden lg:flex items-center h-10 px-3.5 text-[15px] font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </PrefetchLink>
              );
            })}

            {/* For Providers mega-menu - hidden on tablet, visible on lg+ */}
            <div className="hidden lg:block relative">
              <button
                onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                onMouseEnter={() => setProviderDropdownOpen(true)}
                className={cn(
                  "flex items-center h-10 gap-1 px-3.5 text-[15px] font-medium transition-colors whitespace-nowrap",
                  location.pathname.startsWith("/for-providers") || location.pathname.startsWith("/provider-guides")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                For Providers
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  providerDropdownOpen && "rotate-180"
                )} />
              </button>
              {providerDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProviderDropdownOpen(false)} />
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-background border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
                    onMouseLeave={() => setProviderDropdownOpen(false)}
                  >
                    <ProviderMegaMenu onNavigate={() => setProviderDropdownOpen(false)} />
                  </div>
                </>
              )}
            </div>

            {/* "More" dropdown - visible on tablet only */}
            <DropdownMenu open={moreDropdownOpen} onOpenChange={setMoreDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex lg:hidden items-center h-10 gap-1 px-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  More
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    moreDropdownOpen && "rotate-180"
                  )} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background border border-border shadow-lg z-50">
                {secondaryNavLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <PrefetchLink
                      to={link.href}
                      className="w-full cursor-pointer"
                      onClick={() => setMoreDropdownOpen(false)}
                    >
                      {link.label}
                    </PrefetchLink>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild>
                  <PrefetchLink
                    to="/for-providers"
                    className="w-full cursor-pointer"
                    onClick={() => setMoreDropdownOpen(false)}
                  >
                    For Providers
                  </PrefetchLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

            {/* Desktop CTAs - min-w prevents layout shift during auth loading */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0 min-w-[140px] lg:min-w-[200px] justify-end">
              {isSeekerLoggedIn ? (
                <PrefetchLink to="/account">
                  <Button size="sm" variant="ghost" className="h-9 text-sm gap-0 relative px-1">
                    <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-2 py-1">
                      <Avatar className="h-6 w-6">
                        {seekerProfile?.avatar_url ? (
                          <AvatarImage src={seekerProfile.avatar_url} alt={seekerDisplayName || "Account"} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {seekerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline">{seekerDisplayName || "Account"}</span>
                      <span className="lg:hidden">Account</span>
                    </div>
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Button>
                </PrefetchLink>
              ) : (
                <>
                  <PrefetchLink to="/provider-signup" className="hidden lg:block">
                    <Button size="sm" variant="outline" className="h-8 text-sm">
                      Get Listed
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
          "fixed top-0 right-0 z-[101] h-full w-[320px] max-w-[85vw] md:hidden transition-all duration-500",
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
                        <button
                          onClick={() => setMobileProviderExpanded(!mobileProviderExpanded)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all duration-200",
                            isProviderActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted active:scale-[0.98]",
                            mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                          )}
                          style={{ transitionDelay: mobileMenuOpen ? `${delay}ms` : '0ms' }}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={cn(
                              "h-5 w-5 shrink-0",
                              isProviderActive ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span>{link.label}</span>
                          </div>
                          <ChevronDown className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            mobileProviderExpanded && "rotate-180"
                          )} />
                        </button>
                        {/* Provider mega-menu mobile - collapsible */}
                        <div className={cn(
                          "ml-4 overflow-hidden transition-all duration-300",
                          mobileProviderExpanded ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
                        )}>
                          <ProviderMegaMenuMobile onNavigate={() => setMobileMenuOpen(false)} />
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
                  <Button variant="outline" className="w-full h-11 text-sm font-medium rounded-xl gap-0 relative px-2">
                    <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-2 py-1">
                      <Avatar className="h-6 w-6">
                        {seekerProfile?.avatar_url ? (
                          <AvatarImage src={seekerProfile.avatar_url} alt={seekerDisplayName || "Account"} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {seekerInitials}
                        </AvatarFallback>
                      </Avatar>
                      {seekerDisplayName || "My Account"}
                    </div>
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
                      Get Listed
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