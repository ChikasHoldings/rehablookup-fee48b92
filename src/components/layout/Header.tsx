import { useState, useEffect, useRef, type CSSProperties } from "react";
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
import { FindTreatmentMegaMenu, FindTreatmentMegaMenuMobile } from "@/components/mega-menus/FindTreatmentMegaMenu";
import { ResourcesMegaMenu, ResourcesMegaMenuMobile } from "@/components/mega-menus/ResourcesMegaMenu";
import { InternationalMegaMenu, InternationalMegaMenuMobile } from "@/components/mega-menus/InternationalMegaMenu";

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

// Nav items with mega-menus
type MegaMenuItem = {
  id: string;
  label: string;
  isActive: (path: string) => boolean;
};

const megaMenuItems: MegaMenuItem[] = [
  {
    id: "find-treatment",
    label: "Find Rehab",
    isActive: (p) => p.startsWith("/rehab-centers") || p.startsWith("/treatment-types") || p.includes("-near-me"),
  },
  {
    id: "resources",
    label: "Resources",
    isActive: (p) => p.startsWith("/resources") || p === "/insurance" || p === "/cost-estimator" || p === "/how-it-works" || p === "/faq",
  },
  {
    id: "international",
    label: "US Treatment",
    isActive: (p) => p.startsWith("/international") || p.startsWith("/us-rehab"),
  },
  {
    id: "for-providers",
    label: "For Providers",
    isActive: (p) => p.startsWith("/for-providers") || p.startsWith("/provider-guides") || p.startsWith("/providers/resources"),
  },
];

// Standalone nav links (no mega-menu)
const standaloneLinks: NavLink[] = [
  { href: "/concierge", label: "Concierge" },
];

// Icon mapping for mobile nav
const navIcons: Record<string, React.ElementType> = {
  "find-treatment": MapPin,
  "resources": BookOpen,
  "international": Globe,
  "for-providers": Building2,
  "/concierge": Heart,
};

// Which mega-menu component to render
function MegaMenuContent({ id, onNavigate }: { id: string; onNavigate: () => void }) {
  switch (id) {
    case "find-treatment": return <FindTreatmentMegaMenu onNavigate={onNavigate} />;
    case "resources": return <ResourcesMegaMenu onNavigate={onNavigate} />;
    case "international": return <InternationalMegaMenu onNavigate={onNavigate} />;
    case "for-providers": return <ProviderMegaMenu onNavigate={onNavigate} />;
    default: return null;
  }
}

function MegaMenuMobileContent({ id, onNavigate }: { id: string; onNavigate: () => void }) {
  switch (id) {
    case "find-treatment": return <FindTreatmentMegaMenuMobile onNavigate={onNavigate} />;
    case "resources": return <ResourcesMegaMenuMobile onNavigate={onNavigate} />;
    case "international": return <InternationalMegaMenuMobile onNavigate={onNavigate} />;
    case "for-providers": return <ProviderMegaMenuMobile onNavigate={onNavigate} />;
    default: return null;
  }
}

