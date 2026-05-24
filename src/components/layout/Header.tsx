import { useState, useEffect, useRef, lazy, Suspense, type CSSProperties } from "react";
import headerLogo from "@/assets/logo-header.webp";
import { Link, useLocation } from "react-router-dom";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronRight, Heart, MapPin, BookOpen, Building2, User, ChevronDown, Search, Globe, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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

// Mega-menus are only visible after the user opens a nav dropdown, so we
// lazy-load them. This pulls ~40-60 kB off the every-page shell chunk.
const FindTreatmentMegaMenu = lazy(() =>
  import("@/components/mega-menus/FindTreatmentMegaMenu").then((m) => ({ default: m.FindTreatmentMegaMenu })));
const FindTreatmentMegaMenuMobile = lazy(() =>
  import("@/components/mega-menus/FindTreatmentMegaMenu").then((m) => ({ default: m.FindTreatmentMegaMenuMobile })));
const ResourcesMegaMenu = lazy(() =>
  import("@/components/mega-menus/ResourcesMegaMenu").then((m) => ({ default: m.ResourcesMegaMenu })));
const ResourcesMegaMenuMobile = lazy(() =>
  import("@/components/mega-menus/ResourcesMegaMenu").then((m) => ({ default: m.ResourcesMegaMenuMobile })));
const InternationalMegaMenu = lazy(() =>
  import("@/components/mega-menus/InternationalMegaMenu").then((m) => ({ default: m.InternationalMegaMenu })));
const InternationalMegaMenuMobile = lazy(() =>
  import("@/components/mega-menus/InternationalMegaMenu").then((m) => ({ default: m.InternationalMegaMenuMobile })));
const ProviderMegaMenu = lazy(() =>
  import("@/components/provider-guides/ProviderMegaMenu").then((m) => ({ default: m.ProviderMegaMenu })));
