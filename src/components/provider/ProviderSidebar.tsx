import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings,
  BarChart3,
  Sparkles,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ProviderSidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { href: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/provider/listing", label: "My Listing", icon: Building2 },
  { href: "/provider/leads", label: "Leads", icon: Users },
  { href: "/provider/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/provider/billing", label: "Billing", icon: CreditCard },
  { href: "/provider/settings", label: "Settings", icon: Settings },
];

export function ProviderSidebar({ onNavigate }: ProviderSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { selectedFacility } = useSelectedFacility();
  const queryClient = useQueryClient();

  // Fetch new leads count
  const { data: newLeadsCount = 0 } = useQuery({
    queryKey: ["new-leads-count", selectedFacility?.id],
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
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Subscribe to realtime lead changes
  useEffect(() => {
    if (!selectedFacility?.id) return;
    const channel = supabase
      .channel("sidebar-leads-count")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "leads", filter: `facility_id=eq.${selectedFacility.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["new-leads-count", selectedFacility.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedFacility?.id, queryClient]);

  const currentPlan = subscription?.plan || "basic";
  const planDetails = PLAN_DETAILS[currentPlan];
  const isBasic = currentPlan === "basic";
  const isFeatured = currentPlan === "featured";

  const handleUpgrade = async () => {
    if (onNavigate) onNavigate();
    
    // If basic, go to billing page
    if (isBasic) {
      navigate("/provider/billing");
      return;
    }
    
    // If professional, create checkout for featured
    setIsUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: PLAN_DETAILS.featured.price_id }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <nav className="p-2 sm:p-3 flex-1">
        <ul className="space-y-0.5 sm:space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const isLeadsItem = item.href === "/provider/leads";
            const showBadge = isLeadsItem && newLeadsCount > 0;
            
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
                        {newLeadsCount > 99 ? "99+" : newLeadsCount}
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
                      {newLeadsCount > 99 ? "99+" : newLeadsCount} new
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Plan Card */}
      <div className="p-2 sm:p-3 border-t border-border">
        <div className={cn(
          "rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all",
          isFeatured 
            ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20" 
            : "bg-gradient-to-br from-primary/5 to-primary/10"
        )}>
          <div className="flex items-center gap-2 mb-2">
            {isFeatured ? (
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            ) : (
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            )}
            <span className="text-xs font-semibold text-foreground">
              {isLoading ? "Loading..." : planDetails.name}
            </span>
            {isFeatured && (
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-3.5 sm:h-4 px-1 sm:px-1.5 bg-amber-500/20 text-amber-600 border-0">
                Active
              </Badge>
            )}
          </div>
          
          {!isFeatured && (
            <>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                {isBasic 
                  ? "Upgrade to start receiving exclusive leads" 
                  : "Get priority access & more exclusive leads"
                }
              </p>
              <Button 
                size="sm" 
                className={cn(
                  "w-full h-7 sm:h-8 text-[11px] sm:text-xs font-medium gap-1 sm:gap-1.5",
                  isBasic 
                    ? "bg-primary hover:bg-primary/90 text-white" 
                    : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                )}
                onClick={handleUpgrade}
                disabled={isUpgrading}
              >
                {isUpgrading ? (
                  "Loading..."
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    {isBasic ? "View Plans" : "Upgrade"}
                  </>
                )}
              </Button>
            </>
          )}
          
          {isFeatured && (
            <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2">
              You're on our top-tier plan with maximum visibility.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
