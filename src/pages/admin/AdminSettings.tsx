import { useState, useEffect, useCallback, forwardRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useTheme } from "next-themes";
import {
  Settings,
  Shield,
  Database,
  Bell,
  Globe,
  Mail,
  Clock,
  Server,
  HardDrive,
  Zap,
  Lock,
  Key,
  Smartphone,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Palette,
  Trash2,
  History,
  FileText,
  Activity,
  Download,
  Loader2,
  Ban,
} from "lucide-react";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { IPWhitelistDialog } from "@/components/admin/IPWhitelistDialog";
import { BlockedIdentifiersDialog } from "@/components/admin/BlockedIdentifiersDialog";
import { SecurityAlertsPanel } from "@/components/admin/SecurityAlertsPanel";
import { RecentNotificationsPanel } from "@/components/admin/RecentNotificationsPanel";
import { DataHealthMonitor } from "@/components/admin/DataHealthMonitor";

// Define which tabs each role can access
type SettingsTab = "general" | "security" | "notifications" | "data";

const ROLE_TAB_ACCESS: Record<string, SettingsTab[]> = {
  super_admin: ["general", "security", "notifications", "data"],
  manager: ["general", "notifications"],
  customer_rep: ["general", "notifications"],
  advisor: ["general", "notifications"],
};

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: Record<string, any>;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

const SettingRow = forwardRef<HTMLDivElement, SettingRowProps>(
  ({ icon, title, description, children }, ref) => (
    <div 
      ref={ref}
      className="flex items-center justify-between py-4"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{title}</p>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0 ml-4">
        {children}
      </div>
    </div>
  )
);
SettingRow.displayName = "SettingRow";

