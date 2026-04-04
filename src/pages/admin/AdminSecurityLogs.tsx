import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from "date-fns";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Search,
  RefreshCw,
  Filter,
  Download,
  Clock,
  Activity,
  Ban,
  Eye,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Globe,
  Loader2,
  Plus,
  Trash2,
  ShieldOff,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

interface RateLimitLog {
  id: string;
  identifier: string;
  action_type: string;
  success: boolean | null;
  created_at: string;
  metadata: Record<string, any> | null;
}

interface SuspiciousActivity {
  identifier: string;
  action_type: string;
  failed_count: number;
  last_attempt: string;
  first_attempt: string;
}

interface IpLocation {
  ip: string;
  city: string;
  regionName: string;
  country: string;
  countryCode: string;
  isp: string;
  status: string;
}

interface BlockedIdentifier {
  id: string;
  identifier: string;
  identifier_type: 'ip' | 'email';
  reason: string | null;
  blocked_by: string;
  blocked_at: string;
  expires_at: string | null;
  is_active: boolean;
}

const ITEMS_PER_PAGE = 25;

// Cache for IP locations to avoid repeated lookups
const ipLocationCache = new Map<string, IpLocation>();

export default function AdminSecurityLogs() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminSecurityLogs");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [successFilter, setSuccessFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [blockedPage, setBlockedPage] = useState(1);
  const [activeTab, setActiveTab] = useState("activity");
  const [selectedLog, setSelectedLog] = useState<RateLimitLog | null>(null);
  const [ipLocations, setIpLocations] = useState<Map<string, IpLocation>>(new Map());
  const [loadingLocations, setLoadingLocations] = useState<Set<string>>(new Set());
  const [selectedLogLocation, setSelectedLogLocation] = useState<IpLocation | null>(null);
  const [loadingSelectedLocation, setLoadingSelectedLocation] = useState(false);
  
  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockIdentifier, setBlockIdentifier] = useState("");
  const [blockType, setBlockType] = useState<'ip' | 'email'>('email');
  const [blockReason, setBlockReason] = useState("");
  const [blockExpiry, setBlockExpiry] = useState<string>("never");
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);
  const [selectedBlockedItem, setSelectedBlockedItem] = useState<BlockedIdentifier | null>(null);
  const [blockedSearchQuery, setBlockedSearchQuery] = useState("");

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "24h":
        return { from: subDays(now, 1), to: now };
      case "7d":
        return { from: subDays(now, 7), to: now };
      case "30d":
        return { from: subDays(now, 30), to: now };
      case "custom":
        return { 
          from: customDateFrom ? startOfDay(customDateFrom) : subDays(now, 7), 
          to: customDateTo ? endOfDay(customDateTo) : now 
        };
      default:
        return { from: subDays(now, 7), to: now };
    }
  };

  const { from: dateFrom, to: dateTo } = getDateRange();

  // Fetch rate limit logs
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs, error: logsError } = useQuery({
    queryKey: ["rate-limit-logs", actionFilter, successFilter, dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("rate_limit_log")
        .select("id, identifier, action_type, success, created_at, metadata")
        .gte("created_at", dateFrom.toISOString())
        .lte("created_at", dateTo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }
      if (successFilter !== "all") {
        query = query.eq("success", successFilter === "success");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RateLimitLog[];
    },
  });

  // Fetch suspicious activity (high failed attempt counts)
  const { data: suspiciousActivity, isLoading: suspiciousLoading, refetch: refetchSuspicious, error: suspiciousError } = useQuery({
    queryKey: ["suspicious-activity"],
    queryFn: async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("rate_limit_log")
        .select("identifier, action_type, created_at")
        .eq("success", false)
        .gte("created_at", oneHourAgo);

      if (error) throw error;

      // Aggregate by identifier
      const counts: Record<string, SuspiciousActivity> = {};
      for (const record of data || []) {
        const key = `${record.identifier}:${record.action_type}`;
        if (!counts[key]) {
          counts[key] = {
            identifier: record.identifier,
            action_type: record.action_type,
            failed_count: 0,
            last_attempt: record.created_at,
            first_attempt: record.created_at,
          };
        }
        counts[key].failed_count++;
        if (record.created_at > counts[key].last_attempt) {
          counts[key].last_attempt = record.created_at;
        }
        if (record.created_at < counts[key].first_attempt) {
          counts[key].first_attempt = record.created_at;
        }
      }

      return Object.values(counts)
        .filter((a) => a.failed_count >= 3)
        .sort((a, b) => b.failed_count - a.failed_count);
    },
  });

  // Fetch blocked identifiers
  const { data: blockedIdentifiers, isLoading: blockedLoading, refetch: refetchBlocked, error: blockedError } = useQuery({
    queryKey: ["blocked-identifiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_identifiers")
        .select("id, identifier, identifier_type, reason, blocked_by, blocked_at, expires_at, is_active")
        .order("blocked_at", { ascending: false });

      if (error) throw error;
      return data as BlockedIdentifier[];
    },
  });

  // Log query errors
  useEffect(() => {
    if (logsError) logError("fetch_rate_limit_logs", logsError, { queryKey: "rate-limit-logs" });
  }, [logsError, logError]);

  useEffect(() => {
    if (suspiciousError) logError("fetch_suspicious_activity", suspiciousError, { queryKey: "suspicious-activity" });
  }, [suspiciousError, logError]);

  useEffect(() => {
    if (blockedError) logError("fetch_blocked_identifiers", blockedError, { queryKey: "blocked-identifiers" });
  }, [blockedError, logError]);

  // Block identifier mutation
  const blockMutation = useMutation({
    mutationFn: async (params: { identifier: string; type: 'ip' | 'email'; reason: string; expiresAt: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get admin display name for notification
      const { data: adminProfile } = await supabase
        .from("admin_user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase
        .from("blocked_identifiers")
        .insert({
          identifier: params.identifier,
          identifier_type: params.type,
          reason: params.reason || null,
          blocked_by: user.id,
          expires_at: params.expiresAt,
          is_active: true,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error("This identifier is already blocked");
        }
        throw error;
      }

      // Send email notification (fire and forget)
      supabase.functions.invoke('send-security-block-notification', {
        body: {
          identifier: params.identifier,
          identifier_type: params.type,
          reason: params.reason || null,
          expires_at: params.expiresAt,
          blocked_by_name: adminProfile?.display_name || user.email || "Admin",
        },
      }).catch(err => console.error("Failed to send block notification:", err));

      // Audit log the block action
      await logAdminAction({
        actionType: AdminAuditActions.SECURITY_BLOCK_ADDED,
        targetType: "blocked_identifier",
        details: {
          identifier: params.identifier,
          identifier_type: params.type,
          reason: params.reason || null,
          expires_at: params.expiresAt,
        },
      });
    },
    onSuccess: () => {
      toast.success("Identifier blocked successfully");
      queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
      setBlockDialogOpen(false);
      resetBlockForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to block identifier");
    },
  });

  // Unblock identifier mutation
  const unblockMutation = useMutation({
    mutationFn: async (item: BlockedIdentifier) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get admin display name for notification
      const { data: adminProfile } = await supabase
        .from("admin_user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase
        .from("blocked_identifiers")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      // Send email notification (fire and forget)
      supabase.functions.invoke('send-security-block-notification', {
        body: {
          identifier: item.identifier,
          identifier_type: item.identifier_type,
          action: "unblock",
          unblocked_by_name: adminProfile?.display_name || user.email || "Admin",
        },
      }).catch(err => console.error("Failed to send unblock notification:", err));

      // Audit log the unblock action
      await logAdminAction({
        actionType: AdminAuditActions.SECURITY_BLOCK_REMOVED,
        targetType: "blocked_identifier",
        targetId: item.id,
        details: {
          identifier: item.identifier,
          identifier_type: item.identifier_type,
        },
      });
    },
    onSuccess: () => {
      toast.success("Identifier unblocked successfully");
      queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
      setUnblockConfirmOpen(false);
      setSelectedBlockedItem(null);
    },
    onError: () => {
      toast.error("Failed to unblock identifier");
    },
  });

  // Toggle block active status mutation
  const toggleBlockMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("blocked_identifiers")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "Block reactivated" : "Block deactivated");
      queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
    },
    onError: () => {
      toast.error("Failed to update block status");
    },
  });

  const resetBlockForm = () => {
    setBlockIdentifier("");
    setBlockType("email");
    setBlockReason("");
    setBlockExpiry("never");
  };

  const handleBlock = () => {
    if (!blockIdentifier.trim()) {
      toast.error("Please enter an identifier to block");
      return;
    }

    let expiresAt: string | null = null;
    const now = new Date();
    switch (blockExpiry) {
      case "1h":
        expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        break;
      case "24h":
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        break;
      case "7d":
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "30d":
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "never":
      default:
        expiresAt = null;
    }

    blockMutation.mutate({
      identifier: blockIdentifier.trim(),
      type: blockType,
      reason: blockReason.trim(),
      expiresAt,
    });
  };

  const openBlockDialog = (identifier?: string, type?: 'ip' | 'email') => {
    if (identifier) setBlockIdentifier(identifier);
    if (type) setBlockType(type);
    setBlockDialogOpen(true);
  };

  // Check if identifier is blocked
  const isIdentifierBlocked = (identifier: string): boolean => {
    if (!identifier || !blockedIdentifiers) return false;
    return blockedIdentifiers.some(
      (b) => b?.identifier === identifier && b?.is_active && (!b?.expires_at || new Date(b.expires_at) > new Date())
    ) || false;
  };

  // Safe data accessors
  const safeLogs = logs || [];
  const safeSuspiciousActivity = suspiciousActivity || [];
  const safeBlockedIdentifiers = blockedIdentifiers || [];

  // Look up IP location
  const lookupIpLocation = useCallback(async (ip: string): Promise<IpLocation | null> => {
    // Check cache first
    if (ipLocationCache.has(ip)) {
      return ipLocationCache.get(ip)!;
    }

    try {
      const { data, error } = await supabase.functions.invoke('lookup-ip-location', {
        body: { ip }
      });

      if (error) {
        console.error('IP lookup error:', error);
        return null;
      }

      const location = data as IpLocation;
      ipLocationCache.set(ip, location);
      return location;
    } catch (error) {
      console.error('IP lookup failed:', error);
      return null;
    }
  }, []);

  // Extract IP from identifier (email or IP)
  const extractIp = (identifier: string, metadata: Record<string, any> | null): string | null => {
    // Check if metadata contains IP
    if (metadata?.ip_address) return metadata.ip_address;
    if (metadata?.ip) return metadata.ip;
    
    // Check if identifier itself is an IP
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(identifier)) return identifier;
    
    return null;
  };

  // Detect identifier type
  const detectIdentifierType = (identifier: string): 'ip' | 'email' => {
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipPattern.test(identifier) ? 'ip' : 'email';
  };

  // Batch lookup locations for visible logs
  useEffect(() => {
    if (!logs || logs.length === 0) return;

    const logsToLookup = logs.slice(0, 50); // Limit to first 50 to avoid rate limiting
    const ipsToLookup: string[] = [];

    for (const log of logsToLookup) {
      const ip = extractIp(log.identifier, log.metadata);
      if (ip && !ipLocations.has(ip) && !loadingLocations.has(ip)) {
        ipsToLookup.push(ip);
      }
    }

    if (ipsToLookup.length === 0) return;

    // Mark as loading
    setLoadingLocations(prev => {
      const newSet = new Set(prev);
      ipsToLookup.forEach(ip => newSet.add(ip));
      return newSet;
    });

    // Lookup IPs with rate limiting (one every 100ms to stay under 45/min limit)
    const lookupQueue = async () => {
      for (const ip of ipsToLookup) {
        const location = await lookupIpLocation(ip);
        if (location) {
          setIpLocations(prev => {
            const newMap = new Map(prev);
            newMap.set(ip, location);
            return newMap;
          });
        }
        setLoadingLocations(prev => {
          const newSet = new Set(prev);
          newSet.delete(ip);
          return newSet;
        });
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    lookupQueue();
  }, [logs, lookupIpLocation]);

  // Lookup location for selected log
  useEffect(() => {
    if (!selectedLog) {
      setSelectedLogLocation(null);
      return;
    }

    const ip = extractIp(selectedLog.identifier, selectedLog.metadata);
    if (!ip) {
      setSelectedLogLocation(null);
      return;
    }

    // Check if we already have it
    if (ipLocations.has(ip)) {
      setSelectedLogLocation(ipLocations.get(ip)!);
      return;
    }

    // Lookup
    setLoadingSelectedLocation(true);
    lookupIpLocation(ip).then(location => {
      setSelectedLogLocation(location);
      if (location) {
        setIpLocations(prev => {
          const newMap = new Map(prev);
          newMap.set(ip, location);
          return newMap;
        });
      }
      setLoadingSelectedLocation(false);
    });
  }, [selectedLog, ipLocations, lookupIpLocation]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("security-logs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rate_limit_log" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["rate-limit-logs"] });
          queryClient.invalidateQueries({ queryKey: ["suspicious-activity"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blocked_identifiers" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Stats
  const stats = {
    totalLogs: logs?.length || 0,
    failedAttempts: logs?.filter((l) => l.success === false).length || 0,
    successfulLogins: logs?.filter((l) => l.success === true).length || 0,
    suspiciousCount: suspiciousActivity?.length || 0,
    blockedCount: blockedIdentifiers?.filter(b => b.is_active).length || 0,
  };

  // Filter logs by search
  const filteredLogs = logs?.filter((log) =>
    searchQuery
      ? log.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action_type.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  // Filter blocked identifiers by search
  const filteredBlocked = blockedIdentifiers?.filter((item) =>
    blockedSearchQuery
      ? item.identifier.toLowerCase().includes(blockedSearchQuery.toLowerCase()) ||
        (item.reason?.toLowerCase().includes(blockedSearchQuery.toLowerCase()))
      : true
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil((filteredLogs?.length || 0) / ITEMS_PER_PAGE));
  const paginatedLogs = filteredLogs?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalBlockedPages = Math.max(1, Math.ceil((filteredBlocked?.length || 0) / ITEMS_PER_PAGE));
  const paginatedBlocked = filteredBlocked?.slice(
    (blockedPage - 1) * ITEMS_PER_PAGE,
    blockedPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, successFilter, dateRange]);

  useEffect(() => {
    setBlockedPage(1);
  }, [blockedSearchQuery]);

  const exportLogs = () => {
    if (!filteredLogs) return;
    const csv = [
      ["Timestamp", "Identifier", "Action", "Success", "Location", "Metadata"].join(","),
      ...filteredLogs.map((log) => {
        const ip = extractIp(log.identifier, log.metadata);
        const location = ip ? ipLocations.get(ip) : null;
        const locationStr = location ? `${location.city}, ${location.country}` : "";
        return [
          log.created_at,
          `"${log.identifier}"`,
          log.action_type,
          log.success ? "Yes" : "No",
          `"${locationStr}"`,
          `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    refetchLogs();
    refetchSuspicious();
    refetchBlocked();
  };

  // Get location display for a log
  const getLocationDisplay = (log: RateLimitLog) => {
    const ip = extractIp(log.identifier, log.metadata);
    if (!ip) return null;

    const location = ipLocations.get(ip);
    const isLoading = loadingLocations.has(ip);

    if (isLoading) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs">Loading...</span>
        </div>
      );
    }

    if (!location) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  setLoadingLocations(prev => new Set(prev).add(ip));
                  const loc = await lookupIpLocation(ip);
                  if (loc) {
                    setIpLocations(prev => {
                      const newMap = new Map(prev);
                      newMap.set(ip, loc);
                      return newMap;
                    });
                  }
                  setLoadingLocations(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(ip);
                    return newSet;
                  });
                }}
              >
                <Globe className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Click to lookup location</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate max-w-[120px]">
                {location.city !== 'Unknown' ? `${location.city}, ${location.countryCode}` : location.country}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{location.city}, {location.regionName}</p>
              <p>{location.country}</p>
              {location.isp && <p className="text-xs text-muted-foreground">{location.isp}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Logs</h1>
          <p className="text-muted-foreground">
            Monitor login attempts and manage blocked identifiers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => openBlockDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Block IP/Email
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Total Logs
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stats.totalLogs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Failed Attempts
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums text-destructive">{stats.failedAttempts}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Successful Logins
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums text-success">{stats.successfulLogins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Suspicious Activity
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums text-warning">{stats.suspiciousCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5" />
              Blocked Identifiers
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums text-destructive">{stats.blockedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
          <TabsTrigger value="suspicious" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Suspicious Activity
            {stats.suspiciousCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {stats.suspiciousCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2">
            <Ban className="h-4 w-4" />
            Blocked List
            {stats.blockedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {stats.blockedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Login Activity Logs</CardTitle>
              <CardDescription>
                View and filter authentication events across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[150px]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {dateRange === "custom" && (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn(!customDateFrom && "text-muted-foreground")}>
                          {customDateFrom ? format(customDateFrom, "MMM d") : "From"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn(!customDateTo && "text-muted-foreground")}>
                          {customDateTo ? format(customDateTo, "MMM d") : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="provider_login">Provider Login</SelectItem>
                    <SelectItem value="admin_login">Admin Login</SelectItem>
                    <SelectItem value="password_reset">Password Reset</SelectItem>
                    <SelectItem value="login">General Login</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={successFilter} onValueChange={setSuccessFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Logs Table */}
              {logsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Identifier</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLogs?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No logs found for the selected filters
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedLogs?.map((log) => {
                            const blocked = isIdentifierBlocked(log.identifier);
                            return (
                              <TableRow key={log.id} className={blocked ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                                <TableCell className="whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm">
                                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm bg-muted px-1.5 py-0.5 rounded break-all">
                                      {log.identifier}
                                    </code>
                                    {blocked && (
                                      <Badge variant="destructive" className="text-xs">
                                        <Ban className="h-3 w-3 mr-1" />
                                        Blocked
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getLocationDisplay(log)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {log.action_type.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {log.success === true ? (
                                    <Badge className="bg-success/10 text-success hover:bg-success/10 border-transparent">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Success
                                    </Badge>
                                  ) : log.success === false ? (
                                    <Badge variant="destructive">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Failed
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Unknown</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedLog(log)}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>View Details</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {!blocked && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-destructive hover:text-destructive"
                                              onClick={() => openBlockDialog(log.identifier, detectIdentifierType(log.identifier))}
                                            >
                                              <Ban className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Block this identifier</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs?.length || 0)} of{" "}
                        {filteredLogs?.length || 0} logs
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspicious Activity Tab */}
        <TabsContent value="suspicious" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Suspicious Activity Monitor
              </CardTitle>
              <CardDescription>
                Identifiers with 3+ failed login attempts in the last hour are flagged as suspicious
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suspiciousLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : suspiciousActivity && suspiciousActivity.length > 0 ? (
                <div className="space-y-3">
                  {suspiciousActivity.map((activity, index) => {
                    const blocked = isIdentifierBlocked(activity.identifier);
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between rounded-lg p-4 border",
                          blocked
                            ? "bg-destructive/10 border-destructive/30"
                            : activity.failed_count >= 10
                            ? "bg-destructive/5 border-destructive/20"
                            : activity.failed_count >= 5
                            ? "bg-warning/10 border-warning/30"
                            : "bg-warning/5 border-warning/20"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2 rounded-full",
                            blocked
                              ? "bg-destructive/20"
                              : activity.failed_count >= 10
                              ? "bg-destructive/10"
                              : "bg-warning/10"
                          )}>
                            {blocked ? (
                              <Ban className="h-5 w-5 text-destructive" />
                            ) : (
                              <Shield className={cn(
                                "h-5 w-5",
                                activity.failed_count >= 10
                                  ? "text-destructive"
                                  : "text-warning"
                              )} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{activity.identifier}</p>
                              {blocked && (
                                <Badge variant="destructive" className="text-xs">Blocked</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {activity.action_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              First attempt: {format(new Date(activity.first_attempt), "HH:mm:ss")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge
                              variant={activity.failed_count >= 10 ? "destructive" : "secondary"}
                              className={cn(
                                "tabular-nums",
                                activity.failed_count >= 10 ? "" : "bg-warning/10 text-warning"
                              )}
                            >
                              {activity.failed_count} failed attempts
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-2">
                              Last: {formatDistanceToNow(new Date(activity.last_attempt), { addSuffix: true })}
                            </p>
                            {activity.failed_count >= 5 && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                <Ban className="h-3 w-3 mr-1" />
                                Rate Limited
                              </Badge>
                            )}
                          </div>
                          {!blocked && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => openBlockDialog(activity.identifier, detectIdentifierType(activity.identifier))}
                                  >
                                    <Ban className="h-4 w-4 mr-1" />
                                    Block
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Block this identifier</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No Suspicious Activity</h3>
                  <p className="text-muted-foreground mt-1">
                    No identifiers with 3+ failed attempts in the last hour
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked List Tab */}
        <TabsContent value="blocked" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-500" />
                    Blocked Identifiers
                  </CardTitle>
                  <CardDescription>
                    Manage blocked IP addresses and email addresses
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => openBlockDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Block
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search blocked identifiers..."
                  value={blockedSearchQuery}
                  onChange={(e) => setBlockedSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {blockedLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : paginatedBlocked && paginatedBlocked.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Identifier</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Blocked At</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedBlocked.map((item) => {
                          const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
                          const isActive = item.is_active && !isExpired;
                          return (
                            <TableRow key={item.id} className={!isActive ? "opacity-60" : ""}>
                              <TableCell>
                                <code className="text-sm bg-muted px-1.5 py-0.5 rounded break-all">
                                  {item.identifier}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {item.identifier_type === 'ip' ? (
                                    <Globe className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Activity className="h-3 w-3 mr-1" />
                                  )}
                                  {item.identifier_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {item.reason || "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm">{format(new Date(item.blocked_at), "MMM d, yyyy")}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(item.blocked_at), "HH:mm")}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.expires_at ? (
                                  <div>
                                    <p className="text-sm">{format(new Date(item.expires_at), "MMM d, yyyy")}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {isExpired ? "Expired" : formatDistanceToNow(new Date(item.expires_at), { addSuffix: true })}
                                    </p>
                                  </div>
                                ) : (
                                  <Badge variant="secondary">Never</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isActive ? (
                                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                    <ShieldOff className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : isExpired ? (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Expired
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Inactive
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleBlockMutation.mutate({ id: item.id, isActive: !item.is_active })}
                                        >
                                          {item.is_active ? (
                                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                          ) : (
                                            <ShieldOff className="h-4 w-4 text-red-600" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {item.is_active ? "Deactivate block" : "Reactivate block"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:text-destructive"
                                          onClick={() => {
                                            setSelectedBlockedItem(item);
                                            setUnblockConfirmOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Remove block</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalBlockedPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((blockedPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                        {Math.min(blockedPage * ITEMS_PER_PAGE, filteredBlocked?.length || 0)} of{" "}
                        {filteredBlocked?.length || 0} blocked identifiers
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBlockedPage((p) => Math.max(1, p - 1))}
                          disabled={blockedPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {blockedPage} of {totalBlockedPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBlockedPage((p) => Math.min(totalBlockedPages, p + 1))}
                          disabled={blockedPage === totalBlockedPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No Blocked Identifiers</h3>
                  <p className="text-muted-foreground mt-1">
                    No IP addresses or emails are currently blocked
                  </p>
                  <Button className="mt-4" onClick={() => openBlockDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Block
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              Full information about this security event
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-sm">{format(new Date(selectedLog.created_at), "PPpp")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {selectedLog.success === true ? (
                    <Badge className="bg-emerald-100 text-emerald-700">Success</Badge>
                  ) : selectedLog.success === false ? (
                    <Badge variant="destructive">Failed</Badge>
                  ) : (
                    <Badge variant="secondary">Unknown</Badge>
                  )}
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Identifier</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                      {selectedLog.identifier}
                    </code>
                    {!isIdentifierBlocked(selectedLog.identifier) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/50 hover:bg-destructive/10"
                        onClick={() => {
                          setSelectedLog(null);
                          openBlockDialog(selectedLog.identifier, detectIdentifierType(selectedLog.identifier));
                        }}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" />
                        Block
                      </Button>
                    )}
                    {isIdentifierBlocked(selectedLog.identifier) && (
                      <Badge variant="destructive">
                        <Ban className="h-3 w-3 mr-1" />
                        Blocked
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Action Type</p>
                  <p className="text-sm capitalize">{selectedLog.action_type.replace(/_/g, " ")}</p>
                </div>
                
                {/* Location Section */}
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Location</p>
                  {loadingSelectedLocation ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Looking up location...</span>
                    </div>
                  ) : selectedLogLocation ? (
                    <div className="bg-muted rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {selectedLogLocation.city}, {selectedLogLocation.regionName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedLogLocation.country}</span>
                      </div>
                      {selectedLogLocation.isp && (
                        <p className="text-xs text-muted-foreground">
                          ISP: {selectedLogLocation.isp}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No IP address available for location lookup
                    </p>
                  )}
                </div>

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Metadata</p>
                    <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-auto max-h-48">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              Block Identifier
            </DialogTitle>
            <DialogDescription>
              Block an IP address or email from accessing the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Identifier Type</Label>
              <Select value={blockType} onValueChange={(v) => setBlockType(v as 'ip' | 'email')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Address</SelectItem>
                  <SelectItem value="ip">IP Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {blockType === 'ip' ? 'IP Address' : 'Email Address'}
              </Label>
              <Input
                placeholder={blockType === 'ip' ? '192.168.1.1' : 'user@example.com'}
                value={blockIdentifier}
                onChange={(e) => setBlockIdentifier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Enter reason for blocking..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Block Duration</Label>
              <Select value={blockExpiry} onValueChange={setBlockExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="never">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBlock}
              disabled={blockMutation.isPending}
            >
              {blockMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation Dialog */}
      <AlertDialog open={unblockConfirmOpen} onOpenChange={setUnblockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the block on{" "}
              <span className="font-mono font-medium">{selectedBlockedItem?.identifier}</span>?
              This will allow the identifier to access the platform again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedBlockedItem && unblockMutation.mutate(selectedBlockedItem)}
            >
              {unblockMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remove Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
