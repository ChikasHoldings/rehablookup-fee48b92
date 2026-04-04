import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  ClipboardList,
  Building2,
  Users,
  Shield,
  Star,
  Ban,
  CheckCircle,
  ArrowRight,
  Search,
  Calendar,
  Filter,
  User,
  FileText,
  Settings,
  Bell,
  Key,
  Image,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AuditLog = {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin_profile?: {
    display_name: string | null;
  } | null;
};

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

const actionConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  // Provider actions
  verified: { icon: <Shield className="h-4 w-4" />, label: "Marked as Verified", color: "text-primary bg-primary/10" },
  unverified: { icon: <Shield className="h-4 w-4" />, label: "Removed Verified Status", color: "text-muted-foreground bg-muted" },
  featured: { icon: <Star className="h-4 w-4" />, label: "Added to Featured", color: "text-warning bg-warning/10" },
  unfeatured: { icon: <Star className="h-4 w-4" />, label: "Removed from Featured", color: "text-muted-foreground bg-muted" },
  suspended: { icon: <Ban className="h-4 w-4" />, label: "Suspended Provider", color: "text-destructive bg-destructive/10" },
  unsuspended: { icon: <CheckCircle className="h-4 w-4" />, label: "Unsuspended Provider", color: "text-success bg-success/10" },
  status_changed_to_approved: { icon: <CheckCircle className="h-4 w-4" />, label: "Approved Provider", color: "text-success bg-success/10" },
  status_changed_to_pending: { icon: <CheckCircle className="h-4 w-4" />, label: "Set to Pending", color: "text-warning bg-warning/10" },
  status_changed_to_rejected: { icon: <Ban className="h-4 w-4" />, label: "Rejected Provider", color: "text-destructive bg-destructive/10" },
  notes_updated: { icon: <FileText className="h-4 w-4" />, label: "Updated Admin Notes", color: "text-muted-foreground bg-muted" },
  provider_deleted: { icon: <Ban className="h-4 w-4" />, label: "Deleted Provider", color: "text-destructive bg-destructive/10" },
  
  // Lead actions
  lead_assigned: { icon: <ArrowRight className="h-4 w-4" />, label: "Assigned Lead to Provider", color: "text-primary bg-primary/10" },
  lead_status_changed: { icon: <ArrowRight className="h-4 w-4" />, label: "Changed Lead Status", color: "text-primary bg-primary/10" },
  lead_qualified: { icon: <CheckCircle className="h-4 w-4" />, label: "Qualified Lead", color: "text-success bg-success/10" },
  lead_override: { icon: <ArrowRight className="h-4 w-4" />, label: "Override Lead Assignment", color: "text-accent-foreground bg-accent" },
  
  // Admin user management
  admin_user_created: { icon: <User className="h-4 w-4" />, label: "Created Admin User", color: "text-success bg-success/10" },
  admin_user_deleted: { icon: <Ban className="h-4 w-4" />, label: "Deleted Admin User", color: "text-destructive bg-destructive/10" },
  admin_user_deactivated: { icon: <Ban className="h-4 w-4" />, label: "Deactivated Admin User", color: "text-destructive bg-destructive/10" },
  admin_user_suspended: { icon: <Ban className="h-4 w-4" />, label: "Suspended Admin User", color: "text-destructive bg-destructive/10" },
  admin_user_unsuspended: { icon: <CheckCircle className="h-4 w-4" />, label: "Unsuspended Admin User", color: "text-success bg-success/10" },
  admin_permissions_updated: { icon: <Settings className="h-4 w-4" />, label: "Updated Permissions", color: "text-primary bg-primary/10" },
  admin_role_updated: { icon: <Shield className="h-4 w-4" />, label: "Updated Role", color: "text-primary bg-primary/10" },
  admin_password_reset: { icon: <Key className="h-4 w-4" />, label: "Reset Password", color: "text-warning bg-warning/10" },
  admin_invitation_resent: { icon: <Bell className="h-4 w-4" />, label: "Resent Invitation", color: "text-primary bg-primary/10" },
  admin_mfa_skip_toggled: { icon: <Shield className="h-4 w-4" />, label: "Toggled MFA Skip", color: "text-accent-foreground bg-accent" },
  
  // Profile actions
  profile_photo_updated: { icon: <Image className="h-4 w-4" />, label: "Updated Profile Photo", color: "text-accent-foreground bg-accent" },
  profile_name_updated: { icon: <User className="h-4 w-4" />, label: "Updated Profile Name", color: "text-accent-foreground bg-accent" },
  password_changed: { icon: <Key className="h-4 w-4" />, label: "Changed Password", color: "text-warning bg-warning/10" },
  
  // Notification actions
  notifications_marked_read: { icon: <Bell className="h-4 w-4" />, label: "Marked Notifications Read", color: "text-muted-foreground bg-muted" },
  notifications_cleared: { icon: <Bell className="h-4 w-4" />, label: "Cleared Notifications", color: "text-muted-foreground bg-muted" },
  notification_preferences_updated: { icon: <Bell className="h-4 w-4" />, label: "Updated Notification Preferences", color: "text-accent-foreground bg-accent" },
  admin_notification_sent: { icon: <Bell className="h-4 w-4" />, label: "Sent Notification", color: "text-primary bg-primary/10" },
  
  // Session actions
  session_revoked: { icon: <Shield className="h-4 w-4" />, label: "Revoked Session", color: "text-destructive bg-destructive/10" },
  login: { icon: <Key className="h-4 w-4" />, label: "Signed In", color: "text-success bg-success/10" },
  logout: { icon: <Key className="h-4 w-4" />, label: "Signed Out", color: "text-muted-foreground bg-muted" },
  
  // MFA actions
  mfa_enabled: { icon: <Shield className="h-4 w-4" />, label: "Enabled MFA", color: "text-success bg-success/10" },
  mfa_disabled: { icon: <Shield className="h-4 w-4" />, label: "Disabled MFA", color: "text-destructive bg-destructive/10" },
  mfa_recovery_codes_regenerated: { icon: <Key className="h-4 w-4" />, label: "Regenerated Recovery Codes", color: "text-warning bg-warning/10" },
  
  // Subscription actions
  subscription_override: { icon: <CreditCard className="h-4 w-4" />, label: "Override Subscription", color: "text-accent-foreground bg-accent" },
  subscription_canceled: { icon: <CreditCard className="h-4 w-4" />, label: "Canceled Subscription", color: "text-destructive bg-destructive/10" },
  
  // Featured placement actions
  featured_pinned: { icon: <Star className="h-4 w-4" />, label: "Pinned to Featured", color: "text-warning bg-warning/10" },
  featured_unpinned: { icon: <Star className="h-4 w-4" />, label: "Unpinned from Featured", color: "text-muted-foreground bg-muted" },
  featured_settings_updated: { icon: <Settings className="h-4 w-4" />, label: "Updated Featured Settings", color: "text-primary bg-primary/10" },
  featured_order_updated: { icon: <Star className="h-4 w-4" />, label: "Updated Featured Order", color: "text-warning bg-warning/10" },
  legacy_featured: { icon: <Star className="h-4 w-4" />, label: "Added Legacy Featured", color: "text-warning bg-warning/10" },
  legacy_unfeatured: { icon: <Star className="h-4 w-4" />, label: "Removed Legacy Featured", color: "text-muted-foreground bg-muted" },
  pinned_featured: { icon: <Star className="h-4 w-4" />, label: "Pinned Featured", color: "text-accent-foreground bg-accent" },
  unpinned_featured: { icon: <Star className="h-4 w-4" />, label: "Unpinned Featured", color: "text-muted-foreground bg-muted" },
  
  // Image moderation
  image_flagged: { icon: <Image className="h-4 w-4" />, label: "Flagged Image", color: "text-destructive bg-destructive/10" },
  image_resolved: { icon: <Image className="h-4 w-4" />, label: "Resolved Image Flag", color: "text-success bg-success/10" },
  image_removed: { icon: <Image className="h-4 w-4" />, label: "Removed Image", color: "text-destructive bg-destructive/10" },
  
  // Security actions
  security_block_added: { icon: <Shield className="h-4 w-4" />, label: "Added Security Block", color: "text-destructive bg-destructive/10" },
  security_block_removed: { icon: <Shield className="h-4 w-4" />, label: "Removed Security Block", color: "text-success bg-success/10" },
  
  // Location change actions
  location_change_approved: { icon: <CheckCircle className="h-4 w-4" />, label: "Approved Location Change", color: "text-success bg-success/10" },
  location_change_rejected: { icon: <Ban className="h-4 w-4" />, label: "Rejected Location Change", color: "text-destructive bg-destructive/10" },
  
  // Settings actions
  platform_settings_updated: { icon: <Settings className="h-4 w-4" />, label: "Updated Platform Settings", color: "text-primary bg-primary/10" },
  audit_logs_cleaned: { icon: <ClipboardList className="h-4 w-4" />, label: "Cleaned Audit Logs", color: "text-warning bg-warning/10" },
  clear_cache: { icon: <Settings className="h-4 w-4" />, label: "Cleared Platform Cache", color: "text-muted-foreground bg-muted" },
  
  // Additional actions from DB
  admin_login: { icon: <Key className="h-4 w-4" />, label: "Admin Login", color: "text-success bg-success/10" },
  verify_accreditation: { icon: <Shield className="h-4 w-4" />, label: "Verified Accreditation", color: "text-primary bg-primary/10" },
  subscription_get_promo_analytics: { icon: <CreditCard className="h-4 w-4" />, label: "Viewed Promo Analytics", color: "text-muted-foreground bg-muted" },
  subscription_create_coupon: { icon: <CreditCard className="h-4 w-4" />, label: "Created Coupon", color: "text-success bg-success/10" },
  storage_cleanup: { icon: <Settings className="h-4 w-4" />, label: "Cleaned Storage", color: "text-warning bg-warning/10" },
};

const targetTypeConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  facility: { icon: <Building2 className="h-3.5 w-3.5" />, label: "Facility" },
  lead: { icon: <Users className="h-3.5 w-3.5" />, label: "Lead" },
  admin_user: { icon: <User className="h-3.5 w-3.5" />, label: "Admin User" },
  notification: { icon: <Bell className="h-3.5 w-3.5" />, label: "Notification" },
  profile: { icon: <User className="h-3.5 w-3.5" />, label: "Profile" },
  subscription: { icon: <CreditCard className="h-3.5 w-3.5" />, label: "Subscription" },
  image: { icon: <Image className="h-3.5 w-3.5" />, label: "Image" },
  settings: { icon: <Settings className="h-3.5 w-3.5" />, label: "Settings" },
  security: { icon: <Shield className="h-3.5 w-3.5" />, label: "Security" },
  platform: { icon: <Settings className="h-3.5 w-3.5" />, label: "Platform" },
  blocked_identifier: { icon: <Ban className="h-3.5 w-3.5" />, label: "Blocked Identifier" },
  session: { icon: <Key className="h-3.5 w-3.5" />, label: "Session" },
  mfa: { icon: <Shield className="h-3.5 w-3.5" />, label: "MFA" },
  location_change: { icon: <Building2 className="h-3.5 w-3.5" />, label: "Location Change" },
  // Additional target types from DB
  promo_code: { icon: <CreditCard className="h-3.5 w-3.5" />, label: "Promo Code" },
  facility_accreditation: { icon: <Shield className="h-3.5 w-3.5" />, label: "Accreditation" },
  admin_profile: { icon: <User className="h-3.5 w-3.5" />, label: "Admin Profile" },
  storage: { icon: <Settings className="h-3.5 w-3.5" />, label: "Storage" },
  admin_notifications: { icon: <Bell className="h-3.5 w-3.5" />, label: "Admin Notifications" },
  platform_settings: { icon: <Settings className="h-3.5 w-3.5" />, label: "Platform Settings" },
  notifications: { icon: <Bell className="h-3.5 w-3.5" />, label: "Notifications" },
};

