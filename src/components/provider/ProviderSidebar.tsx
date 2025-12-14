import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings,
  ChevronRight,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderSidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { href: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & stats" },
  { href: "/provider/listing", label: "My Listing", icon: Building2, description: "Edit facility info" },
  { href: "/provider/leads", label: "Leads", icon: Users, description: "Contact requests" },
  { href: "/provider/analytics", label: "Analytics", icon: BarChart3, description: "Performance metrics" },
  { href: "/provider/billing", label: "Billing", icon: CreditCard, description: "Plans & payments" },
  { href: "/provider/settings", label: "Settings", icon: Settings, description: "Account preferences" },
];

export function ProviderSidebar({ onNavigate }: ProviderSidebarProps) {
  const location = useLocation();

  return (
    <nav className="p-3">
      <ul className="space-y-1">
        {navItems.map((item, index) => {
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
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                  isActive 
                    ? "bg-primary-foreground/20" 
                    : "bg-muted group-hover:bg-background"
                )}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{item.label}</p>
                  <p className={cn(
                    "text-xs truncate transition-colors",
                    isActive 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground/70"
                  )}>
                    {item.description}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-all",
                  isActive 
                    ? "opacity-70" 
                    : "opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0"
                )} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
