import { useLocation, useNavigate } from "react-router-dom";
import { useTransition } from "react";
import {
  Home,
  Users,
  BarChart3,
  Building2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingInquiriesCount } from "@/hooks/usePendingInquiriesCount";

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

// The four most common provider jobs stay one tap away on mobile. Featured,
// plan/billing, reviews, claims, settings, and help live under More.
const navItems = [
  { href: "/provider/dashboard", label: "Home", icon: Home },
  { href: "/provider/listings", label: "Listings", icon: Building2 },
  { href: "/provider/inquiries", label: "Inquiries", icon: Users },
  { href: "/provider/analytics", label: "Performance", icon: BarChart3 },
];

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const location = useLocation();
  const navNavigate = useNavigate();
  const [, startTransition] = useTransition();
  const { count: pendingInquiriesCount } = usePendingInquiriesCount();

  const isPrimaryRoute = navItems.some((item) => {
    if (item.href === "/provider/listings") {
      return location.pathname === item.href || location.pathname.startsWith("/provider/listings/");
    }
    return location.pathname === item.href;
  });
  const isMoreActive = location.pathname.startsWith("/provider") && !isPrimaryRoute;

  return (
    <nav
      className="lg:hidden z-40 w-full bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom shadow-[0_-4px_16px_-8px_hsl(var(--foreground)/0.15)]"
      aria-label="Provider primary navigation"
    >
      <div className="flex h-16 items-stretch justify-around px-1">
        {navItems.map((item) => {
          const isActive = item.href === "/provider/listings"
            ? location.pathname === item.href || location.pathname.startsWith("/provider/listings/")
            : location.pathname === item.href;
          const Icon = item.icon;
          const isInquiriesItem = item.href === "/provider/inquiries";
          const showBadge = isInquiriesItem && pendingInquiriesCount > 0;

          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                startTransition(() => {
                  navNavigate(item.href);
                });
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex min-w-0 flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-all duration-200 active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <div className="relative">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                  isActive && "bg-primary/15",
                )}>
                  <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                </div>
                {showBadge && (
                  <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none tabular-nums text-white ring-2 ring-card">
                    {pendingInquiriesCount > 9 ? "9+" : pendingInquiriesCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "max-w-full truncate text-[10px] font-medium leading-tight sm:text-xs",
                isActive ? "font-semibold text-primary" : "text-muted-foreground",
              )}>
                {item.label}
              </span>
            </a>
          );
        })}

        <button
          onClick={onMoreClick}
          aria-label="More navigation options"
          aria-current={isMoreActive ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-all duration-200 active:scale-95",
            isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
            isMoreActive && "bg-primary/15",
          )}>
            <MoreHorizontal className={cn("h-5 w-5 transition-transform", isMoreActive && "scale-110")} />
          </div>
          <span className={cn(
            "text-[10px] font-medium leading-tight sm:text-xs",
            isMoreActive ? "font-semibold text-primary" : "text-muted-foreground",
          )}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
