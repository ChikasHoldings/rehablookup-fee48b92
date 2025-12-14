import { Link, useLocation } from "react-router-dom";
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
import { useState } from "react";

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
  const { data: subscription, isLoading } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const currentPlan = subscription?.plan || "basic";
  const planDetails = PLAN_DETAILS[currentPlan];
  const isBasic = currentPlan === "basic";
  const isFeatured = currentPlan === "featured";

  const handleUpgrade = async () => {
    if (onNavigate) onNavigate();
    
    // If basic, go to billing page
    if (isBasic) {
      window.location.href = "/provider/billing";
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
      <nav className="p-3 flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary-foreground/20" 
                      : "bg-muted group-hover:bg-background"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Plan Card */}
      <div className="p-3 border-t border-border">
        <div className={cn(
          "rounded-xl p-4 transition-all",
          isFeatured 
            ? "bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20" 
            : "bg-gradient-to-br from-primary/5 to-primary/10"
        )}>
          <div className="flex items-center gap-2 mb-2">
            {isFeatured ? (
              <Sparkles className="h-4 w-4 text-amber-500" />
            ) : (
              <Zap className="h-4 w-4 text-primary" />
            )}
            <span className="text-xs font-semibold text-foreground">
              {isLoading ? "Loading..." : planDetails.name}
            </span>
            {isFeatured && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-amber-500/20 text-amber-600 border-0">
                Active
              </Badge>
            )}
          </div>
          
          {!isFeatured && (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {isBasic 
                  ? "Upgrade to start receiving qualified leads" 
                  : "Get featured placement & more leads"
                }
              </p>
              <Button 
                size="sm" 
                className={cn(
                  "w-full h-8 text-xs font-medium gap-1.5",
                  isBasic 
                    ? "bg-primary hover:bg-primary/90" 
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
                    {isBasic ? "View Plans" : "Upgrade to Featured"}
                  </>
                )}
              </Button>
            </>
          )}
          
          {isFeatured && (
            <p className="text-xs text-muted-foreground">
              You're on our top-tier plan with maximum visibility.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
