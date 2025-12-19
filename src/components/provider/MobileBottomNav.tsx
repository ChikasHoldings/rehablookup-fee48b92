import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  BarChart3,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

const navItems = [
  { href: "/provider/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/provider/listing", label: "Listing", icon: Building2 },
  { href: "/provider/leads", label: "Leads", icon: Users },
  { href: "/provider/analytics", label: "Analytics", icon: BarChart3 },
];

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const location = useLocation();
  const { selectedFacility } = useSelectedFacility();

  // Fetch new leads count
  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ["mobile-nav-leads-count", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return 0;
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", selectedFacility.id)
        .eq("status", "new");
      if (error) return 0;
      return count || 0;
    },
    enabled: !!selectedFacility?.id,
    refetchInterval: 30000,
    staleTime: 1000 * 60 * 2,
  });

  const isMoreActive = ["/provider/billing", "/provider/settings"].some(
    path => location.pathname.startsWith(path)
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          const isLeadsItem = item.href === "/provider/leads";
          const showBadge = isLeadsItem && newLeadsCount > 0;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px] transition-all duration-200 active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <div className={cn(
                  "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                </div>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {newLeadsCount > 9 ? "9+" : newLeadsCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive && "text-primary font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* More button */}
        <button
          onClick={onMoreClick}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl min-w-[60px] transition-all duration-200 active:scale-95",
            isMoreActive 
              ? "text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "flex items-center justify-center h-7 w-7 rounded-lg transition-all",
            isMoreActive && "bg-primary/10"
          )}>
            <MoreHorizontal className={cn("h-5 w-5 transition-transform", isMoreActive && "scale-110")} />
          </div>
          <span className={cn(
            "text-[10px] font-medium transition-colors",
            isMoreActive && "text-primary font-semibold"
          )}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
