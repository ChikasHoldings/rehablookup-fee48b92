import {
  LayoutDashboard,
  Building2,
  Users,
  UserSearch,
  CreditCard,
  ClipboardList,
  Settings,
  ShieldCheck,
  BarChart3,
  ShieldAlert,
  UserPlus,
  MessageSquare,
  Headphones,
  Megaphone,
  FileText,
  Inbox,
  AlertTriangle,
  Landmark,
  Bell,
  Mail,
  KeyRound,
} from "lucide-react";
import type { AdminSidebarCounts } from "@/hooks/useAdminSidebarCounts";
import type { AdminRoleType } from "@/hooks/useAdminAuth";

export interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  permission: string;
  countKey?: keyof AdminSidebarCounts;
}

export interface NavGroup {
  icon: React.ElementType;
  label: string;
  permission: string;
  items: NavItem[];
}

export interface NavSection {
  sectionLabel: string;
  entries: NavEntry[];
}

export type NavEntry = NavItem | NavGroup;

export const isNavGroup = (entry: NavEntry): entry is NavGroup => {
  return "items" in entry;
};

// ──────────────────────────────────────────────
// Super Admin — full access, all sections
// ──────────────────────────────────────────────
const superAdminNav: NavSection[] = [
  {
    sectionLabel: "",
    entries: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
    ],
  },
  {
    sectionLabel: "Operations",
    entries: [
      { to: "/admin/leads", icon: Users, label: "Inquiries", permission: "leads", countKey: "leads" },
      { to: "/admin/providers", icon: Building2, label: "Providers", permission: "providers", countKey: "pendingProviders" },
      { to: "/admin/seekers", icon: UserSearch, label: "Clients", permission: "seekers" },
      {
        icon: UserPlus,
        label: "Placements",
        permission: "placements",
        items: [
          { to: "/admin/concierge", icon: UserPlus, label: "Command Center", permission: "placements", countKey: "placements" },
          { to: "/admin/inbox", icon: Inbox, label: "Advisor Inbox", permission: "placements" },
          { to: "/admin/provider-directory", icon: Building2, label: "Provider Directory", permission: "placements" },
        ],
      },
      { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", permission: "subscriptions" },
    ],
  },
  {
    sectionLabel: "Communications",
    entries: [
      { to: "/admin/support", icon: Headphones, label: "Support Inbox", permission: "support", countKey: "supportTickets" },
      { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", permission: "reviews", countKey: "pendingReviews" },
      { to: "/admin/escalations", icon: AlertTriangle, label: "Escalations", permission: "escalations", countKey: "openEscalations" },
    ],
  },
  {
    sectionLabel: "Content",
    entries: [
      { to: "/admin/marketing", icon: Megaphone, label: "Marketing Leads", permission: "leads", countKey: "marketingLeads" },
      { to: "/admin/blog", icon: FileText, label: "Blog Articles", permission: "providers" },
    ],
  },
  {
    sectionLabel: "Insights",
    entries: [
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
    ],
  },
  {
    sectionLabel: "Administration",
    entries: [
      {
        icon: ShieldCheck,
        label: "System",
        permission: "users",
        items: [
          { to: "/admin/users", icon: ShieldCheck, label: "Admin Staff", permission: "users" },
          { to: "/admin/back-office", icon: Landmark, label: "Back Office", permission: "back_office" },
          { to: "/admin/email-logs", icon: Mail, label: "Email Logs", permission: "security_logs" },
          { to: "/admin/security-logs", icon: ShieldAlert, label: "Security Logs", permission: "security_logs" },
          { to: "/admin/audit-log", icon: ClipboardList, label: "Audit Log", permission: "audit_log" },
        ],
      },
      { to: "/admin/settings", icon: Settings, label: "Settings", permission: "settings" },
    ],
  },
];

// ──────────────────────────────────────────────
// Manager — operational oversight, no system admin
// ──────────────────────────────────────────────
const managerNav: NavSection[] = [
  {
    sectionLabel: "",
    entries: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
    ],
  },
  {
    sectionLabel: "Team & Operations",
    entries: [
      { to: "/admin/users", icon: ShieldCheck, label: "Staff Management", permission: "users" },
      { to: "/admin/leads", icon: Users, label: "Inquiries", permission: "leads", countKey: "leads" },
      { to: "/admin/providers", icon: Building2, label: "Providers", permission: "providers", countKey: "pendingProviders" },
      { to: "/admin/seekers", icon: UserSearch, label: "Clients", permission: "seekers" },
      {
        icon: UserPlus,
        label: "Placements",
        permission: "placements",
        items: [
          { to: "/admin/concierge", icon: UserPlus, label: "Command Center", permission: "placements", countKey: "placements" },
          { to: "/admin/inbox", icon: Inbox, label: "Advisor Inbox", permission: "placements" },
          { to: "/admin/provider-directory", icon: Building2, label: "Provider Directory", permission: "placements" },
        ],
      },
      { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", permission: "subscriptions" },
    ],
  },
  {
    sectionLabel: "Communications",
    entries: [
      { to: "/admin/support", icon: Headphones, label: "Support Inbox", permission: "support", countKey: "supportTickets" },
      { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", permission: "reviews", countKey: "pendingReviews" },
      { to: "/admin/escalations", icon: AlertTriangle, label: "Escalations", permission: "escalations", countKey: "openEscalations" },
    ],
  },
  {
    sectionLabel: "Insights",
    entries: [
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
    ],
  },
];

// ──────────────────────────────────────────────
// Placement Advisor — placement-focused workspace
// ──────────────────────────────────────────────
const advisorNav: NavSection[] = [
  {
    sectionLabel: "",
    entries: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
    ],
  },
  {
    sectionLabel: "My Workspace",
    entries: [
      { to: "/admin/concierge", icon: UserPlus, label: "Placement Center", permission: "placements", countKey: "placements" },
      { to: "/admin/inbox", icon: Inbox, label: "Messages", permission: "placements" },
      { to: "/admin/provider-directory", icon: Building2, label: "Provider Directory", permission: "placements" },
      { to: "/admin/placement-revenue", icon: CreditCard, label: "Earnings", permission: "placements" },
    ],
  },
  {
    sectionLabel: "Tools",
    entries: [
      { to: "/admin/escalations", icon: AlertTriangle, label: "Escalations", permission: "escalations", countKey: "openEscalations" },
    ],
  },
];

// ──────────────────────────────────────────────
// Customer Rep — support-focused workspace
// ──────────────────────────────────────────────
const customerRepNav: NavSection[] = [
  {
    sectionLabel: "",
    entries: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
    ],
  },
  {
    sectionLabel: "Support",
    entries: [
      { to: "/admin/support", icon: Headphones, label: "Support Inbox", permission: "support", countKey: "supportTickets" },
      { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", permission: "reviews", countKey: "pendingReviews" },
    ],
  },
  {
    sectionLabel: "Tools",
    entries: [
      { to: "/admin/escalations", icon: AlertTriangle, label: "Escalations", permission: "escalations", countKey: "openEscalations" },
      { to: "/admin/seekers", icon: UserSearch, label: "Clients", permission: "seekers" },
    ],
  },
];

// ──────────────────────────────────────────────
// Role → nav mapping
// ──────────────────────────────────────────────
const roleNavMap: Record<AdminRoleType, NavSection[]> = {
  super_admin: superAdminNav,
  manager: managerNav,
  advisor: advisorNav,
  customer_rep: customerRepNav,
};

/**
 * Returns the navigation sections for a given admin role.
 * Super Admin always gets the full nav regardless.
 */
export function getNavSectionsForRole(role: AdminRoleType, isSuperAdmin: boolean): NavSection[] {
  if (isSuperAdmin) return superAdminNav;
  return roleNavMap[role] || customerRepNav;
}

// ──────────────────────────────────────────────
// Mobile nav flattened versions
// ──────────────────────────────────────────────
export interface MobileNavSection {
  label: string;
  items: { to: string; icon: React.ElementType; label: string; end?: boolean; permission: string }[];
}

function flattenToMobile(sections: NavSection[]): MobileNavSection[] {
  return sections.map((section) => ({
    label: section.sectionLabel,
    items: section.entries.flatMap((entry) => {
      if (isNavGroup(entry)) {
        return entry.items.map((item) => ({
          to: item.to,
          icon: item.icon,
          label: item.label,
          end: item.end,
          permission: item.permission,
        }));
      }
      return [{
        to: entry.to,
        icon: entry.icon,
        label: entry.label,
        end: entry.end,
        permission: entry.permission,
      }];
    }),
  }));
}

export function getMobileNavForRole(role: AdminRoleType, isSuperAdmin: boolean): MobileNavSection[] {
  const sections = getNavSectionsForRole(role, isSuperAdmin);
  // Add notifications to the last section for all roles
  const mobileSections = flattenToMobile(sections);
  
  // Add notifications as a universal item
  const lastSection = mobileSections[mobileSections.length - 1];
  if (lastSection) {
    lastSection.items.push({
      to: "/admin/notifications",
      icon: Bell,
      label: "Notifications",
      permission: "dashboard",
    });
  }
  
  return mobileSections;
}
