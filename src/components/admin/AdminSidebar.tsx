import { memo, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { TransitionNavLink } from "@/components/ui/transition-nav-link";
import { ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchAdminPage } from "@/lib/adminPrefetch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAdminSidebarCounts, type AdminSidebarCounts } from "@/hooks/useAdminSidebarCounts";
import {
  type NavItem,
  type NavGroup,
  type NavEntry,
  type NavSection,
  isNavGroup,
  getNavSectionsForRole,
} from "./adminNavConfig";
import type { AdminRoleType } from "@/hooks/useAdminAuth";

interface AdminSidebarProps {
  isSuperAdmin: boolean;
  hasPermission: (permissionKey: string) => boolean;
  adminRole?: AdminRoleType;
}

function AdminSidebarComponent({ isSuperAdmin, hasPermission, adminRole = "customer_rep" }: AdminSidebarProps) {
  const location = useLocation();
  const { data: counts } = useAdminSidebarCounts();

  // Get role-specific navigation
  const navSections = getNavSectionsForRole(adminRole, isSuperAdmin);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.flatMap((s) => s.entries).forEach((entry) => {
      if (isNavGroup(entry)) {
        const hasActiveChild = entry.items.some((item) => location.pathname.startsWith(item.to));
        if (hasActiveChild) {
          initial[entry.label] = true;
        }
      }
    });
    return initial;
  });

  const handleMouseEnter = useCallback((path: string) => {
    prefetchAdminPage(path);
  }, []);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const canViewEntry = (entry: NavEntry): boolean => {
    if (isSuperAdmin) return true;
    if (isNavGroup(entry)) {
      return entry.items.some((item) => hasPermission(item.permission));
    }
    if (entry.permission === "dashboard") return true;
    return hasPermission(entry.permission);
  };

  const canViewItem = (item: NavItem): boolean => {
    if (isSuperAdmin) return true;
    if (item.permission === "dashboard") return true;
    return hasPermission(item.permission);
  };

  const getItemCount = (item: NavItem): number => {
    if (!item.countKey || !counts) return 0;
    return counts[item.countKey] || 0;
  };

  const renderNavItem = (entry: NavItem) => {
    const Icon = entry.icon;
    const isActive = entry.end
      ? location.pathname === entry.to
      : location.pathname.startsWith(entry.to);
    const itemCount = getItemCount(entry);

    return (
      <TransitionNavLink
        key={entry.to}
        to={entry.to}
        end={entry.end}
        onMouseEnter={() => handleMouseEnter(entry.to)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
          isActive 
            ? "bg-white/20" 
            : "bg-slate-100 group-hover:bg-slate-200"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            isActive ? "text-primary-foreground" : "text-slate-500 group-hover:text-slate-700"
          )} />
        </div>
        <span className="text-sm font-medium flex-1">{entry.label}</span>
        {itemCount > 0 && (
          <span className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
            isActive 
              ? "bg-white/20 text-primary-foreground" 
              : "bg-primary text-primary-foreground"
          )}>
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </TransitionNavLink>
    );
  };

  const renderNavGroup = (entry: NavGroup) => {
    const Icon = entry.icon;
    const isOpen = openGroups[entry.label] ?? false;
    const hasActiveChild = entry.items.some((item) =>
      item.to === "/admin/leads" 
        ? location.pathname === item.to 
        : location.pathname.startsWith(item.to)
    );
    const visibleItems = entry.items.filter(canViewItem);

    if (visibleItems.length === 0) return null;

    return (
      <Collapsible
        key={entry.label}
        open={isOpen}
        onOpenChange={() => toggleGroup(entry.label)}
      >
        <CollapsibleTrigger
          className={cn(
            "group flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-200",
            hasActiveChild
              ? "bg-primary/10 text-primary"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
              hasActiveChild 
                ? "bg-primary/15" 
                : "bg-slate-100 group-hover:bg-slate-200"
            )}>
              <Icon className={cn(
                "h-4 w-4",
                hasActiveChild ? "text-primary" : "text-slate-500 group-hover:text-slate-700"
              )} />
            </div>
            <span className="text-sm font-medium">{entry.label}</span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="ml-5 mt-1 pl-4 border-l-2 border-slate-200 space-y-0.5">
            {visibleItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive = item.to === "/admin/leads"
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              const itemCount = getItemCount(item);

              return (
                <TransitionNavLink
                  key={item.to}
                  to={item.to}
                  onMouseEnter={() => handleMouseEnter(item.to)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  <ItemIcon className="h-3.5 w-3.5" />
                  <span className="flex-1">{item.label}</span>
                  {itemCount > 0 && (
                    <span className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                      isActive 
                        ? "bg-white/20 text-primary-foreground" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </TransitionNavLink>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200/80 bg-gradient-to-b from-slate-50 to-white sticky top-16 h-[calc(100vh-4rem)]">
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navSections.map((section) => {
          const visibleEntries = section.entries.filter(canViewEntry);
          if (visibleEntries.length === 0) return null;

          return (
            <div key={section.sectionLabel || "core"} className={cn(section.sectionLabel && "mt-4 first:mt-0")}>
              {section.sectionLabel && (
                <div className="flex items-center gap-2 px-3 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.sectionLabel}
                  </span>
                  <Minus className="h-px flex-1 text-slate-200" />
                </div>
              )}
              <div className="space-y-0.5">
                {visibleEntries.map((entry) =>
                  isNavGroup(entry) ? renderNavGroup(entry) : renderNavItem(entry)
                )}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export const AdminSidebar = memo(AdminSidebarComponent);