const ProviderMegaMenuMobile = lazy(() =>
  import("@/components/provider-guides/ProviderMegaMenu").then((m) => ({ default: m.ProviderMegaMenuMobile })));

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
    isActive: (p) => p === "/search-results" || p.startsWith("/rehab-centers") || p.startsWith("/treatment-types") || p.includes("-near-me"),
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
        top: "68px",
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
        top: "68px",
        left: `${gutter}px`,
        maxWidth: `calc(100vw - ${gutter * 2}px)`,
      };
    }

    const headerRect = headerEl.getBoundingClientRect();
    const triggerRect = triggerEl.getBoundingClientRect();
    // Align dropdown left edge to trigger left edge (not centered)
    const preferredLeft = triggerRect.left;
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
      {/* sticky (was: fixed) — sticky keeps the header in normal flow so the
          InternationalBanner above it doesn't create a 44px gap between the
          fixed header and the hero on non-US sessions. Behavior on scroll is
          identical: header pins to viewport top. getBoundingClientRect()
          still returns viewport-relative coordinates so the mega-menu
          positioning below is unaffected. */}
      <header className="sticky top-0 z-50 w-full border-b bg-background border-border will-change-transform" style={{ contain: 'layout style' }}>
        <div className="container flex h-[68px] items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            {/* width/height MUST match the natural aspect ratio of the
                source file (400×73 in src/assets/logo-header.webp) or
                the browser reserves the wrong-shape placeholder box and
                shifts the entire navbar horizontally when the image
                resolves. Scaled to h-9 (36px tall): 36 × (400/73) ≈ 197. */}
            <img
              src={headerLogo}
              alt="RehabLookup"
              className="h-9 w-auto"
              width={197}
              height={36}
              loading="eager"
              decoding="async"
              fetchPriority="high"
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
                  "flex items-center h-[68px] gap-1 px-2.5 lg:px-3 text-[14px] lg:text-[15px] font-semibold transition-colors whitespace-nowrap border-b-2",
                  openMegaMenu === "find-treatment"
                    ? "text-foreground border-accent"
                    : megaMenuItems[0].isActive(location.pathname)
                      ? "text-foreground border-transparent"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                Find Rehab
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", openMegaMenu === "find-treatment" && "rotate-180")} />
              </button>
              {openMegaMenu === "find-treatment" && (
                <div
                  className="fixed mt-0 z-50 bg-popover border border-border rounded-xl shadow-xl shadow-foreground/[0.06] animate-in fade-in-0 slide-in-from-top-1 duration-150"
                  style={getDesktopMegaMenuStyle("find-treatment")}
                >
                  {/* Suspense is REQUIRED — FindTreatmentMegaMenu is lazy()
                      (Phase 5A code-split). Without a fallback boundary here,
                      React throws "A component suspended while rendering, but
                      no fallback UI was specified" the first time a user
                      opens the Find Treatment desktop dropdown, which crashes
                      the header. The standard nav-item path lower in this file
                      already wraps MegaMenuContent in Suspense (search for
                      `<MegaMenuContent`); this is the standalone path for the
                      Find Treatment item and needs the same wrapper. */}
                  <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading…</div>}>
                    <FindTreatmentMegaMenu onNavigate={() => setOpenMegaMenu(null)} />
                  </Suspense>
                </div>
              )}
            </div>

            {/* Concierge - standalone link */}
            {standaloneLinks.map((link) => (
              <PrefetchLink
                key={link.href}
                to={link.href}
                className={cn(
                  "flex items-center h-[68px] px-2.5 lg:px-3 text-[14px] lg:text-[15px] font-semibold transition-colors whitespace-nowrap border-b-2 border-transparent",
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
                data-nav-menu={item.id}
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
                    "flex items-center h-[68px] gap-1 px-3 text-[15px] font-semibold transition-colors whitespace-nowrap border-b-2",
                    openMegaMenu === item.id
                      ? "text-foreground border-accent"
                      : item.isActive(location.pathname)
                        ? "text-foreground border-transparent"
                        : "text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  {item.label}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", openMegaMenu === item.id && "rotate-180")} />
                </button>
                {openMegaMenu === item.id && (
                  <div
                    className="fixed mt-0 z-50 bg-popover border border-border rounded-xl shadow-xl shadow-foreground/[0.06] animate-in fade-in-0 slide-in-from-top-1 duration-150"
                    style={getDesktopMegaMenuStyle(item.id)}
                  >
                    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Loading…</div>}>
                      <MegaMenuContent id={item.id} onNavigate={() => setOpenMegaMenu(null)} />
                    </Suspense>
                  </div>
                )}
              </div>
            ))}

            {/* "More" dropdown on tablet */}
            <DropdownMenu open={moreDropdownOpen} onOpenChange={setMoreDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="flex lg:hidden items-center h-[68px] gap-1 px-2.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent">
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
              to="/search-results"
              className="flex h-11 w-11 items-center justify-center rounded-lg md:hidden text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Search facilities"
            >
              <Search className="h-5 w-5" />
            </PrefetchLink>

            <button
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg md:hidden transition-all duration-200 bg-primary hover:bg-primary/90 active:scale-95",
                mobileMenuOpen && "bg-primary/90"
              )}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-primary-foreground" /> : <Menu className="h-5 w-5 text-primary-foreground" />}
            </button>

            <div className="hidden md:flex items-center gap-2 flex-shrink-0 min-w-[140px] lg:min-w-[200px] justify-end">
              {/* Render nothing while role is still resolving — the
                  min-w on the parent already reserves space. Prevents
                  the Sign-In/Account flash where the un-resolved
                  isAuthenticated=false briefly paints "Sign In" then
                  snaps to the account pill once the session lands.
                  Mobile-menu footer (line ~593) already uses the same
                  guard pattern. */}
              {roleLoading ? null : isSeekerLoggedIn ? (
                <PrefetchLink to="/account">
                  <Button size="sm" variant="ghost" className="h-9 text-sm gap-0 relative px-1">
                    <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-2 py-1">
                      <Avatar className="h-6 w-6">
                        {seekerProfile?.avatar_url ? (
                          <AvatarImage src={seekerProfile.avatar_url} alt={seekerDisplayName || "Account"} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {seekerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline">{seekerDisplayName || "Account"}</span>
                      <span className="lg:hidden">Account</span>
                    </div>
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Button>
                </PrefetchLink>
              ) : (
                <>
                  {/* Header CTAs bumped from h-8 (32px) to default size
                      (h-11 on mobile via primitive). "List Your Facility"
                      and "Sign In" are primary global-nav CTAs — sub-tap-
                      target sizing was hostile on phones. The PrefetchLink
                      wrapping pattern is preserved so route-prefetch still
                      runs on hover. */}
                  <PrefetchLink to="/provider/onboarding" className="hidden lg:block">
                    <Button size="sm" variant="outline">List Your Facility</Button>
                  </PrefetchLink>
                  <PrefetchLink to="/login">
                    <Button size="sm" className="gap-1.5">
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
      {/* No spacer needed — header is sticky and takes normal flow space.
          (Was h-[68px] when header was position: fixed.) */}

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[100] md:hidden transition-all duration-400",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        // Hardening (2026-05-23): also reset the expanded-submenu state
        // on backdrop click. Without this, reopening the menu shows
        // whichever sub-section ("Find Rehab", "Resources", etc.) was
        // expanded when the user dismissed it — violating the
        // "menu closed = state reset" expectation.
        onClick={() => {
          setMobileMenuOpen(false);
          setMobileExpandedMenu(null);
        }}
      >
        <div className={cn(
          "absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-all duration-400",
          mobileMenuOpen ? "opacity-100" : "opacity-0"
        )} />
      </div>

      {/* Mobile Full-Screen Panel */}
      <div 
        className={cn(
          "fixed inset-0 z-[101] md:hidden transition-transform duration-500",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="absolute inset-0 bg-background" />
        
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 h-14 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                <span className="text-accent-foreground font-display font-bold text-xs">R</span>
              </div>
              <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">Menu</span>
            </div>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Menu Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 py-3">

              {/* Navigation Items */}
              <div className="space-y-1">
                {megaMenuItems.map((item) => {
                  const Icon = navIcons[item.id] || ChevronRight;
                  const isExpanded = mobileExpandedMenu === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setMobileExpandedMenu(isExpanded ? null : item.id)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition-all duration-200 active:scale-[0.98]",
                          isExpanded
                            ? "bg-muted/60 text-foreground"
                            : item.isActive(location.pathname)
                              ? "text-accent"
                              : "text-foreground hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isExpanded ? "bg-accent/15" : item.isActive(location.pathname) ? "bg-accent/10" : "bg-muted"
                          )}>
                            <Icon className={cn(
                              "h-[18px] w-[18px]",
                              isExpanded || item.isActive(location.pathname) ? "text-accent" : "text-muted-foreground"
                            )} />
                          </div>
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-300 shrink-0",
                          isExpanded && "rotate-180 text-accent"
                        )} />
                      </button>

                      {/* Expanded Content */}
                      <div className={cn(
                        "overflow-hidden transition-all duration-300",
                        isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                      )}>
                        <div className="pl-2 pr-1 pt-1 pb-2">
                          <Suspense fallback={<div className="p-3 text-xs text-muted-foreground">Loading…</div>}>
                            <MegaMenuMobileContent id={item.id} onNavigate={() => setMobileMenuOpen(false)} />
                          </Suspense>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="my-3 mx-1 border-t border-border/40" />

              {/* Standalone Links */}
              <div className="space-y-1">
                {standaloneLinks.map((link) => {
                  const Icon = navIcons[link.href] || ChevronRight;
                  return (
                    <PrefetchLink
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold transition-all duration-200 active:scale-[0.98]",
                        location.pathname === link.href ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted/40"
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        location.pathname === link.href ? "bg-accent/15" : "bg-muted"
                      )}>
                        <Icon className={cn("h-[18px] w-[18px]", location.pathname === link.href ? "text-accent" : "text-muted-foreground")} />
                      </div>
                      <span className="flex-1">{link.label}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </PrefetchLink>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="shrink-0 border-t border-border/40 p-4 bg-background">
            {!roleLoading && isSeekerLoggedIn ? (
              <PrefetchLink to="/account" onClick={() => setMobileMenuOpen(false)} className="block">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-accent/[0.08] to-primary/[0.06] border border-accent/15 p-3">
                  <Avatar className="h-10 w-10 ring-2 ring-accent/20">
                    {seekerProfile?.avatar_url ? (
                      <AvatarImage src={seekerProfile.avatar_url} alt={seekerDisplayName || "Account"} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-accent/15 text-accent text-xs font-bold">{seekerInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{seekerDisplayName || "My Account"}</p>
                    <p className="text-xs text-muted-foreground">View dashboard</p>
                  </div>
                  {favoritesCount > 0 && (
                    <span className="h-6 min-w-[24px] px-1.5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {favoritesCount > 9 ? '9+' : favoritesCount}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </PrefetchLink>
            ) : (
              <div className="space-y-2">
                <PrefetchLink to="/login" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-accent to-accent/90 text-accent-foreground shadow-lg shadow-accent/20 gap-2 active:scale-[0.98] transition-transform">
                    <User className="h-4 w-4" />
                    Sign In
                  </Button>
                </PrefetchLink>
                <PrefetchLink to="/provider/onboarding" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button variant="outline" className="w-full h-11 text-sm font-medium rounded-xl border-border/60 gap-2">
                    <Building2 className="h-4 w-4" />
                    List Your Facility
                  </Button>
                </PrefetchLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
