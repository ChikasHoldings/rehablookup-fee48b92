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
// usePendingInternationalCount retired 2026-05-20 — paid international placement product wound down.
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
  const { count: pendingInquiriesCount } = usePendingInquiriesCount();

  // International placement product retired 2026-05-20 — only domestic
  // concierge cases contribute to the placement badge now.
  const totalPlacementCount = pendingDomesticCount;

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
    <div className="flex h-full flex-col">
      <nav aria-label="Provider navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Manage
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const isInquiriesItem = item.href === "/provider/inquiries";
            // After the /provider/placement-network retirement, the
            // pending-concierge badge lives on the Marketing item
            // since /provider/marketing → /marketing/concierge is the
            // canonical surface where the provider acts on pending
            // cases. Old isPlacementItem name kept for clarity.
            const isPlacementItem = item.href === "/provider/marketing";
            const showInquiriesBadge = isInquiriesItem && pendingInquiriesCount > 0;
            const showPlacementBadge = isPlacementItem && totalPlacementCount > 0;
            const showBadge = showInquiriesBadge || showPlacementBadge;
            const badgeCount = isInquiriesItem ? pendingInquiriesCount : totalPlacementCount;

            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  onMouseEnter={() => handleMouseEnter(item.href)}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-[#1B365D]/5 text-[#1B365D]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Left indicator bar — directory pattern: 2px navy
                      bar on active, transparent otherwise. Cleaner than
                      a full-row colored background. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-y-1.5 left-0 w-0.5 rounded-r",
                      isActive ? "bg-[#1B365D]" : "bg-transparent",
                    )}
                  />
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-[#1B365D]" : "text-slate-500 group-hover:text-slate-700",
                    )}
                    aria-hidden
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {showBadge && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-5 shrink-0 px-1.5 text-[10px] font-semibold",
                        isActive
                          ? "bg-[#1B365D] text-white"
                          : "bg-rose-100 text-rose-700",
                      )}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </Badge>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Plan status card — compact, hairline border, no gradient */}
      <div className="border-t border-slate-200 p-3">
        {proStatus?.isPro ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-amber-900">Pro Active</p>
              <p className="text-[11px] text-amber-700">Manage in Subscription</p>
            </div>
          </div>
        ) : (
          <a
            href="/provider/billing"
            onClick={(e) => handleNavClick(e, "/provider/billing")}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 transition-colors hover:border-[#1B365D]/30 hover:bg-slate-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-900">Upgrade to Pro</p>
              <p className="text-[11px] text-slate-500">Analytics, video, priority</p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