export function Header({ 
  ctaLink = "/concierge",
  ctaLabel = "Find Treatment",
  variant = "default"
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isLoading: roleLoading, isAuthenticated, userId } = useUserRole();
  const isSeekerLoggedIn = isAuthenticated && role === "seeker";
  const { favoritesCount } = useFavorites();

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

  // Close mega menu on route change
  useEffect(() => {
    setOpenMegaMenu(null);
  }, [location.pathname]);

  // Items visible on lg+
  const visibleOnLg = megaMenuItems;
  // Items in "More" dropdown on md (tablet)
  const tabletHiddenItems = megaMenuItems.slice(1); // hide Resources, International, For Providers on tablet

  const getDesktopMegaMenuStyle = (menuId: string): CSSProperties => {
    const gutter = 16;
    const menuWidths: Record<string, number> = {
      "find-treatment": 740,
      "resources": 680,
      "international": 700,
      "for-providers": 720,
    };

    if (typeof window === "undefined") {
      return {
        position: "fixed",
        top: "64px",
        left: `${gutter}px`,
        maxWidth: `calc(100vw - ${gutter * 2}px)`,
      };
    }

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const triggerEl = document.querySelector(`[data-nav-menu="${menuId}"]`) as HTMLElement | null;
    const menuWidth = Math.min(menuWidths[menuId] ?? 720, window.innerWidth - gutter * 2);

    if (!headerEl || !triggerEl) {
      return {
        position: "fixed",
        top: "64px",
        left: `${gutter}px`,
        maxWidth: `calc(100vw - ${gutter * 2}px)`,
      };
    }

    const headerRect = headerEl.getBoundingClientRect();
    const triggerRect = triggerEl.getBoundingClientRect();
    const preferredLeft = triggerRect.left + triggerRect.width / 2 - menuWidth / 2;
    const safeLeft = Math.min(
      Math.max(preferredLeft, gutter),
      window.innerWidth - gutter - menuWidth
    );

    return {
      position: "fixed",
      top: `${Math.round(headerRect.bottom)}px`,
      left: `${Math.round(safeLeft)}px`,
      maxWidth: `calc(100vw - ${gutter * 2}px)`,
    };
  };

  return (
    <>
      {/* Backdrop for closing mega menus */}
      {openMegaMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMegaMenu(null)} />
      )}
      <header className="sticky top-0 z-50 w-full border-b bg-background border-border will-change-transform" style={{ contain: 'layout style' }}>
        <div className="container flex h-16 items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          {/* Logo */}
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
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-0">
            {/* Find Rehab mega-menu - always visible on md+ */}
            <div
              className="relative"
              data-nav-menu="find-treatment"
              onMouseEnter={() => {
                if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
                setOpenMegaMenu("find-treatment");
              }}
              onMouseLeave={() => {
                megaMenuTimeoutRef.current = setTimeout(() => setOpenMegaMenu(null), 150);
              }}
            >
              <button
                onClick={() => setOpenMegaMenu(openMegaMenu === "find-treatment" ? null : "find-treatment")}
                className={cn(
                  "flex items-center h-16 gap-1 px-2.5 lg:px-3 text-sm lg:text-[14px] font-medium transition-colors whitespace-nowrap border-b-2",
                  openMegaMenu === "find-treatment"
                    ? "text-foreground border-accent"
                    : megaMenuItems[0].isActive(location.pathname)
                      ? "text-foreground border-transparent"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                Find Rehab
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", openMegaMenu === "find-treatment" && "rotate-180")} />
              </button>
              {openMegaMenu === "find-treatment" && (
                <div
                  className="fixed mt-0 z-50 bg-popover border border-border rounded-xl shadow-xl shadow-foreground/[0.06] animate-in fade-in-0 slide-in-from-top-1 duration-150"
                  style={getDesktopMegaMenuStyle("find-treatment")}
                >
                  <FindTreatmentMegaMenu onNavigate={() => setOpenMegaMenu(null)} />
                </div>
              )}
            </div>

            {/* Concierge - standalone link */}
            {standaloneLinks.map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                className={cn(
                  "flex items-center h-16 px-2.5 lg:px-3 text-sm lg:text-[14px] font-medium transition-colors whitespace-nowrap border-b-2 border-transparent",
                  location.pathname === link.href ? "text-foreground border-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </PrefetchLink>
            ))}

            {/* Resources, International, For Providers - visible on lg+ */}
            {megaMenuItems.slice(1).map((item) => (
              <div
                key={item.id}
                className="hidden lg:block relative"
                onMouseEnter={() => {
                  if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
                  setOpenMegaMenu(item.id);
                }}
                onMouseLeave={() => {
                  megaMenuTimeoutRef.current = setTimeout(() => setOpenMegaMenu(null), 150);
                }}
              >
                <button
                  onClick={() => setOpenMegaMenu(openMegaMenu === item.id ? null : item.id)}
                  className={cn(
                    "flex items-center h-16 gap-1 px-3 text-[14px] font-medium transition-colors whitespace-nowrap border-b-2",
                    openMegaMenu === item.id
                      ? "text-foreground border-accent"
                      : item.isActive(location.pathname)
                        ? "text-foreground border-transparent"
                        : "text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  {item.label}
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", openMegaMenu === item.id && "rotate-180")} />
                </button>
                {openMegaMenu === item.id && (
                  <div className={cn(
                    "absolute top-full mt-0 z-50 bg-popover border border-border rounded-xl shadow-xl shadow-foreground/[0.06] animate-in fade-in-0 slide-in-from-top-1 duration-150 max-w-[calc(100vw-2rem)]",
                    item.id === "for-providers" || item.id === "international" ? "right-0" : "left-1/2 -translate-x-1/2"
                  )}>
                    <MegaMenuContent id={item.id} onNavigate={() => setOpenMegaMenu(null)} />
                  </div>
                )}
              </div>
            ))}

            {/* "More" dropdown on tablet */}
            <DropdownMenu open={moreDropdownOpen} onOpenChange={setMoreDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex lg:hidden items-center h-16 gap-1 px-2.5 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent">
                  More
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", moreDropdownOpen && "rotate-180")} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border border-border shadow-lg z-50">
                {tabletHiddenItems.map((item) => {
                  const linkMap: Record<string, string> = {
                    "resources": "/resources",
                    "international": "/international",
                    "for-providers": "/for-providers",
                  };
                  return (
                    <DropdownMenuItem key={item.id} asChild>
                      <PrefetchLink
                        to={linkMap[item.id] || "/"}
                        className="w-full cursor-pointer"
                        onClick={() => setMoreDropdownOpen(false)}
                      >
                        {item.label}
                      </PrefetchLink>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuItem asChild>
                  <PrefetchLink to="/concierge" className="w-full cursor-pointer" onClick={() => setMoreDropdownOpen(false)}>
                    Concierge
                  </PrefetchLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* CTA & Mobile Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <PrefetchLink
              to="/rehab-centers"
              className="flex h-10 w-10 items-center justify-center rounded-lg md:hidden text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Search facilities"
            >
              <Search className="h-5 w-5" />
            </PrefetchLink>

            <button
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg md:hidden transition-all duration-200 bg-primary hover:bg-primary/90 active:scale-95",
                mobileMenuOpen && "bg-primary/90"
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-primary-foreground" /> : <Menu className="h-5 w-5 text-primary-foreground" />}
            </button>

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
                    <Button size="sm" variant="outline" className="h-8 text-sm">Get Listed</Button>
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

      {/* Mobile Menu Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] md:hidden transition-all duration-500 ease-out",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-foreground/20 via-foreground/30 to-foreground/40 backdrop-blur-md transition-all duration-500",
          mobileMenuOpen ? "opacity-100" : "opacity-0"
        )} />
      </div>

      {/* Mobile Slide Panel */}
      <div 
        className={cn(
          "fixed top-0 right-0 z-[101] h-full w-[320px] max-w-[85vw] md:hidden transition-all duration-500",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="absolute inset-0 bg-background border-l border-border/40 shadow-2xl shadow-foreground/10" />
        <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-primary via-primary/30 to-transparent">
          <div className="absolute top-0 left-0 w-4 h-32 bg-gradient-to-r from-primary/20 to-transparent blur-xl" />
        </div>
        
        <div className="relative h-full flex flex-col">
          {/* Header */}
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
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <nav className="px-5 pt-6 pb-4">
              <div className="space-y-1">
                {/* Mega-menu items as expandable sections */}
                {megaMenuItems.map((item, index) => {
                  const Icon = navIcons[item.id] || ChevronRight;
                  const isExpanded = mobileExpandedMenu === item.id;
                  const delay = 150 + index * 40;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setMobileExpandedMenu(isExpanded ? null : item.id)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all duration-200",
                          item.isActive(location.pathname) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted active:scale-[0.98]",
                          mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                        )}
                        style={{ transitionDelay: mobileMenuOpen ? `${delay}ms` : '0ms' }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-5 w-5 shrink-0", item.isActive(location.pathname) ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                      </button>
                      <div className={cn(
                        "ml-4 overflow-hidden transition-all duration-300",
                        isExpanded ? "max-h-[600px] opacity-100 mt-1" : "max-h-0 opacity-0"
                      )}>
                        <MegaMenuMobileContent id={item.id} onNavigate={() => setMobileMenuOpen(false)} />
                      </div>
                    </div>
                  );
                })}

                {/* Standalone links */}
                {standaloneLinks.map((link, index) => {
                  const Icon = navIcons[link.href] || ChevronRight;
                  const delay = 150 + (megaMenuItems.length + index) * 40;
                  return (
                    <PrefetchLink
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all duration-200",
                        location.pathname === link.href ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted active:scale-[0.98]",
                        mobileMenuOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                      )}
                      style={{ transitionDelay: mobileMenuOpen ? `${delay}ms` : '0ms' }}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", location.pathname === link.href ? "text-primary" : "text-muted-foreground")} />
                      <span>{link.label}</span>
                    </PrefetchLink>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Footer CTA */}
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
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">{seekerInitials}</AvatarFallback>
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
                    <Button className="w-full h-12 text-sm font-medium rounded-xl bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg shadow-primary/25 gap-2">
                      <User className="h-4 w-4" />
                      Sign In
                    </Button>
                  </PrefetchLink>
                  <PrefetchLink to="/provider-signup" onClick={() => setMobileMenuOpen(false)} className="block">
                    <Button variant="outline" className="w-full h-11 text-sm rounded-xl">Get Listed</Button>
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
