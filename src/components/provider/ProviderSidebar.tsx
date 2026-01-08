import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wallet, 
  Settings,
  BarChart3,
  Sparkles,
  Star,
  History,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProviderCredits } from "@/hooks/useProviderCredits";
import { useProStatus } from "@/hooks/useProStatus";

interface ProviderSidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { href: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/provider/inquiries", label: "Inquiries", icon: Users },
  { href: "/provider/credits", label: "Credits & Payments", icon: Wallet },
  { href: "/provider/unlock-history", label: "Unlock History", icon: History },
  { href: "/provider/pro-upgrade", label: "Pro Visibility", icon: Sparkles },
  { href: "/provider/placement", label: "Placement Network", icon: Network },
  { href: "/provider/reviews", label: "Reviews", icon: Star },
  { href: "/provider/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/provider/listing", label: "My Listing", icon: Building2 },
  { href: "/provider/settings", label: "Settings", icon: Settings },
];

export function ProviderSidebar({ onNavigate }: ProviderSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedFacility } = useSelectedFacility();
  const queryClient = useQueryClient();
  const { balanceFormatted } = useProviderCredits(selectedFacility?.id);
  const { data: proStatus } = useProStatus();

  // Fetch new inquiries count
  const { data: newInquiriesCount = 0 } = useQuery({
    queryKey: ["new-inquiries-count", selectedFacility?.id],
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
  });

  // Subscribe to realtime lead changes
  useEffect(() => {
    if (!selectedFacility?.id) return;
    const channel = supabase
      .channel("sidebar-inquiries-count")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "leads", filter: `facility_id=eq.${selectedFacility.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["new-inquiries-count", selectedFacility.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedFacility?.id, queryClient]);

  return (
    <div className="flex flex-col h-full">
      <nav className="p-2 sm:p-3 flex-1">
        <ul className="space-y-0.5 sm:space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const isInquiriesItem = item.href === "/provider/inquiries";
            const showBadge = isInquiriesItem && newInquiriesCount > 0;
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-base font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-md sm:rounded-lg transition-colors relative",
                    isActive 
                      ? "bg-white/20" 
                      : "bg-muted group-hover:bg-background"
                  )}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 sm:h-4 sm:min-w-4 px-0.5 sm:px-1 flex items-center justify-center rounded-full bg-destructive text-[9px] sm:text-[10px] font-bold text-white">
                        {newInquiriesCount > 99 ? "99+" : newInquiriesCount}
                      </span>
                    )}
                  </div>
                  <span className="truncate flex-1 text-sm sm:text-base">{item.label}</span>
                  {showBadge && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-semibold",
                        isActive 
                          ? "bg-white/20 text-white" 
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {newInquiriesCount > 99 ? "99+" : newInquiriesCount} new
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Credit Balance & Pro Status Card */}
      <div className="p-2 sm:p-3 border-t border-border">
        <div className={cn(
          "rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all",
          proStatus?.isPro 
            ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20" 
            : "bg-gradient-to-br from-primary/5 to-primary/10"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Credits</span>
            </div>
            <span className="text-sm font-bold text-foreground">{balanceFormatted}</span>
          </div>
          
          {proStatus?.isPro ? (
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] sm:text-xs text-amber-600 font-medium">
                Pro Active • {proStatus.unlockDiscountPercent}% off unlocks
              </span>
            </div>
          ) : (
            <Link 
              to="/provider/pro-upgrade"
              onClick={onNavigate}
              className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span>Upgrade to Pro for 20% off</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
