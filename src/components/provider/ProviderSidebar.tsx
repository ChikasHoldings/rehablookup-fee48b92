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
  ShieldCheck,
  HelpCircle,
  Megaphone,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useProStatus } from "@/hooks/useProStatus";
// Stage 3 (directory-model cutover): the pending-concierge badge was removed
// with the rest of the retired placement/Concierge provider UX. Only the
// selected-facility inquiry badge remains — see
// docs/directory-cutover-stage-03-provider-admin.md.
import { usePendingInquiriesCount } from "@/hooks/usePendingInquiriesCount";
import { prefetchRoute } from "@/lib/routePrefetch";

interface ProviderSidebarProps {
  onNavigate?: () => void;
}

// Directory-model provider navigation. Every entry answers one of the
// questions the provider panel exists to answer: is my listing accurate,
// am I receiving inquiries, how is my listing performing, are my reviews
// current, do I want Pro / Featured, do I need support.
//
// Subscription and Marketing stay distinct so providers don't conflate the
// foundational plan (Free/Pro) with the Featured visibility add-on.
const navItems = [
  { href: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/provider/inquiries", label: "Inquiries", icon: Users },
  { href: "/provider/listings", label: "My Listing", icon: Building2 },
  { href: "/provider/claims", label: "Claims", icon: ShieldCheck },
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
  // Scope the Pro badge to the SELECTED facility so a mixed-plan provider sees
  // Free/Pro consistently with the header + dashboard (was account-wide).
  const { data: proStatus } = useProStatus(selectedFacility?.id);
  const { count: pendingInquiriesCount } = usePendingInquiriesCount();

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
            // Prefix-match so secondary routes highlight their parent item:
            // /provider/listings/profile → My Listing, /provider/marketing/*
            // → Marketing, /provider/billing/* → Subscription. No nav href is a
            // prefix of another, so there's no cross-highlight.
            const isActive =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const isInquiriesItem = item.href === "/provider/inquiries";
            const showBadge = isInquiriesItem && pendingInquiriesCount > 0;
            const badgeCount = pendingInquiriesCount;

            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  onMouseEnter={() => handleMouseEnter(item.href)}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[15px] font-medium transition-colors",
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
                      "h-[18px] w-[18px] shrink-0",
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
