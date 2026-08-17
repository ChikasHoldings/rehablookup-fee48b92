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
  PanelsTopLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useProStatus } from "@/hooks/useProStatus";
import { usePendingInquiriesCount } from "@/hooks/usePendingInquiriesCount";
import { prefetchRoute } from "@/lib/routePrefetch";

interface ProviderSidebarProps {
  onNavigate?: () => void;
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// Directory-first information architecture. The panel is organized around
// provider jobs instead of legacy product names: keep the directory listing
// accurate, handle direct engagement, understand performance, optionally buy
// clearly labeled exposure, then manage the account.
const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Directory",
    items: [
      { href: "/provider/listings", label: "Listings", icon: Building2 },
      { href: "/provider/listings/profile", label: "Enhanced Profile", icon: PanelsTopLeft },
      { href: "/provider/inquiries", label: "Inquiries", icon: Users },
      { href: "/provider/reviews", label: "Reviews", icon: Star },
      { href: "/provider/claims", label: "Listing Claims", icon: ShieldCheck },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/provider/analytics", label: "Performance", icon: BarChart3 },
      { href: "/provider/marketing", label: "Featured", icon: Megaphone },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/provider/billing", label: "Plan & Billing", icon: CreditCard },
      { href: "/provider/settings", label: "Settings", icon: Settings },
      { href: "/provider/help", label: "Help & Support", icon: HelpCircle },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  // Enhanced Profile is a child of /provider/listings. Keep only the child
  // highlighted while it is open so the sidebar never shows two active rows.
  if (href === "/provider/listings") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function ProviderSidebar({ onNavigate }: ProviderSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { selectedFacility } = useSelectedFacility();
  const { data: proStatus } = useProStatus(selectedFacility?.id);
  const { count: pendingInquiriesCount } = usePendingInquiriesCount();

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
        <div className="space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = isItemActive(location.pathname, item.href);
                  const Icon = item.icon;
                  const isInquiriesItem = item.href === "/provider/inquiries";
                  const showBadge = isInquiriesItem && pendingInquiriesCount > 0;

                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={(e) => handleNavClick(e, item.href)}
                        onMouseEnter={() => handleMouseEnter(item.href)}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[14px] font-medium transition-colors",
                          isActive
                            ? "bg-[#1B365D]/5 text-[#1B365D]"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
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
                              isActive ? "bg-[#1B365D] text-white" : "bg-rose-100 text-rose-700",
                            )}
                          >
                            {pendingInquiriesCount > 99 ? "99+" : pendingInquiriesCount}
                          </Badge>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        {proStatus?.isPro ? (
          <a
            href="/provider/listings/profile"
            onClick={(e) => handleNavClick(e, "/provider/listings/profile")}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 transition-colors hover:bg-amber-50"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-amber-900">Pro listing active</p>
              <p className="text-[11px] text-amber-700">Manage enhanced profile</p>
            </div>
          </a>
        ) : (
          <a
            href="/provider/billing"
            onClick={(e) => handleNavClick(e, "/provider/billing")}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-[#1B365D]/30 hover:bg-slate-50"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-[#1B365D]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-slate-900">Upgrade to Pro</p>
              <p className="text-[11px] text-slate-500">Phone, rich profile, more media</p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
