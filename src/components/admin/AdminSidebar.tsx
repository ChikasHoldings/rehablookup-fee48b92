import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Star,
  ClipboardList,
  Settings,
  ShieldCheck,
  Image,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
  { to: "/admin/providers", icon: Building2, label: "Providers", permission: "providers" },
  { to: "/admin/leads", icon: Users, label: "Leads", permission: "leads" },
  { to: "/admin/lead-routing", icon: RotateCcw, label: "Lead Routing", permission: "leads" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", permission: "subscriptions" },
  { to: "/admin/featured", icon: Star, label: "Featured Placement", permission: "featured" },
  { to: "/admin/flagged-images", icon: Image, label: "Flagged Images", permission: "providers" },
  { to: "/admin/users", icon: ShieldCheck, label: "User Management", permission: "users" },
  { to: "/admin/audit-log", icon: ClipboardList, label: "Audit Log", permission: "audit_log" },
  { to: "/admin/settings", icon: Settings, label: "Settings", permission: "settings" },
];

interface AdminSidebarProps {
  isSuperAdmin: boolean;
  hasPermission: (permissionKey: string) => boolean;
}

function AdminSidebarComponent({ isSuperAdmin, hasPermission }: AdminSidebarProps) {
  const location = useLocation();

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(
    (item) => isSuperAdmin || item.permission === "dashboard" || hasPermission(item.permission)
  );

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-slate-50 sticky top-16 h-[calc(100vh-4rem)]">
      <nav className="flex-1 p-4 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.end 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);

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
