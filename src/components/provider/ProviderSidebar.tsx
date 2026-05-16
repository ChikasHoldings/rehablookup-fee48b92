import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useTransition } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings,
  BarChart3,
  Sparkles,
  Star,
  HelpCircle,
  Megaphone,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useProStatus } from "@/hooks/useProStatus";
import { usePendingConciergeCount } from "@/hooks/usePendingConciergeCount";
import { usePendingInternationalCount } from "@/hooks/usePendingInternationalCount";
import { usePendingInquiriesCount } from "@/hooks/usePendingInquiriesCount";
import { prefetchRoute } from "@/lib/routePrefetch";

interface ProviderSidebarProps {
  onNavigate?: () => void;
}

// Subscription and Marketing are surfaced as distinct nav entries so
// providers don't conflate the foundational plan (Free/Pro) with the
// growth tools (Featured/Concierge). Wallet/Network/legacy entries
// removed; the canonical surfaces are /provider/subscription and
// /provider/marketing.
const navItems = [
  { href: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/provider/inquiries", label: "Leads", icon: Users },
  { href: "/provider/listings", label: "My Listing", icon: Building2 },
  { href: "/provider/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/provider/reviews", label: "Reviews", icon: Star },
  { href: "/provider/billing", label: "Subscription", icon: CreditCard },
  { href: "/provider/marketing", label: "Marketing", icon: Megaphone },
  { href: "/provider/settings", label: "Settings", icon: Settings },
  { href: "/provider/help", label: "Help & Support", icon: HelpCircle },
];

export function ProviderSidebar({ onNavigate }: ProviderSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { selectedFacility } = useSelectedFacility();
  const { data: proStatus } = useProStatus();
  const { count: pendingDomesticCount } = usePendingConciergeCount(selectedFacility?.id);
  const { count: pendingInternationalCount } = usePendingInternationalCount(selectedFacility?.id);
  const { count: pendingInquiriesCount } = usePendingInquiriesCount();

  // Combined placement count for badge
  const totalPlacementCount = pendingDomesticCount + pendingInternationalCount;

  // Prefetch route on hover for instant navigation
  const handleMouseEnter = useCallback((path: string) => {
    prefetchRoute(path);
  }, []);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate?.();
    startTransition(() => {
      navigate(href);
    });
  }, [navigate, onNavigate, startTransition]);

  return (
    <div className="flex flex-col h-full">
      <nav className="p-2 flex-1 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const isInquiriesItem = item.href === "/provider/inquiries";
            const isPlacementItem = item.href === "/provider/placement-network";
            const showInquiriesBadge = isInquiriesItem && pendingInquiriesCount > 0;
            const showPlacementBadge = isPlacementItem && totalPlacementCount > 0;
            const showBadge = showInquiriesBadge || showPlacementBadge;
            const badgeCount = isInquiriesItem ? pendingInquiriesCount : totalPlacementCount;
            const badgeLabel = isInquiriesItem ? "new" : "pending";
            
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  onMouseEnter={() => handleMouseEnter(item.href)}
                  className={cn(
                    "group flex items-center gap-2.5 lg:gap-3 px-2.5 lg:px-3 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-7 w-7 lg:h-8 lg:w-8 rounded-md transition-colors relative shrink-0",
                    isActive 
                      ? "bg-white/20" 
                      : "bg-muted group-hover:bg-background"
                  )}>
                    <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className="truncate flex-1 text-xs lg:text-sm">{item.label}</span>
                  {showBadge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "h-4 px-1 text-[9px] font-semibold shrink-0 hidden sm:flex",
                        isActive 
                          ? "bg-white/20 text-white" 
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount} {badgeLabel}
                    </Badge>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Credit Balance & Pro Status Card */}
      <div className="p-2 border-t border-border">
        <div className={cn(
          "rounded-lg p-2.5 transition-all",
          proStatus?.isPro 
            ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20" 
            : "bg-gradient-to-br from-primary/5 to-primary/10"
        )}>
          {proStatus?.isPro ? (
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">Pro Active</span>
            </div>
          ) : (
            <a
              href="/provider/billing"
              onClick={(e) => handleNavClick(e, "/provider/billing")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span>Upgrade to Pro</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