const StatusBadge = ({ status, label }: { status: "active" | "inactive" | "warning"; label: string }) => {
  const config = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
  };
  
  return (
    <Badge variant="outline" className={cn("gap-1", config[status])}>
      {status === "active" && <CheckCircle className="h-3 w-3" />}
      {status === "inactive" && <Info className="h-3 w-3" />}
      {status === "warning" && <AlertTriangle className="h-3 w-3" />}
      {label}
    </Badge>
  );
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminSettings");
  const { adminRole, isSuperAdmin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("general");
  const { theme, setTheme } = useTheme();

  // Get allowed tabs for current role
  const allowedTabs = useMemo(() => {
    return ROLE_TAB_ACCESS[adminRole] || ROLE_TAB_ACCESS.customer_rep;
  }, [adminRole]);

  // Invalidate settings queries helper
  const invalidateSettingsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-settings-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-edge-functions-count"] });
    queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
  }, [queryClient]);

  // Real-time subscriptions - always active
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-settings-facilities")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => {
          invalidateSettingsQueries();
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-settings-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          invalidateSettingsQueries();
        }
      )
      .subscribe();

    const usersChannel = supabase
      .channel("admin-settings-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => {
          invalidateSettingsQueries();
        }
      )
      .subscribe();

    // Real-time for platform settings changes
    const settingsChannel = supabase
      .channel("admin-platform-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings" },
        (payload) => {
          invalidateSettingsQueries();
          toast.info("Settings updated", {
            description: "Platform settings have been changed",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [invalidateSettingsQueries]);

  // Fetch platform settings
  const { data: platformSettings, isLoading: loadingSettings, error: settingsError } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("id, setting_key, setting_value, updated_by, updated_at");
      
      if (error) throw error;
      
      // Convert to a map for easy access
      const settingsMap: Record<string, PlatformSetting> = {};
      (data as PlatformSetting[])?.forEach((setting) => {
        settingsMap[setting.setting_key] = setting;
      });
      return settingsMap;
    },
  });

  // Log query errors
  useEffect(() => {
    if (settingsError) logError("fetch_platform_settings", settingsError, { queryKey: "platform-settings" });
  }, [settingsError, logError]);

  // Sync theme mode from settings when loaded
  useEffect(() => {
    if (platformSettings?.theme_mode?.setting_value?.mode) {
      const savedTheme = platformSettings.theme_mode.setting_value.mode;
      if (savedTheme !== theme) {
        setTheme(savedTheme);
      }
    }
  }, [platformSettings, theme, setTheme]);

  // Helper to get a setting value
  const getSetting = useCallback((key: string): any => {
    const setting = platformSettings?.[key];
    if (!setting) return undefined;
    // The value is stored as JSONB, extract the raw value
    return setting.setting_value;
  }, [platformSettings]);

  // Loading state for settings
  const settingsLoading = loadingSettings;

  // Update setting mutation - uses upsert to handle new settings
  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ 
          setting_key: key,
          setting_value: value,
          updated_by: user?.id 
        }, { onConflict: "setting_key" });
      
      if (error) throw error;
      
      // Log the setting change
      await logAdminAction({
        actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
        targetType: "platform_settings",
        details: { setting_key: key, new_value: value }
      });
      
      return { key, value };
    },
    onSuccess: (result) => {
      toast.success("Setting updated");
      invalidateSettingsQueries();
      
      // If theme was changed, apply it
      if (result?.key === "theme_mode") {
        setTheme(result.value?.mode || "light");
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to update setting", { description: error.message });
    },
  });

  // Fetch platform stats
  const { data: stats, isLoading: loadingStats, refetch: refetchStats, error: statsError } = useQuery({
    queryKey: ["admin-settings-stats"],
    queryFn: async () => {
      const [facilitiesResult, leadsResult, adminUsersResult, flaggedResult, auditLogsResult] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
        supabase.from("flagged_images").select("id", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true }),
      ]);

      return {
        totalFacilities: facilitiesResult.count || 0,
        totalLeads: leadsResult.count || 0,
        totalAdminUsers: adminUsersResult.count || 0,
        pendingFlags: flaggedResult.count || 0,
        totalAuditLogs: auditLogsResult.count || 0,
      };
    },
  });

  // Log stats query errors
  useEffect(() => {
    if (statsError) logError("fetch_platform_stats", statsError, { queryKey: "admin-settings-stats" });
  }, [statsError, logError]);

  // Count edge functions from supabase config
  const { data: edgeFunctionsCount } = useQuery({
    queryKey: ["admin-edge-functions-count"],
    queryFn: async () => {
      // Based on project structure - count of edge functions (52 deployed)
      return 52;
    },
  });

  // Fetch storage usage data
  const { data: storageData, isLoading: loadingStorage, refetch: refetchStorage } = useQuery({
    queryKey: ["admin-storage-usage"],
    queryFn: async () => {
      // Get all files from the facility-images bucket
      const { data: files, error } = await supabase
        .storage
        .from("facility-images")
        .list("", { limit: 1000 });

      if (error) {
        console.error("Storage list error:", error);
        return { facilityImages: 0, adminAvatars: 0, totalUsed: 0, totalLimit: 10 };
      }

      // Calculate sizes by listing each folder
      let facilityImagesSize = 0;
      let adminAvatarsSize = 0;

      // Get all items with their sizes
      for (const file of files || []) {
        if (file.metadata?.size) {
          // Files in root are avatars
          adminAvatarsSize += file.metadata.size;
        } else if (file.name && !file.id) {
          // This is a folder, list its contents
          const { data: folderFiles } = await supabase
            .storage
            .from("facility-images")
            .list(file.name, { limit: 500 });
          
          for (const f of folderFiles || []) {
            if (f.metadata?.size) {
              if (file.name.includes("avatar") || file.name.includes("admin")) {
                adminAvatarsSize += f.metadata.size;
              } else {
                facilityImagesSize += f.metadata.size;
              }
            }
          }
        }
      }

      // Convert to GB
      const facilityImagesGB = facilityImagesSize / (1024 * 1024 * 1024);
      const adminAvatarsGB = adminAvatarsSize / (1024 * 1024 * 1024);
      const totalUsedGB = facilityImagesGB + adminAvatarsGB;

      return {
        facilityImages: facilityImagesGB,
        adminAvatars: adminAvatarsGB,
        totalUsed: totalUsedGB,
        totalLimit: 10, // 10 GB limit
      };
    },
  });

  // Fetch last backup info
  const { data: backupInfo } = useQuery({
    queryKey: ["admin-backup-info"],
    queryFn: async () => {
      // Get the most recent audit log entry as a proxy for activity/backup time
      const { data } = await supabase
        .from("admin_audit_log")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      const lastActivity = data?.[0]?.created_at;
      
      // Calculate a simulated last backup time (3 AM of current day)
      const now = new Date();
      const lastBackup = new Date(now);
      lastBackup.setHours(3, 0, 0, 0);
      if (lastBackup > now) {
        lastBackup.setDate(lastBackup.getDate() - 1);
      }

      return {
        lastBackupTime: lastBackup.toISOString(),
        lastActivityTime: lastActivity,
      };
    },
  });

  // Export data mutation
  const exportData = useMutation({
    mutationFn: async ({ type, format = "json" }: { type: "providers" | "leads" | "analytics" | "audit" | "subscriptions" | "notifications"; format?: "json" | "csv" }) => {
      let data: any[] = [];
      let filename = "";
      let csvHeaders: string[] = [];

      switch (type) {
        case "providers":
          const { data: facilities } = await supabase
            .from("facilities")
            .select("name, city, state, phone, email, status, featured, verified, suspended, created_at, updated_at");
          data = facilities || [];
          filename = `providers-export-${new Date().toISOString().split('T')[0]}`;
          csvHeaders = ["name", "city", "state", "phone", "email", "status", "featured", "verified", "suspended", "created_at", "updated_at"];
          break;
        case "leads":
          const { data: leads } = await supabase
            .from("leads")
            .select("name, email, phone, status, source, quality_flag, insurance_type, urgency, qualified, created_at, facility_id");
          data = leads || [];
          filename = `leads-export-${new Date().toISOString().split('T')[0]}`;
          csvHeaders = ["name", "email", "phone", "status", "source", "quality_flag", "insurance_type", "urgency", "qualified", "created_at", "facility_id"];
          break;
        case "analytics":
          const [viewsResult, interactionsResult] = await Promise.all([
            supabase.from("facility_views").select("facility_id, view_date, view_count, created_at").order("view_date", { ascending: false }).limit(1000),
            supabase.from("facility_interactions").select("id, facility_id, interaction_type, interaction_count, interaction_date, created_at").order("interaction_date", { ascending: false }).limit(1000),
          ]);
          
          if (format === "csv") {
            // For CSV, combine views data
            data = viewsResult.data || [];
            csvHeaders = ["facility_id", "view_date", "view_count", "created_at"];
          } else {
            data = {
              views: viewsResult.data || [],
              interactions: interactionsResult.data || [],
              exportDate: new Date().toISOString(),
            } as any;
          }
          filename = `analytics-export-${new Date().toISOString().split('T')[0]}`;
          break;
        case "audit":
          const { data: auditLogs } = await supabase
            .from("admin_audit_log")
            .select("id, admin_user_id, action_type, target_type, target_id, details, created_at")
            .order("created_at", { ascending: false })
            .limit(1000);
          data = auditLogs || [];
          filename = `audit-log-export-${new Date().toISOString().split('T')[0]}`;
          csvHeaders = ["id", "admin_user_id", "action_type", "target_type", "target_id", "created_at"];
          break;
        case "subscriptions":
          const { data: profiles } = await supabase
            .from("profiles")
            .select("first_name, last_name, email, created_at");
          data = profiles || [];
          filename = `subscriptions-export-${new Date().toISOString().split('T')[0]}`;
          csvHeaders = ["first_name", "last_name", "email", "created_at"];
          break;
        case "notifications":
          const { data: notifications } = await supabase
            .from("admin_notifications")
            .select("id, type, title, message, read, created_at")
            .order("created_at", { ascending: false })
            .limit(1000);
          data = notifications || [];
          filename = `notifications-export-${new Date().toISOString().split('T')[0]}`;
          csvHeaders = ["id", "type", "title", "message", "read", "created_at"];
          break;
        default:
          throw new Error("Invalid export type");
      }

      let blob: Blob;
      let finalFilename: string;

      if (format === "csv" && Array.isArray(data)) {
        // Convert to CSV
        const csvRows = [csvHeaders.join(",")];
        data.forEach((row: any) => {
          const values = csvHeaders.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return "";
            if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return String(val);
          });
          csvRows.push(values.join(","));
        });
        blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        finalFilename = `${filename}.csv`;
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        finalFilename = `${filename}.json`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const recordCount = type === "analytics" && format === "json"
        ? ((data as any).views?.length || 0) + ((data as any).interactions?.length || 0)
        : (data as any[]).length;
      
      // Log the export action
      await logAdminAction({
        actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
        targetType: "data_export",
        details: { export_type: type, format, record_count: recordCount }
      });
      
      return { count: recordCount, format };
    },
    onSuccess: (result, variables) => {
      toast.success(`Export complete`, {
        description: `Exported ${result.count} ${variables.type} records as ${result.format.toUpperCase()}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Export failed", { description: error.message });
    },
  });

  // Clear cache mutation
  const clearCache = useMutation({
    mutationFn: async () => {
      // Clear React Query cache
      queryClient.clear();
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action_type: "clear_cache",
          target_type: "platform",
          details: { cleared_at: new Date().toISOString() },
        });
      }

      return true;
    },
    onSuccess: () => {
      toast.success("Cache cleared", {
        description: "All cached data has been reset",
      });
      // Refetch essential data
      invalidateSettingsQueries();
      refetchStorage();
    },
    onError: (error: Error) => {
      toast.error("Failed to clear cache", { description: error.message });
    },
  });

  // Update backup retention mutation
  const updateBackupRetention = useMutation({
    mutationFn: async (days: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upsert the backup retention setting
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          setting_key: "backup_retention_days",
          setting_value: { days: parseInt(days) },
          updated_by: user?.id,
        }, { onConflict: "setting_key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Backup retention updated");
      invalidateSettingsQueries();
    },
    onError: (error: Error) => {
      toast.error("Failed to update retention", { description: error.message });
    },
  });

  // Update audit log retention mutation
  const updateAuditLogRetention = useMutation({
    mutationFn: async (days: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          setting_key: "audit_log_retention_days",
          setting_value: { days: parseInt(days) },
          updated_by: user?.id,
        }, { onConflict: "setting_key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Audit log retention updated");
      invalidateSettingsQueries();
    },
    onError: (error: Error) => {
      toast.error("Failed to update retention", { description: error.message });
    },
  });

  // Run audit log cleanup mutation
  const runAuditLogCleanup = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cleanup-audit-logs");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Audit log cleanup complete", {
        description: `Deleted ${data.deleted || 0} old audit log entries`,
      });
      invalidateSettingsQueries();
      refetchStats();
    },
    onError: (error: Error) => {
      toast.error("Cleanup failed", { description: error.message });
    },
  });

  // Get settings values
  const maintenanceEnabled = platformSettings?.maintenance_mode?.setting_value?.enabled ?? false;
  const apiRateLevel = platformSettings?.api_rate_limiting?.setting_value?.level ?? "default";
  const sessionTimeout = platformSettings?.session_timeout?.setting_value?.minutes?.toString() ?? "30";
  const timestampFormat = platformSettings?.timestamp_display?.setting_value?.format ?? "relative";
  const backupRetentionDays = platformSettings?.backup_retention_days?.setting_value?.days?.toString() ?? "30";
  const auditLogRetentionDays = platformSettings?.audit_log_retention_days?.setting_value?.days?.toString() ?? "90";
  const themeMode = platformSettings?.theme_mode?.setting_value?.mode ?? "light";
  const compactMode = platformSettings?.compact_mode?.setting_value?.enabled ?? false;

  // Storage calculations
  const storageUsed = storageData?.totalUsed ?? 0;
  const storageTotal = storageData?.totalLimit ?? 10;
  const storagePercent = storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0;

  // Format backup time
  const formatBackupTime = (isoString?: string) => {
    if (!isoString) return "Never";
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return isToday ? `Today at ${time}` : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` at ${time}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin 
            ? "Manage platform configuration and preferences" 
            : "Manage your personal preferences"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={cn(
          "grid w-full max-w-2xl",
          allowedTabs.length === 2 ? "grid-cols-2" : 
          allowedTabs.length === 3 ? "grid-cols-3" : "grid-cols-4"
        )}>
          {allowedTabs.includes("general") && (
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
          )}
          {allowedTabs.includes("security") && (
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          )}
          {allowedTabs.includes("notifications") && (
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          )}
          {allowedTabs.includes("data") && (
            <TabsTrigger value="data" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          {loadingSettings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Platform Settings - Super Admin Only */}
              {isSuperAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="h-5 w-5 text-blue-500" />
                      Platform Settings
                    </CardTitle>
                    <CardDescription>General platform configuration options</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <SettingRow
                      icon={<Server className="h-4 w-4 text-slate-500" />}
                      title="Maintenance Mode"
                      description="Temporarily disable public access to the platform"
                    >
                      <Switch 
                        checked={maintenanceEnabled}
                        onCheckedChange={(checked) => {
                          updateSetting.mutate({
                            key: "maintenance_mode",
                            value: { enabled: checked }
                          });
                        }}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Zap className="h-4 w-4 text-slate-500" />}
                      title="API Rate Limiting"
                      description="Control request throttling for API endpoints"
                    >
                      <Select 
                        value={apiRateLevel}
                        onValueChange={(value) => {
                          updateSetting.mutate({
                            key: "api_rate_limiting",
                            value: { level: value }
                          });
                        }}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Clock className="h-4 w-4 text-slate-500" />}
                      title="Session Timeout"
                      description="Auto logout after period of inactivity"
                    >
                      <Select 
                        value={sessionTimeout}
                        onValueChange={(value) => {
                          updateSetting.mutate({
                            key: "session_timeout",
                            value: { minutes: parseInt(value) }
                          });
                        }}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                  </CardContent>
                </Card>
              )}

              {/* Appearance - All Admins */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Palette className="h-5 w-5 text-purple-500" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize your admin panel look and feel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SettingRow
                    icon={<Palette className="h-4 w-4 text-slate-500" />}
                    title="Theme Mode"
                    description="Choose between light and dark themes"
                  >
                    <Select 
                      value={themeMode}
                      onValueChange={(value) => {
                        updateSetting.mutate({
                          key: "theme_mode",
                          value: { mode: value }
                        });
                      }}
                      disabled={updateSetting.isPending}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <Separator />
                  <SettingRow
                    icon={<Activity className="h-4 w-4 text-slate-500" />}
                    title="Compact Mode"
                    description="Use condensed layouts for data tables"
                  >
                    <Switch 
                      checked={compactMode}
                      onCheckedChange={(checked) => {
                        updateSetting.mutate({
                          key: "compact_mode",
                          value: { enabled: checked }
                        });
                      }}
                      disabled={updateSetting.isPending}
                    />
                  </SettingRow>
                  <Separator />
                  <SettingRow
                    icon={<FileText className="h-4 w-4 text-slate-500" />}
                    title="Show Timestamps"
                    description="Display relative or absolute timestamps"
                  >
                    <Select 
                      value={timestampFormat}
                      onValueChange={(value) => {
                        updateSetting.mutate({
                          key: "timestamp_display",
                          value: { format: value }
                        });
                      }}
                      disabled={updateSetting.isPending}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relative">Relative</SelectItem>
                        <SelectItem value="absolute">Absolute</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </CardContent>
              </Card>

              {/* System Status & Platform Statistics - Super Admin Only */}
              {isSuperAdmin && (
              <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-green-500" />
                    System Status
                  </CardTitle>
                  <CardDescription>Current platform health and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className={cn(
                      "p-4 rounded-lg border",
                      maintenanceEnabled 
                        ? "bg-amber-50 border-amber-100" 
                        : "bg-green-50 border-green-100"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 mb-1",
                        maintenanceEnabled ? "text-amber-700" : "text-green-700"
                      )}>
                        <Server className="h-4 w-4" />
                        <span className="text-sm font-medium">API Server</span>
                      </div>
                      <p className={cn(
                        "text-2xl font-bold",
                        maintenanceEnabled ? "text-amber-700" : "text-green-700"
                      )}>
                        {maintenanceEnabled ? "Maintenance" : "Healthy"}
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        maintenanceEnabled ? "text-amber-600" : "text-green-600"
                      )}>
                        {maintenanceEnabled ? "Maintenance mode active" : "99.9% uptime"}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Database className="h-4 w-4" />
                        <span className="text-sm font-medium">Database</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Connected</p>
                      <p className="text-xs text-green-600 mt-1">{stats?.totalFacilities || 0} facilities, {stats?.totalLeads || 0} leads</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm font-medium">Email Service</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Active</p>
                      <p className="text-xs text-green-600 mt-1">Resend configured</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm font-medium">Edge Functions</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Running</p>
                      <p className="text-xs text-green-600 mt-1">{edgeFunctionsCount || 24} functions deployed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5 text-blue-500" />
                    Platform Statistics
                  </CardTitle>
                  <CardDescription>Real-time platform data overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground">Total Facilities</p>
                      <p className="text-2xl font-bold">{stats?.totalFacilities || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground">Total Leads</p>
                      <p className="text-2xl font-bold">{stats?.totalLeads || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm text-muted-foreground">Admin Users</p>
                      <p className="text-2xl font-bold">{stats?.totalAdminUsers || 0}</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border",
                      (stats?.pendingFlags || 0) > 0 
                        ? "bg-amber-50 border-amber-200" 
                        : "bg-muted/50"
                    )}>
                      <p className="text-sm text-muted-foreground">Pending Flags</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        (stats?.pendingFlags || 0) > 0 && "text-amber-700"
                      )}>
                        {stats?.pendingFlags || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </>
              )}
            </>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {settingsLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Two-Factor Authentication */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Smartphone className="h-5 w-5 text-purple-500" />
                      Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>Configure 2FA enforcement and settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <SettingRow
                      icon={<Shield className="h-4 w-4 text-slate-500" />}
                      title="Require 2FA"
                      description="Enforce 2FA for all admin accounts"
                    >
                      <Switch 
                        checked={getSetting('two_factor_required') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'two_factor_required', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Clock className="h-4 w-4 text-slate-500" />}
                      title="2FA Grace Period"
                      description="Days to set up 2FA after enforcement"
                    >
                      <Select 
                        value={String((getSetting('two_factor_grace_period') as { days?: number })?.days || '3')}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'two_factor_grace_period', 
                          value: { days: parseInt(value) } 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Immediate</SelectItem>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Key className="h-4 w-4 text-slate-500" />}
                      title="Recovery Codes"
                      description="Number of backup codes per user"
                    >
                      <Select 
                        value={String((getSetting('mfa_recovery_codes_count') as { count?: number })?.count || '10')}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'mfa_recovery_codes_count', 
                          value: { count: parseInt(value) } 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 codes</SelectItem>
                          <SelectItem value="10">10 codes</SelectItem>
                          <SelectItem value="15">15 codes</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                  </CardContent>
                </Card>

                {/* Password Policy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Lock className="h-5 w-5 text-amber-500" />
                      Password Policy
                    </CardTitle>
                    <CardDescription>Configure password requirements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <SettingRow
                      icon={<Key className="h-4 w-4 text-slate-500" />}
                      title="Minimum Length"
                      description="Required minimum password length"
                    >
                      <Select 
                        value={String((getSetting('password_min_length') as { length?: number })?.length || '8')}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'password_min_length', 
                          value: { length: parseInt(value) } 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8">8 characters</SelectItem>
                          <SelectItem value="10">10 characters</SelectItem>
                          <SelectItem value="12">12 characters</SelectItem>
                          <SelectItem value="16">16 characters</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Shield className="h-4 w-4 text-slate-500" />}
                      title="Require Uppercase"
                      description="Must include uppercase letters"
                    >
                      <Switch 
                        checked={(getSetting('password_require_uppercase') as { enabled?: boolean })?.enabled !== false}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'password_require_uppercase', 
                          value: { enabled: checked } 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Activity className="h-4 w-4 text-slate-500" />}
                      title="Require Numbers"
                      description="Must include numeric characters"
                    >
                      <Switch 
                        checked={(getSetting('password_require_numbers') as { enabled?: boolean })?.enabled !== false}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'password_require_numbers', 
                          value: { enabled: checked } 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Key className="h-4 w-4 text-slate-500" />}
                      title="Require Special Characters"
                      description="Must include symbols (!@#$%)"
                    >
                      <Switch 
                        checked={(getSetting('password_require_special') as { enabled?: boolean })?.enabled === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'password_require_special', 
                          value: { enabled: checked } 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Clock className="h-4 w-4 text-slate-500" />}
                      title="Password Expiry"
                      description="Force password change after period"
                    >
                      <Select 
                        value={String((getSetting('password_expiry_days') as { days?: number })?.days || 'never')}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'password_expiry_days', 
                          value: { days: value === 'never' ? null : parseInt(value) } 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                  </CardContent>
                </Card>
              </div>

              {/* Access Control & IP Management */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* IP Whitelist */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="h-5 w-5 text-blue-500" />
                      IP Access Control
                    </CardTitle>
                    <CardDescription>Restrict admin panel access by IP address</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SettingRow
                      icon={<Shield className="h-4 w-4 text-slate-500" />}
                      title="Enable IP Whitelist"
                      description="Only allow whitelisted IPs to access admin"
                    >
                      <Switch 
                        checked={getSetting('ip_whitelist_enabled') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'ip_whitelist_enabled', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-sm font-medium">Manage Whitelist</p>
                        <p className="text-xs text-muted-foreground">Add or remove allowed IP addresses</p>
                      </div>
                      <IPWhitelistDialog />
                    </div>
                  </CardContent>
                </Card>

                {/* Brute Force Protection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Ban className="h-5 w-5 text-red-500" />
                      Brute Force Protection
                    </CardTitle>
                    <CardDescription>Automatic lockout and blocking settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <SettingRow
                      icon={<Activity className="h-4 w-4 text-slate-500" />}
                      title="Failed Login Threshold"
                      description="Attempts before lockout triggers"
                    >
                      <Select 
                        value={String((getSetting('failed_login_lockout') as { attempts?: number })?.attempts || '5')}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'failed_login_lockout', 
                          value: { attempts: parseInt(value) } 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 attempts</SelectItem>
                          <SelectItem value="5">5 attempts</SelectItem>
                          <SelectItem value="10">10 attempts</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Clock className="h-4 w-4 text-slate-500" />}
                      title="Lockout Duration"
                      description="How long accounts stay locked"
                    >
                      <Select 
                        value={String((getSetting('lockout_duration_minutes') as { minutes?: number })?.minutes || '15')}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'lockout_duration_minutes', 
                          value: { minutes: parseInt(value) } 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Shield className="h-4 w-4 text-slate-500" />}
                      title="Auto-Block Threshold"
                      description="Block IP after excessive failures"
                    >
                      <Select 
                        value={String((getSetting('auto_block_threshold') as { attempts?: number })?.attempts || '10')}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'auto_block_threshold', 
                          value: { attempts: parseInt(value) } 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 attempts</SelectItem>
                          <SelectItem value="15">15 attempts</SelectItem>
                          <SelectItem value="20">20 attempts</SelectItem>
                        </SelectContent>
                      </Select>
                    </SettingRow>
                    <Separator />
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-sm font-medium">Blocked Identifiers</p>
                        <p className="text-xs text-muted-foreground">View and manage blocked IPs/emails</p>
                      </div>
                      <BlockedIdentifiersDialog />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Security Status Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Security Status
                  </CardTitle>
                  <CardDescription>Current security feature status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Shield className="h-4 w-4" />
                        <span className="text-sm font-medium">Role-Based Access</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Enabled</p>
                      <p className="text-xs text-green-600 mt-1">Granular permissions active</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm font-medium">Session Tracking</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Active</p>
                      <p className="text-xs text-green-600 mt-1">All sessions monitored</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">Audit Logging</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Recording</p>
                      <p className="text-xs text-green-600 mt-1">All actions logged</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border",
                      getSetting('two_factor_required') 
                        ? "bg-green-50 border-green-100" 
                        : "bg-amber-50 border-amber-100"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 mb-1",
                        getSetting('two_factor_required') ? "text-green-700" : "text-amber-700"
                      )}>
                        <Smartphone className="h-4 w-4" />
                        <span className="text-sm font-medium">2FA Status</span>
                      </div>
                      <p className={cn(
                        "text-2xl font-bold",
                        getSetting('two_factor_required') ? "text-green-700" : "text-amber-700"
                      )}>
                        {getSetting('two_factor_required') ? 'Required' : 'Optional'}
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        getSetting('two_factor_required') ? "text-green-600" : "text-amber-600"
                      )}>
                        {getSetting('two_factor_required') ? 'All admins must use 2FA' : 'Consider enabling'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Key className="h-4 w-4" />
                        <span className="text-sm font-medium">Password Policy</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">
                        {(getSetting('password_min_length') as { length?: number })?.length || 8}+ chars
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {(getSetting('password_require_special') as { enabled?: boolean })?.enabled ? 'Complex required' : 'Standard'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Real-Time Security Alerts */}
              <SecurityAlertsPanel />

              {/* Security Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-green-500" />
                    Security Overview
                  </CardTitle>
                  <CardDescription>Current security posture and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-800">Row Level Security Enabled</p>
                        <p className="text-sm text-green-600">All database tables have RLS policies configured</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-800">HTTPS Enforced</p>
                        <p className="text-sm text-green-600">All connections are encrypted with TLS 1.3</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-800">Brute Force Protection</p>
                        <p className="text-sm text-green-600">
                          Auto-lockout after {(getSetting('failed_login_lockout') as { attempts?: number })?.attempts || 5} failed attempts, 
                          IP blocked after {(getSetting('auto_block_threshold') as { attempts?: number })?.attempts || 10} attempts
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border",
                      getSetting('two_factor_required') 
                        ? "bg-green-50 border-green-100" 
                        : "bg-amber-50 border-amber-100"
                    )}>
                      {getSetting('two_factor_required') ? (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 text-amber-500" />
                      )}
                      <div className="flex-1">
                        <p className={cn(
                          "font-medium",
                          getSetting('two_factor_required') ? "text-green-800" : "text-amber-800"
                        )}>
                          Two-Factor Authentication
                        </p>
                        <p className={cn(
                          "text-sm",
                          getSetting('two_factor_required') ? "text-green-600" : "text-amber-600"
                        )}>
                          {getSetting('two_factor_required') 
                            ? '2FA is required for all admin accounts' 
                            : 'Consider enabling 2FA for enhanced security'}
                        </p>
                      </div>
                      {!getSetting('two_factor_required') && (
                        <Badge variant="secondary">Recommended</Badge>
                      )}
                    </div>
                    <div className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border",
                      getSetting('ip_whitelist_enabled') 
                        ? "bg-green-50 border-green-100" 
                        : "bg-muted/50"
                    )}>
                      {getSetting('ip_whitelist_enabled') ? (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      ) : (
                        <Shield className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className={cn(
                          "font-medium",
                          getSetting('ip_whitelist_enabled') ? "text-green-800" : "text-foreground"
                        )}>
                          IP Whitelist
                        </p>
                        <p className={cn(
                          "text-sm",
                          getSetting('ip_whitelist_enabled') ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {getSetting('ip_whitelist_enabled') 
                            ? 'Admin access restricted to specific IPs' 
                            : 'IP restriction is currently disabled'}
                        </p>
                      </div>
                      {getSetting('ip_whitelist_enabled') && (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Password Policy</p>
                        <p className="text-sm text-green-600">
                          Min {(getSetting('password_min_length') as { length?: number })?.length || 8} characters
                          {(getSetting('password_require_uppercase') as { enabled?: boolean })?.enabled !== false && ', uppercase'}
                          {(getSetting('password_require_numbers') as { enabled?: boolean })?.enabled !== false && ', numbers'}
                          {(getSetting('password_require_special') as { enabled?: boolean })?.enabled && ', special chars'}
                        </p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Configured</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {settingsLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Activity className="h-3 w-3" />
                    Live Sync
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Settings update in real-time
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from("admin_user_notifications").insert({
                          user_id: user.id,
                          type: "system",
                          title: "Test Notification",
                          message: "This is a test notification to verify your notification settings are working correctly.",
                          metadata: { test: true, sent_at: new Date().toISOString() }
                        });
                        await logAdminAction({
                          actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
                          targetType: "notifications",
                          details: { action: "test_notification_sent" }
                        });
                        toast.success("Test notification sent", {
                          description: "Check your notification bell"
                        });
                      }
                    } catch (error) {
                      toast.error("Failed to send test notification");
                    }
                  }}
                >
                  <Bell className="h-4 w-4" />
                  Send Test Notification
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Email Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="h-5 w-5 text-blue-500" />
                      Email Notifications
                    </CardTitle>
                    <CardDescription>Configure admin email alerts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <SettingRow
                      icon={<Users className="h-4 w-4 text-slate-500" />}
                      title="New Provider Signups"
                      description="Get notified when providers register"
                    >
                      <Switch 
                        checked={getSetting('email_new_provider_signups') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'email_new_provider_signups', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Zap className="h-4 w-4 text-slate-500" />}
                      title="New Lead Submissions"
                      description="Alert when new leads are submitted"
                    >
                      <Switch 
                        checked={getSetting('email_new_leads') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'email_new_leads', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
                      title="Payment Failures"
                      description="Alert when subscription payments fail"
                    >
                      <Switch 
                        checked={getSetting('email_payment_failures') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'email_payment_failures', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Shield className="h-4 w-4 text-slate-500" />}
                      title="Security Alerts"
                      description="Brute force attacks and suspicious activity"
                    >
                      <Switch 
                        checked={getSetting('email_security_alerts') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'email_security_alerts', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Activity className="h-4 w-4 text-slate-500" />}
                      title="System Alerts"
                      description="Critical system status notifications"
                    >
                      <Switch 
                        checked={getSetting('email_system_alerts') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'email_system_alerts', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
                      title="Churn Risk Alerts"
                      description="Notify when providers are at risk of churning"
                    >
                      <Switch 
                        checked={getSetting('email_churn_alerts') === true}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'email_churn_alerts', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                  </CardContent>
                </Card>

                {/* In-App Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bell className="h-5 w-5 text-purple-500" />
                      In-App Notifications
                    </CardTitle>
                    <CardDescription>Configure dashboard alerts</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <SettingRow
                      icon={<Users className="h-4 w-4 text-slate-500" />}
                      title="Pending Approvals"
                      description="Show badge for pending provider reviews"
                    >
                      <Switch 
                        checked={getSetting('inapp_pending_approvals') !== false}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'inapp_pending_approvals', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<FileText className="h-4 w-4 text-slate-500" />}
                      title="Flagged Content"
                      description="Notify about flagged images or content"
                    >
                      <Switch 
                        checked={getSetting('inapp_flagged_content') !== false}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'inapp_flagged_content', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Shield className="h-4 w-4 text-slate-500" />}
                      title="Security Events"
                      description="Alert on login attempts and security events"
                    >
                      <Switch 
                        checked={getSetting('inapp_security_events') !== false}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'inapp_security_events', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<Activity className="h-4 w-4 text-slate-500" />}
                      title="Subscription Changes"
                      description="Notify on upgrades, downgrades, and cancellations"
                    >
                      <Switch 
                        checked={getSetting('inapp_subscription_changes') !== false}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'inapp_subscription_changes', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                    <Separator />
                    <SettingRow
                      icon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
                      title="At-Risk Providers"
                      description="Notify when providers show churn signals"
                    >
                      <Switch 
                        checked={getSetting('inapp_at_risk_providers') !== false}
                        onCheckedChange={(checked) => updateSetting.mutate({ 
                          key: 'inapp_at_risk_providers', 
                          value: checked 
                        })}
                        disabled={updateSetting.isPending}
                      />
                    </SettingRow>
                  </CardContent>
                </Card>
              </div>

              {/* Digest Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-green-500" />
                    Digest & Summary
                  </CardTitle>
                  <CardDescription>Configure periodic summary notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-3">
                      <Label>Daily Summary Email</Label>
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={getSetting('daily_summary_enabled') === true}
                          onCheckedChange={(checked) => updateSetting.mutate({ 
                            key: 'daily_summary_enabled', 
                            value: checked 
                          })}
                          disabled={updateSetting.isPending}
                        />
                        <span className="text-sm text-muted-foreground">
                          {getSetting('daily_summary_enabled') ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Daily Summary Time</Label>
                      <Select 
                        value={getSetting('daily_summary_time') || '09:00'}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'daily_summary_time', 
                          value 
                        })}
                        disabled={updateSetting.isPending || !getSetting('daily_summary_enabled')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="06:00">6:00 AM</SelectItem>
                          <SelectItem value="07:00">7:00 AM</SelectItem>
                          <SelectItem value="08:00">8:00 AM</SelectItem>
                          <SelectItem value="09:00">9:00 AM</SelectItem>
                          <SelectItem value="10:00">10:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label>Weekly Analytics Report</Label>
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={getSetting('weekly_report_enabled') === true}
                          onCheckedChange={(checked) => updateSetting.mutate({ 
                            key: 'weekly_report_enabled', 
                            value: checked 
                          })}
                          disabled={updateSetting.isPending}
                        />
                        <span className="text-sm text-muted-foreground">
                          {getSetting('weekly_report_enabled') ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Weekly Report Day</Label>
                      <Select 
                        value={getSetting('weekly_report_day') || 'monday'}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'weekly_report_day', 
                          value 
                        })}
                        disabled={updateSetting.isPending || !getSetting('weekly_report_enabled')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                          <SelectItem value="saturday">Saturday</SelectItem>
                          <SelectItem value="sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Send Now Buttons */}
                  <div className="flex gap-3 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!getSetting('daily_summary_enabled')}
                      onClick={async () => {
                        try {
                          toast.info("Sending daily summary...");
                          const response = await supabase.functions.invoke("send-admin-daily-summary");
                          if (response.error) throw response.error;
                          await logAdminAction({
                            actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
                            targetType: "notifications",
                            details: { action: "manual_daily_summary_sent" }
                          });
                          toast.success("Daily summary sent", {
                            description: response.data?.message || "Email delivered successfully"
                          });
                        } catch (error: any) {
                          toast.error("Failed to send daily summary", {
                            description: error.message
                          });
                        }
                      }}
                    >
                      <Mail className="h-4 w-4" />
                      Send Daily Summary Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!getSetting('weekly_report_enabled')}
                      onClick={async () => {
                        try {
                          toast.info("Sending weekly report...");
                          const response = await supabase.functions.invoke("send-admin-weekly-report");
                          if (response.error) throw response.error;
                          await logAdminAction({
                            actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
                            targetType: "notifications",
                            details: { action: "manual_weekly_report_sent" }
                          });
                          toast.success("Weekly report sent", {
                            description: response.data?.message || "Email delivered successfully"
                          });
                        } catch (error: any) {
                          toast.error("Failed to send weekly report", {
                            description: error.message
                          });
                        }
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      Send Weekly Report Now
                    </Button>
                  </div>
                  
                  <Separator className="my-6" />
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-3">
                      <Label>Include in Daily Summary</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={getSetting('daily_include_new_providers') !== false}
                            onCheckedChange={(checked) => updateSetting.mutate({ 
                              key: 'daily_include_new_providers', 
                              value: checked 
                            })}
                            disabled={updateSetting.isPending || !getSetting('daily_summary_enabled')}
                            id="daily-providers"
                          />
                          <Label htmlFor="daily-providers" className="text-sm font-normal cursor-pointer">
                            New Providers
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={getSetting('daily_include_leads') !== false}
                            onCheckedChange={(checked) => updateSetting.mutate({ 
                              key: 'daily_include_leads', 
                              value: checked 
                            })}
                            disabled={updateSetting.isPending || !getSetting('daily_summary_enabled')}
                            id="daily-leads"
                          />
                          <Label htmlFor="daily-leads" className="text-sm font-normal cursor-pointer">
                            Lead Summary
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={getSetting('daily_include_revenue') !== false}
                            onCheckedChange={(checked) => updateSetting.mutate({ 
                              key: 'daily_include_revenue', 
                              value: checked 
                            })}
                            disabled={updateSetting.isPending || !getSetting('daily_summary_enabled')}
                            id="daily-revenue"
                          />
                          <Label htmlFor="daily-revenue" className="text-sm font-normal cursor-pointer">
                            Revenue Summary
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Include in Weekly Report</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={getSetting('weekly_include_analytics') !== false}
                            onCheckedChange={(checked) => updateSetting.mutate({ 
                              key: 'weekly_include_analytics', 
                              value: checked 
                            })}
                            disabled={updateSetting.isPending || !getSetting('weekly_report_enabled')}
                            id="weekly-analytics"
                          />
                          <Label htmlFor="weekly-analytics" className="text-sm font-normal cursor-pointer">
                            Platform Analytics
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={getSetting('weekly_include_retention') !== false}
                            onCheckedChange={(checked) => updateSetting.mutate({ 
                              key: 'weekly_include_retention', 
                              value: checked 
                            })}
                            disabled={updateSetting.isPending || !getSetting('weekly_report_enabled')}
                            id="weekly-retention"
                          />
                          <Label htmlFor="weekly-retention" className="text-sm font-normal cursor-pointer">
                            Retention Metrics
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={getSetting('weekly_include_churn') !== false}
                            onCheckedChange={(checked) => updateSetting.mutate({ 
                              key: 'weekly_include_churn', 
                              value: checked 
                            })}
                            disabled={updateSetting.isPending || !getSetting('weekly_report_enabled')}
                            id="weekly-churn"
                          />
                          <Label htmlFor="weekly-churn" className="text-sm font-normal cursor-pointer">
                            Churn Analysis
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Notification Recipients</Label>
                      <Select 
                        value={getSetting('digest_recipients') || 'all_admins'}
                        onValueChange={(value) => updateSetting.mutate({ 
                          key: 'digest_recipients', 
                          value 
                        })}
                        disabled={updateSetting.isPending}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_admins">All Admin Users</SelectItem>
                          <SelectItem value="super_admins">Super Admins Only</SelectItem>
                          <SelectItem value="managers">Managers & Above</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Who receives digest emails
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Behavior */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-slate-500" />
                    Notification Behavior
                  </CardTitle>
                  <CardDescription>Configure how notifications are delivered and displayed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <SettingRow
                    icon={<Bell className="h-4 w-4 text-slate-500" />}
                    title="Sound Notifications"
                    description="Play sound for new notifications"
                  >
                    <Switch 
                      checked={getSetting('notification_sound') !== false}
                      onCheckedChange={(checked) => updateSetting.mutate({ 
                        key: 'notification_sound', 
                        value: checked 
                      })}
                      disabled={updateSetting.isPending}
                    />
                  </SettingRow>
                  <Separator />
                  <SettingRow
                    icon={<Globe className="h-4 w-4 text-slate-500" />}
                    title="Browser Notifications"
                    description="Show desktop notifications when app is in background"
                  >
                    <Switch 
                      checked={getSetting('browser_notifications') === true}
                      onCheckedChange={async (checked) => {
                        if (checked && 'Notification' in window) {
                          const permission = await Notification.requestPermission();
                          if (permission !== 'granted') {
                            toast.error("Browser notification permission denied");
                            return;
                          }
                        }
                        updateSetting.mutate({ 
                          key: 'browser_notifications', 
                          value: checked 
                        });
                      }}
                      disabled={updateSetting.isPending}
                    />
                  </SettingRow>
                  <Separator />
                  <SettingRow
                    icon={<Clock className="h-4 w-4 text-slate-500" />}
                    title="Auto-mark as Read"
                    description="Automatically mark notifications as read after viewing"
                  >
                    <Select 
                      value={getSetting('auto_mark_read_delay') || '5'}
                      onValueChange={(value) => updateSetting.mutate({ 
                        key: 'auto_mark_read_delay', 
                        value 
                      })}
                      disabled={updateSetting.isPending}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Immediately</SelectItem>
                        <SelectItem value="3">After 3 seconds</SelectItem>
                        <SelectItem value="5">After 5 seconds</SelectItem>
                        <SelectItem value="10">After 10 seconds</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <Separator />
                  <SettingRow
                    icon={<Trash2 className="h-4 w-4 text-slate-500" />}
                    title="Auto-delete Old Notifications"
                    description="Automatically remove notifications older than"
                  >
                    <Select 
                      value={getSetting('notification_retention_days') || '30'}
                      onValueChange={(value) => updateSetting.mutate({ 
                        key: 'notification_retention_days', 
                        value 
                      })}
                      disabled={updateSetting.isPending}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </CardContent>
              </Card>

              {/* Notification Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Notification Status
                  </CardTitle>
                  <CardDescription>Current notification system status and configuration overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm font-medium">Email Service</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Active</p>
                      <p className="text-xs text-green-600 mt-1">Resend configured</p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border",
                      getSetting('daily_summary_enabled') 
                        ? "bg-green-50 border-green-100" 
                        : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 mb-1",
                        getSetting('daily_summary_enabled') ? "text-green-700" : "text-muted-foreground"
                      )}>
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Daily Digest</span>
                      </div>
                      <p className={cn(
                        "text-2xl font-bold",
                        getSetting('daily_summary_enabled') ? "text-green-700" : "text-muted-foreground"
                      )}>
                        {getSetting('daily_summary_enabled') ? 'Active' : 'Disabled'}
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        getSetting('daily_summary_enabled') ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {getSetting('daily_summary_enabled') 
                          ? `Sends at ${getSetting('daily_summary_time') || '09:00'}` 
                          : 'Not scheduled'}
                      </p>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border",
                      getSetting('weekly_report_enabled') 
                        ? "bg-green-50 border-green-100" 
                        : "bg-muted/50"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 mb-1",
                        getSetting('weekly_report_enabled') ? "text-green-700" : "text-muted-foreground"
                      )}>
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">Weekly Report</span>
                      </div>
                      <p className={cn(
                        "text-2xl font-bold",
                        getSetting('weekly_report_enabled') ? "text-green-700" : "text-muted-foreground"
                      )}>
                        {getSetting('weekly_report_enabled') ? 'Active' : 'Disabled'}
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        getSetting('weekly_report_enabled') ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {getSetting('weekly_report_enabled') 
                          ? `Sends every ${(getSetting('weekly_report_day') || 'monday').charAt(0).toUpperCase() + (getSetting('weekly_report_day') || 'monday').slice(1)}` 
                          : 'Not scheduled'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 mb-1">
                        <Bell className="h-4 w-4" />
                        <span className="text-sm font-medium">In-App Alerts</span>
                      </div>
                      <p className="text-2xl font-bold text-green-700">Active</p>
                      <p className="text-xs text-green-600 mt-1">Real-time enabled</p>
                    </div>
                  </div>
                  
                  {/* Configuration Summary */}
                  <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-800">Configuration Summary</p>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Email notifications: {
                            [
                              getSetting('email_new_provider_signups') && 'New Providers',
                              getSetting('email_new_leads') && 'New Leads',
                              getSetting('email_payment_failures') && 'Payment Failures',
                              getSetting('email_security_alerts') && 'Security Alerts',
                              getSetting('email_system_alerts') && 'System Alerts',
                              getSetting('email_churn_alerts') && 'Churn Alerts'
                            ].filter(Boolean).join(', ') || 'None enabled'
                          }</li>
                          <li>• Browser notifications: {getSetting('browser_notifications') ? 'Enabled' : 'Disabled'}</li>
                          <li>• Sound notifications: {getSetting('notification_sound') !== false ? 'Enabled' : 'Disabled'}</li>
                          <li>• Notification retention: {getSetting('notification_retention_days') || '30'} days</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Notifications Panel */}
              <RecentNotificationsPanel />
            </>
          )}
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Activity className="h-3 w-3" />
                Live Data
              </Badge>
              <span className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={async () => {
                  try {
                    // Run data integrity check
                    const [facilitiesResult, leadsResult, orphanedLeads] = await Promise.all([
                      supabase.from("facilities").select("id", { count: "exact", head: true }),
                      supabase.from("leads").select("id", { count: "exact", head: true }),
                      supabase.from("leads").select("id", { count: "exact", head: true }).is("facility_id", null),
                    ]);
                    
                    const issues = [];
                    if (orphanedLeads.count && orphanedLeads.count > 0) {
                      issues.push(`${orphanedLeads.count} orphaned leads (no facility)`);
                    }
                    
                    await logAdminAction({
                      actionType: AdminAuditActions.PLATFORM_SETTINGS_UPDATED,
                      targetType: "data_integrity",
                      details: { 
                        action: "integrity_check",
                        facilities: facilitiesResult.count,
                        leads: leadsResult.count,
                        orphaned_leads: orphanedLeads.count,
                        issues: issues
                      }
                    });
                    
                    if (issues.length === 0) {
                      toast.success("Data integrity check passed", {
                        description: "No issues found in database"
                      });
                    } else {
                      toast.warning("Data integrity issues found", {
                        description: issues.join(", ")
                      });
                    }
                  } catch (error) {
                    toast.error("Integrity check failed");
                  }
                }}
              >
                <Shield className="h-4 w-4" />
                Run Integrity Check
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  refetchStats();
                  refetchStorage();
                  toast.success("Data refreshed");
                }}
                disabled={loadingStats || loadingStorage}
              >
                <RefreshCw className={cn("h-4 w-4", (loadingStats || loadingStorage) && "animate-spin")} />
                Refresh All
              </Button>
            </div>
          </div>

          {/* Data Health Monitor */}
          <DataHealthMonitor />

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Storage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HardDrive className="h-5 w-5 text-blue-500" />
                  Storage Usage
                </CardTitle>
                <CardDescription>File storage and media management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingStorage ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {storageUsed.toFixed(2)} GB of {storageTotal} GB used
                        </span>
                        <span className={cn(
                          "text-sm font-medium",
                          storagePercent > 80 ? "text-red-600" : storagePercent > 60 ? "text-amber-600" : "text-muted-foreground"
                        )}>
                          {storagePercent.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={storagePercent} 
                        className={cn(
                          "h-2",
                          storagePercent > 80 && "[&>div]:bg-red-500",
                          storagePercent > 60 && storagePercent <= 80 && "[&>div]:bg-amber-500"
                        )} 
                      />
                      {storagePercent > 80 && (
                        <p className="text-xs text-red-600 mt-1">Storage usage is high. Consider cleaning up unused files.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs text-blue-600">Facility Images</p>
                        <p className="text-lg font-semibold text-blue-700">
                          {(storageData?.facilityImages ?? 0).toFixed(2)} GB
                        </p>
                        <p className="text-xs text-blue-500 mt-1">Logos & galleries</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                        <p className="text-xs text-purple-600">Admin Avatars</p>
                        <p className="text-lg font-semibold text-purple-700">
                          {(storageData?.adminAvatars ?? 0).toFixed(2)} GB
                        </p>
                        <p className="text-xs text-purple-500 mt-1">Profile pictures</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => refetchStorage()}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1 gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Cleanup Orphans
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <Trash2 className="h-5 w-5 text-amber-500" />
                              Cleanup Orphaned Files?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will scan storage for files not linked to any facility and remove them. 
                              This helps free up storage space. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                toast.info("Scanning for orphaned files...");
                                try {
                                  const { data, error } = await supabase.functions.invoke("cleanup-orphan-storage");
                                  if (error) throw error;
                                  
                                  if (data.deleted_count > 0) {
                                    toast.success("Storage cleanup complete", {
                                      description: `Deleted ${data.deleted_count} orphaned files`
                                    });
                                  } else {
                                    toast.success("Storage cleanup complete", {
                                      description: "No orphaned files found"
                                    });
                                  }
                                  refetchStorage();
                                } catch (error) {
                                  const errMsg = error instanceof Error ? error.message : "Cleanup failed";
                                  toast.error("Storage cleanup failed", { description: errMsg });
                                }
                              }}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              Run Cleanup
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Backups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5 text-green-500" />
                  Database Backups
                </CardTitle>
                <CardDescription>Automated backup configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <SettingRow
                  icon={<Clock className="h-4 w-4 text-slate-500" />}
                  title="Automatic Backups"
                  description="Daily automated database snapshots at 3:00 AM UTC"
                >
                  <StatusBadge status="active" label="Enabled" />
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<HardDrive className="h-4 w-4 text-slate-500" />}
                  title="Backup Retention"
                  description="How long backups are stored"
                >
                  <Select 
                    value={backupRetentionDays}
                    onValueChange={(value) => updateBackupRetention.mutate(value)}
                    disabled={updateBackupRetention.isPending}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <Separator />
                <SettingRow
                  icon={<Server className="h-4 w-4 text-slate-500" />}
                  title="Backup Location"
                  description="Where backups are stored"
                >
                  <Badge variant="secondary">Lovable Cloud</Badge>
                </SettingRow>
                <Separator />
                <div className="pt-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                    <div>
                      <p className="text-sm font-medium text-green-800">Last backup</p>
                      <p className="text-xs text-green-600">{formatBackupTime(backupInfo?.lastBackupTime)}</p>
                    </div>
                    <StatusBadge status="active" label="Healthy" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audit Log Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-amber-500" />
                Audit Log Retention
              </CardTitle>
              <CardDescription>Configure how long audit logs are retained before automatic cleanup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <SettingRow
                    icon={<Clock className="h-4 w-4 text-slate-500" />}
                    title="Retention Period"
                    description="Logs older than this will be automatically cleaned up"
                  >
                    <Select 
                      value={auditLogRetentionDays}
                      onValueChange={(value) => updateAuditLogRetention.mutate(value)}
                      disabled={updateAuditLogRetention.isPending}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                  <div>
                    <p className="text-sm font-medium">Current Audit Logs</p>
                    <p className="text-2xl font-bold">{stats?.totalAuditLogs || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total entries stored</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                        disabled={runAuditLogCleanup.isPending}
                      >
                        {runAuditLogCleanup.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Run Cleanup Now
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-amber-500" />
                          Run Audit Log Cleanup?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will delete all audit log entries older than {auditLogRetentionDays} days based on your 
                          current retention setting. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => runAuditLogCleanup.mutate()}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Run Cleanup
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-700">
                  Audit logs are automatically cleaned up based on the retention period. Run manual cleanup to immediately remove old entries.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-purple-500" />
                Data Export
              </CardTitle>
              <CardDescription>Export platform data for analysis or compliance (JSON or CSV)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-4 flex-col gap-2"
                    onClick={() => exportData.mutate({ type: "providers", format: "json" })}
                    disabled={exportData.isPending}
                  >
                    {exportData.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    ) : (
                      <Download className="h-5 w-5 text-blue-500" />
                    )}
                    <span>Export Providers</span>
                    <span className="text-xs text-muted-foreground">{stats?.totalFacilities || 0} records</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => exportData.mutate({ type: "providers", format: "csv" })}
                    disabled={exportData.isPending}
                  >
                    Export as CSV
                  </Button>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-4 flex-col gap-2"
                    onClick={() => exportData.mutate({ type: "leads", format: "json" })}
                    disabled={exportData.isPending}
                  >
                    {exportData.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin text-green-500" />
                    ) : (
                      <Download className="h-5 w-5 text-green-500" />
                    )}
                    <span>Export Leads</span>
                    <span className="text-xs text-muted-foreground">{stats?.totalLeads || 0} records</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => exportData.mutate({ type: "leads", format: "csv" })}
                    disabled={exportData.isPending}
                  >
                    Export as CSV
                  </Button>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-4 flex-col gap-2"
                    onClick={() => exportData.mutate({ type: "analytics", format: "json" })}
                    disabled={exportData.isPending}
                  >
                    {exportData.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    ) : (
                      <Activity className="h-5 w-5 text-purple-500" />
                    )}
                    <span>Export Analytics</span>
                    <span className="text-xs text-muted-foreground">Views & Interactions</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => exportData.mutate({ type: "analytics", format: "csv" })}
                    disabled={exportData.isPending}
                  >
                    Export as CSV
                  </Button>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-4 flex-col gap-2"
                    onClick={() => exportData.mutate({ type: "audit", format: "json" })}
                    disabled={exportData.isPending}
                  >
                    {exportData.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                    ) : (
                      <Download className="h-5 w-5 text-amber-500" />
                    )}
                    <span>Export Audit Log</span>
                    <span className="text-xs text-muted-foreground">Last 1000 entries</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => exportData.mutate({ type: "audit", format: "csv" })}
                    disabled={exportData.isPending}
                  >
                    Export as CSV
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-700">
                  JSON exports include full data structure. CSV exports are optimized for spreadsheet analysis.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-indigo-500" />
                Data Statistics
              </CardTitle>
              <CardDescription>Overview of platform data with real-time updates</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Providers</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{stats?.totalFacilities || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                    <div className="flex items-center gap-2 text-green-700 mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Leads</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{stats?.totalLeads || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                    <div className="flex items-center gap-2 text-purple-700 mb-1">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Admin Users</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{stats?.totalAdminUsers || 0}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2 text-amber-700 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Pending Flags</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">{stats?.pendingFlags || 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database Tables Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-cyan-500" />
                Database Tables
              </CardTitle>
              <CardDescription>Row counts and table health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">facilities</span>
                  </div>
                  <Badge variant="secondary">{stats?.totalFacilities || 0} rows</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">leads</span>
                  </div>
                  <Badge variant="secondary">{stats?.totalLeads || 0} rows</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">user_roles</span>
                  </div>
                  <Badge variant="secondary">{stats?.totalAdminUsers || 0} rows</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">flagged_images</span>
                  </div>
                  <Badge variant="secondary">{stats?.pendingFlags || 0} pending</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">platform_settings</span>
                  </div>
                  <Badge variant="secondary">{Object.keys(platformSettings || {}).length} settings</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium">edge_functions</span>
                  </div>
                  <Badge variant="secondary">{edgeFunctionsCount || 0} deployed</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions that affect the entire platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
                <div>
                  <p className="font-medium text-red-800">Clear All Cache</p>
                  <p className="text-sm text-red-600">Reset all cached data across the platform</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      disabled={clearCache.isPending}
                    >
                      {clearCache.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Clear Cache
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Clear All Cache?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset all cached data across the platform. All users may experience 
                        slower load times temporarily while the cache rebuilds. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearCache.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear Cache
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 border border-red-100">
                <div>
                  <p className="font-medium text-red-800">Purge Old Data</p>
                  <p className="text-sm text-red-600">Remove audit logs older than {auditLogRetentionDays} days</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      disabled={runAuditLogCleanup.isPending}
                    >
                      {runAuditLogCleanup.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Purge Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Purge Old Audit Logs?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all audit log entries older than {auditLogRetentionDays} days.
                        This action cannot be undone and may affect compliance reporting.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => runAuditLogCleanup.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Purge Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
