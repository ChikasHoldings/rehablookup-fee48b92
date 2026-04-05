import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useTransition } from "react";
import { 
  Home, 
  Users, 
  Network,
  Building2,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { usePendingInquiriesCount } from "@/hooks/usePendingInquiriesCount";
import { usePendingConciergeCount } from "@/hooks/usePendingConciergeCount";
import { usePendingInternationalCount } from "@/hooks/usePendingInternationalCount";

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

const navItems = [
  { href: "/provider/dashboard", label: "Home", icon: Home },
  { href: "/provider/inquiries", label: "Leads", icon: Users },
  { href: "/provider/placement-network", label: "Placement", icon: Network },
  { href: "/provider/listings", label: "Listings", icon: Building2 },
];

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const location = useLocation();
  const navNavigate = useNavigate();
  const [, startTransition] = useTransition();
  const { selectedFacility } = useSelectedFacility();

  // Use the same hooks as the sidebar for consistency
  const { count: pendingInquiriesCount } = usePendingInquiriesCount();
  const { count: pendingDomesticCount } = usePendingConciergeCount(selectedFacility?.id);
  const { count: pendingInternationalCount } = usePendingInternationalCount(selectedFacility?.id);
  
  const totalPlacementCount = pendingDomesticCount + pendingInternationalCount;

  const isMoreActive = [
    "/provider/billing", 
    "/provider/settings", 
    "/provider/reviews",
    "/provider/analytics",
    "/provider/embed-badge",
    "/provider/help",
    "/provider/knowledge-base",
    "/provider/notifications",
    "/provider/credits",
    "/provider/pro-upgrade",
  ].some(path => location.pathname.startsWith(path));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card backdrop-blur-lg border-t border-border safe-area-bottom shadow-2xl">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          const isLeadsItem = item.href === "/provider/inquiries";
          const isPlacementItem = item.href === "/provider/placement-network";
          const showBadge = (isLeadsItem && pendingInquiriesCount > 0) || (isPlacementItem && totalPlacementCount > 0);
          const badgeCount = isLeadsItem ? pendingInquiriesCount : totalPlacementCount;
          
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                e.preventDefault();
                startTransition(() => { navNavigate(item.href); });
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl min-w-[56px] transition-all duration-200 active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <div className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
                  isActive && "bg-primary/20"
                )}>
                  <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                </div>
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-xs font-bold text-white tabular-nums">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium transition-colors",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </a>
          );
        })}
        
        {/* More button */}
        <button
          onClick={onMoreClick}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl min-w-[56px] transition-all duration-200 active:scale-95",
            isMoreActive 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
            isMoreActive && "bg-primary/20"
          )}>
            <MoreHorizontal className={cn("h-5 w-5 transition-transform", isMoreActive && "scale-110")} />
          </div>
          <span className={cn(
            "text-xs font-medium transition-colors",
            isMoreActive ? "text-primary font-semibold" : "text-muted-foreground"
          )}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
