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
  ShieldAlert,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminUserNotifications } from "@/hooks/useAdminUserNotifications";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
  { to: "/admin/providers", icon: Building2, label: "Providers", permission: "providers" },
  { to: "/admin/leads", icon: Users, label: "Leads", permission: "leads" },
  { to: "/admin/lead-routing", icon: RotateCcw, label: "Lead Routing", permission: "lead_routing" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", permission: "subscriptions" },
  { to: "/admin/featured", icon: Star, label: "Featured Placement", permission: "featured" },
  { to: "/admin/flagged-images", icon: Image, label: "Flagged Images", permission: "flagged_images" },
  { to: "/admin/security-logs", icon: ShieldAlert, label: "Security Logs", permission: "security_logs" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications", permission: "notifications" },
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
  const { unreadCount: globalUnreadCount } = useAdminNotifications();
  const { unreadCount: userUnreadCount } = useAdminUserNotifications();
  const totalUnreadCount = globalUnreadCount + userUnreadCount;

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
          const isNotifications = item.to === "/admin/notifications";

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
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {isNotifications && totalUnreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
                >
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export const AdminSidebar = memo(AdminSidebarComponent);
