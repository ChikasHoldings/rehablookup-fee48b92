import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderSidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { href: "/provider/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/provider/listing", label: "My Listing", icon: Building2 },
  { href: "/provider/leads", label: "Leads", icon: Users },
  { href: "/provider/billing", label: "Billing", icon: CreditCard },
  { href: "/provider/settings", label: "Settings", icon: Settings },
];

export function ProviderSidebar({ onNavigate }: ProviderSidebarProps) {
  const location = useLocation();

  return (
    <nav className="p-4">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