const ITEMS_PER_PAGE = 20;

const datePresets = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export default function AdminAuditLog() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminAuditLog");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() });
  const [currentPage, setCurrentPage] = useState(1);

  const invalidateAuditLog = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-audit-log"] });
    queryClient.invalidateQueries({ queryKey: ["admin-profiles-for-audit"] });
  }, [queryClient]);

  // Real-time subscription for audit log updates - always active
  useEffect(() => {
    const channel = supabase
      .channel("audit-log-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_audit_log",
        },
        () => {
          invalidateAuditLog();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateAuditLog]);

  const { data: logs, isLoading, error: logsError } = useQuery({
    queryKey: ["admin-audit-log", dateRange],
    queryFn: async () => {
      let query = supabase
        .from("admin_audit_log")
        .select("id, admin_user_id, action_type, target_type, target_id, details, created_at")
        .order("created_at", { ascending: false });

      if (dateRange.from) {
        query = query.gte("created_at", startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Fetch admin profiles for display names
  const { data: adminProfiles, error: profilesError } = useQuery({
    queryKey: ["admin-profiles-for-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, display_name");
      if (error) throw error;
      return data;
    },
  });

  // Log query errors
  useEffect(() => {
    if (logsError) logError("fetch_audit_logs", logsError, { queryKey: "admin-audit-log" });
  }, [logsError, logError]);

  useEffect(() => {
    if (profilesError) logError("fetch_admin_profiles", profilesError, { queryKey: "admin-profiles-for-audit" });
  }, [profilesError, logError]);

  const adminProfileMap = useMemo(() => {
    if (!adminProfiles) return new Map<string, string>();
    return new Map(adminProfiles.map(p => [p.user_id, p.display_name || "Unknown Admin"]));
  }, [adminProfiles]);

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    
    return logs.filter(log => {
      // Action filter
      if (actionFilter !== "all" && log.action_type !== actionFilter) return false;
      
      // Target filter
      if (targetFilter !== "all" && log.target_type !== targetFilter) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const actionLabel = actionConfig[log.action_type]?.label.toLowerCase() || log.action_type.toLowerCase();
        const targetLabel = targetTypeConfig[log.target_type]?.label.toLowerCase() || log.target_type.toLowerCase();
        const adminName = adminProfileMap.get(log.admin_user_id)?.toLowerCase() || "";
        const details = JSON.stringify(log.details || {}).toLowerCase();
        
        if (!actionLabel.includes(query) && 
            !targetLabel.includes(query) && 
            !adminName.includes(query) &&
            !details.includes(query) &&
            !(log.target_id?.toLowerCase().includes(query))) {
          return false;
        }
      }
      
      return true;
    });
  }, [logs, actionFilter, targetFilter, searchQuery, adminProfileMap]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Get unique action types for filter
  const actionTypes = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map(l => l.action_type))];
  }, [logs]);

  // Get unique target types for filter
  const targetTypes = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map(l => l.target_type))];
  }, [logs]);

  const handlePresetClick = (days: number) => {
    if (days === 0) {
      setDateRange({ from: new Date(), to: new Date() });
    } else {
      setDateRange({ from: subDays(new Date(), days), to: new Date() });
    }
    setCurrentPage(1);
  };

  const getActionConfig = (actionType: string) => {
    return actionConfig[actionType] || { 
      icon: <ClipboardList className="h-4 w-4" />, 
      label: actionType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      color: "text-muted-foreground bg-muted"
    };
  };

  const getTargetConfig = (targetType: string) => {
    return targetTypeConfig[targetType] || { 
      icon: <ClipboardList className="h-3.5 w-3.5" />, 
      label: targetType.charAt(0).toUpperCase() + targetType.slice(1)
    };
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details || Object.keys(details).length === 0) return null;
    
    const entries = Object.entries(details).slice(0, 3);
    return entries.map(([key, value]) => (
      <span key={key} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span className="font-medium">{key.replace(/_/g, " ")}:</span>
        <span className="truncate max-w-[150px]">{String(value)}</span>
      </span>
    ));
  };

  // CSV Export handler
  const handleExportCSV = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export");
      return;
    }

    try {
      // Build CSV content
      const headers = ["Timestamp", "Admin", "Action", "Target Type", "Target ID", "Details"];
      const escapeCSV = (value: string | null | undefined): string => {
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const rows = filteredLogs.map((log) => {
        const adminName = adminProfileMap.get(log.admin_user_id) || "Unknown Admin";
        const actionLabel = getActionConfig(log.action_type).label;
        const targetLabel = getTargetConfig(log.target_type).label;
        const details = log.details ? JSON.stringify(log.details) : "";
        
        return [
          format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
          escapeCSV(adminName),
          escapeCSV(actionLabel),
          escapeCSV(targetLabel),
          escapeCSV(log.target_id || ""),
          escapeCSV(details),
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const dateStr = dateRange.from && dateRange.to 
        ? `${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`
        : format(new Date(), "yyyy-MM-dd");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `audit-log-${dateStr}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredLogs.length} audit log entries`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export audit logs");
    }
  }, [filteredLogs, adminProfileMap, dateRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground">Track all administrative actions across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => invalidateAuditLog()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {datePresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset.days)}
              className={cn(
                "text-xs hidden md:inline-flex",
                dateRange.from && 
                format(dateRange.from, "yyyy-MM-dd") === format(subDays(new Date(), preset.days), "yyyy-MM-dd") &&
                "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Actions</p>
                <p className="text-2xl font-bold tabular-nums">{filteredLogs.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Provider Actions</p>
                <p className="text-2xl font-bold tabular-nums">
                  {filteredLogs.filter(l => l.target_type === "facility").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lead Actions</p>
                <p className="text-2xl font-bold tabular-nums">
                  {filteredLogs.filter(l => l.target_type === "lead").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent-foreground">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Actions</p>
                <p className="text-2xl font-bold tabular-nums">
                  {filteredLogs.filter(l => l.target_type === "admin_user" || l.target_type === "profile").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <User className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search actions, targets, admins..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getActionConfig(type).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={targetFilter} onValueChange={(v) => { setTargetFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Target Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  {targetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getTargetConfig(type).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange({ from: range?.from, to: range?.to });
                      setCurrentPage(1);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>
                Showing {paginatedLogs.length} of {filteredLogs.length} actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : paginatedLogs.length > 0 ? (
            <div className="space-y-3">
              {paginatedLogs.map((log, index) => {
                const action = getActionConfig(log.action_type);
                const target = getTargetConfig(log.target_type);
                const adminName = adminProfileMap.get(log.admin_user_id) || "Unknown Admin";
                
                return (
                  <div
                    key={log.id}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border bg-card transition-colors hover:bg-muted/50",
                      index === 0 && "ring-1 ring-primary/20"
                    )}
                  >
                    {/* Action Icon */}
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      action.color
                    )}>
                      {action.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{action.label}</p>
                        <Badge variant="outline" className="text-xs gap-1">
                          {target.icon}
                          {target.label}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-primary/10 text-primary text-xs">Latest</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{adminName}</span>
                        {log.target_id && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="font-mono text-xs truncate max-w-[200px]">
                              {log.target_id}
                            </span>
                          </>
                        )}
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="flex items-center gap-3 flex-wrap">
                          {formatDetails(log.details)}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-muted-foreground">
                        {format(new Date(log.created_at), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "h:mm:ss a")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium">No audit logs found</p>
              <p className="text-sm">Try adjusting your filters or date range</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground tabular-nums">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
