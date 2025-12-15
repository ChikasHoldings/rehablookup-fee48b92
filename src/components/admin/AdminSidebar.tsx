import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Star,
  MessageSquare,
  ClipboardList,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/providers", icon: Building2, label: "Providers" },
  { to: "/admin/leads", icon: Users, label: "Leads" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { to: "/admin/featured", icon: Star, label: "Featured Placement" },
  { to: "/admin/users", icon: ShieldCheck, label: "User Management" },
  { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", disabled: true },
  { to: "/admin/audit-log", icon: ClipboardList, label: "Audit Log" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

function AdminSidebarComponent() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-slate-50 sticky top-16 h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.end 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);

          if (item.disabled) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground opacity-50 cursor-not-allowed"
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">Soon</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-200"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export const AdminSidebar = memo(AdminSidebarComponent);
