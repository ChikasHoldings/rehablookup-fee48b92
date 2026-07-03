import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  MapPin,
  Globe,
  Loader2,
  Plus,
  Trash2,
  ShieldOff,
  ShieldCheck,
  AlertCircle,
  Link as LinkIcon,
  Check as CheckIcon,
  X,
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
import { isValidIp } from "@/lib/ipValidation";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";

interface RateLimitLog {
  id: string;
  identifier: string;
  action_type: string;
  success: boolean | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
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

// Cache for IP locations to avoid repeated lookups
const ipLocationCache = new Map<string, IpLocation>();

// Cap on rate_limit_log rows fetched in one go. Previously 1000 — at scale
// (auto-blocks + brute-force probes) the limit silently truncated stats.
// 10,000 covers ~5 months of current traffic; when hit, the UI surfaces a
// truncation banner so the admin can narrow the window.
const RATE_LIMIT_LOG_CAP = 10_000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const URL_TAB_VALUES = new Set(["activity", "suspicious", "blocked"]);
const URL_DATE_VALUES = new Set(["24h", "7d", "30d", "custom"]);
const URL_SUCCESS_VALUES = new Set(["all", "success", "failed"]);

// CSV cell-injection guard. Excel / Sheets evaluate leading =/+/-/@ as a
// formula; prepend a single quote on those values before quoting.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const needsQuote =
    /^[=+\-@\t\r]/.test(raw) ||
    raw.includes(",") ||
    raw.includes('"') ||
    raw.includes("\n") ||
    raw.includes("\r");
  const prefixed = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (!needsQuote) return prefixed;
  return `"${prefixed.replace(/"/g, '""')}"`;
}

function validateBlockIdentifier(
  identifier: string,
  type: "ip" | "email",
): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) return "Identifier cannot be empty";
  if (trimmed.length > 320) return "Identifier is too long (max 320 chars)";
  if (type === "email") {
    if (!EMAIL_REGEX.test(trimmed)) return "Not a valid email address";
  } else {
    // Shared strict validator — rejects out-of-range octets (999.1.1.1) and a
    // bare ":" that the previous permissive regexes let through.
    if (!isValidIp(trimmed)) {
      return "Not a valid IPv4 or IPv6 address";
    }
  }
  return null;
}

export default function AdminSecurityLogs() {
  const queryClient = useQueryClient();
  const { logError } = useAdminErrorHandler("AdminSecurityLogs");
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);
  const lookupAbortRef = useRef<AbortController | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [successFilter, setSuccessFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState("activity");
  const [selectedLog, setSelectedLog] = useState<RateLimitLog | null>(null);
  const [ipLocations, setIpLocations] = useState<Map<string, IpLocation>>(new Map());
  const [loadingLocations, setLoadingLocations] = useState<Set<string>>(new Set());
  const [selectedLogLocation, setSelectedLogLocation] = useState<IpLocation | null>(null);
  const [loadingSelectedLocation, setLoadingSelectedLocation] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockIdentifier, setBlockIdentifier] = useState("");
  const [blockType, setBlockType] = useState<'ip' | 'email'>('email');
  const [blockReason, setBlockReason] = useState("");
  const [blockExpiry, setBlockExpiry] = useState<string>("never");
  const [unblockConfirmOpen, setUnblockConfirmOpen] = useState(false);
  const [selectedBlockedItem, setSelectedBlockedItem] = useState<BlockedIdentifier | null>(null);
  const [blockedSearchQuery, setBlockedSearchQuery] = useState("");

  // URL state hydration (once)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const q = searchParams.get("q");
    const tab = searchParams.get("tab");
    const date = searchParams.get("date");
    const action = searchParams.get("action");
    const successUrl = searchParams.get("success");

    if (q) setSearchQuery(q);
    if (tab && URL_TAB_VALUES.has(tab)) setActiveTab(tab);
    if (date && URL_DATE_VALUES.has(date)) setDateRange(date);
    if (action) setActionFilter(action);
    if (successUrl && URL_SUCCESS_VALUES.has(successUrl)) setSuccessFilter(successUrl);
  }, [searchParams]);

  // Loop-guarded URL sync (defaults are not written so the bare URL stays clean)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete("q", searchQuery, "");
    setOrDelete("tab", activeTab, "activity");
    setOrDelete("date", dateRange, "7d");
    setOrDelete("action", actionFilter, "all");
    setOrDelete("success", successFilter, "all");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [searchQuery, activeTab, dateRange, actionFilter, successFilter, searchParams, setSearchParams]);

  // Abort any in-flight IP lookups when the component unmounts so we don't
  // leak fetches or update state on a dead tree.
  useEffect(() => {
    return () => {
      lookupAbortRef.current?.abort();
    };
  }, []);

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
  const {
    data: logs,
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch: refetchLogs,
    error: logsError,
  } = useQuery({
    queryKey: ["rate-limit-logs", actionFilter, successFilter, dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("rate_limit_log")
        .select("id, identifier, action_type, success, created_at, metadata")
        .gte("created_at", dateFrom.toISOString())
        .lte("created_at", dateTo.toISOString())
        .order("created_at", { ascending: false })
        .limit(RATE_LIMIT_LOG_CAP);

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
    staleTime: 10_000,
  });

  // Distinct action_types observed in the current window — feeds the
  // Action filter dropdown so it reflects what's actually emitted by the
  // codebase, not a stale hard-coded list. We re-query whenever the date
  // range changes; this is cheap because the GROUP BY collapses on the
  // server side.
  const { data: observedActionTypes } = useQuery({
    queryKey: ["security-action-types", dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_limit_log")
        .select("action_type")
        .gte("created_at", dateFrom.toISOString())
        .lte("created_at", dateTo.toISOString())
        .limit(RATE_LIMIT_LOG_CAP);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of data || []) {
        if (row.action_type) set.add(row.action_type);
      }
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });

  // Whether the result was truncated — if so the UI surfaces an amber
  // banner so the admin knows to narrow the window or filter further.
  const logsTruncated = (logs?.length ?? 0) >= RATE_LIMIT_LOG_CAP;

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

  // Block identifier mutation. Hardening notes:
  //   - admin profile lookup uses .maybeSingle() so a missing profile row
  //     doesn't crash the whole block operation
  //   - notification email is awaited but its failure does NOT roll back
  //     the block (the block is the primary action; we just warn)
  //   - audit log write is awaited; logAdminAction internally swallows
  //     errors but at least we don't race ahead of it
  const blockMutation = useMutation({
    mutationFn: async (params: {
      identifier: string;
      type: 'ip' | 'email';
      reason: string;
      expiresAt: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: adminProfile } = await supabase
        .from("admin_user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

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
        throw new Error(`Block failed: ${error.message}`);
      }

      const { error: emailErr } = await supabase.functions.invoke(
        'send-security-block-notification',
        {
          body: {
            identifier: params.identifier,
            identifier_type: params.type,
            reason: params.reason || null,
            expires_at: params.expiresAt,
            blocked_by_name: adminProfile?.display_name || user.email || "Admin",
          },
        },
      );
      if (emailErr) {
        console.warn("[block] notification email failed:", emailErr);
      }

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

      return { emailSent: !emailErr };
    },
    onSuccess: (result) => {
      toast.success(
        result.emailSent
          ? "Identifier blocked successfully"
          : "Identifier blocked — notification email failed (see console)",
      );
      queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
      setBlockDialogOpen(false);
      resetBlockForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to block identifier");
    },
  });

  // Unblock identifier mutation. Same hardening as block.
  const unblockMutation = useMutation({
    mutationFn: async (item: BlockedIdentifier) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: adminProfile } = await supabase
        .from("admin_user_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error } = await supabase
        .from("blocked_identifiers")
        .delete()
        .eq("id", item.id);

      if (error) throw new Error(`Unblock failed: ${error.message}`);

      const { error: emailErr } = await supabase.functions.invoke(
        'send-security-block-notification',
        {
          body: {
            identifier: item.identifier,
            identifier_type: item.identifier_type,
            action: "unblock",
            unblocked_by_name: adminProfile?.display_name || user.email || "Admin",
          },
        },
      );
      if (emailErr) {
        console.warn("[unblock] notification email failed:", emailErr);
      }

      await logAdminAction({
        actionType: AdminAuditActions.SECURITY_BLOCK_REMOVED,
        targetType: "blocked_identifier",
        targetId: item.id,
        details: {
          identifier: item.identifier,
          identifier_type: item.identifier_type,
        },
      });

      return { emailSent: !emailErr };
    },
    onSuccess: (result) => {
      toast.success(
        result.emailSent
          ? "Identifier unblocked successfully"
          : "Identifier unblocked — notification email failed (see console)",
      );
      queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
      setUnblockConfirmOpen(false);
      setSelectedBlockedItem(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unblock identifier");
    },
  });

  // Toggle block active status mutation — error message now surfaces the
  // underlying DB / RLS failure rather than a generic string.
  const toggleBlockMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // 0-row detection: a bare update().eq() reports success even when RLS
      // changes no rows, so a no-op toggle would show a false success.
      const { data: updated, error } = await supabase
        .from("blocked_identifiers")
        .update({ is_active: isActive })
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (error) throw new Error(`Toggle failed: ${error.message}`);
      if (!updated) throw new Error("Block not found or the update was blocked.");
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "Block reactivated" : "Block deactivated");
      queryClient.invalidateQueries({ queryKey: ["blocked-identifiers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update block status");
    },
  });

  const resetBlockForm = () => {
    setBlockIdentifier("");
    setBlockType("email");
    setBlockReason("");
    setBlockExpiry("never");
  };

  const blockValidationError = useMemo(
    () =>
      blockIdentifier.trim().length === 0
        ? null
        : validateBlockIdentifier(blockIdentifier, blockType),
    [blockIdentifier, blockType],
  );

  const handleBlock = () => {
    const trimmed = blockIdentifier.trim();
    const err = validateBlockIdentifier(trimmed, blockType);
    if (err) {
      toast.error(err);
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
      identifier: trimmed,
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

  // Memoize the set of currently-active blocked identifiers. The old
  // function iterated blockedIdentifiers for every row on every render,
  // which scaled O(n*m). This is O(1) lookup per row.
  const activeBlockedSet = useMemo(() => {
    const set = new Set<string>();
    const now = Date.now();
    for (const b of blockedIdentifiers || []) {
      if (!b?.identifier || !b?.is_active) continue;
      if (b.expires_at && new Date(b.expires_at).getTime() <= now) continue;
      set.add(b.identifier);
    }
    return set;
  }, [blockedIdentifiers]);

  const isIdentifierBlocked = useCallback(
    (identifier: string): boolean =>
      !!identifier && activeBlockedSet.has(identifier),
    [activeBlockedSet],
  );

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
  const extractIp = (identifier: string, metadata: Record<string, unknown> | null): string | null => {
    // Check if metadata contains IP
    if (metadata?.ip_address) return metadata.ip_address as string;
    if (metadata?.ip) return metadata.ip as string;
    
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

  // Batch lookup locations for visible logs. Aborts on unmount or when
  // the logs list changes mid-flight so we don't leak fetches or update
  // state on a dead tree.
  useEffect(() => {
    if (!logs || logs.length === 0) return;

    const logsToLookup = logs.slice(0, 50); // first 50 only (45/min ip-api cap)
    const ipsToLookup: string[] = [];

    for (const log of logsToLookup) {
      const ip = extractIp(log.identifier, log.metadata);
      if (ip && !ipLocations.has(ip) && !loadingLocations.has(ip)) {
        ipsToLookup.push(ip);
      }
    }

    if (ipsToLookup.length === 0) return;

    // Abort any previous in-flight queue and start fresh.
    lookupAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;
    const signal = controller.signal;

    setLoadingLocations((prev) => {
      const newSet = new Set(prev);
      ipsToLookup.forEach((ip) => newSet.add(ip));
      return newSet;
    });

    const lookupQueue = async () => {
      for (const ip of ipsToLookup) {
        if (signal.aborted) return;
        const location = await lookupIpLocation(ip);
        if (signal.aborted) return;
        if (location) {
          setIpLocations((prev) => {
            const newMap = new Map(prev);
            newMap.set(ip, location);
            return newMap;
          });
        }
        setLoadingLocations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(ip);
          return newSet;
        });
        // 100ms between requests stays under the 45/min ip-api cap with
        // headroom for the on-demand lookups (Globe icon click).
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    };

    lookupQueue();

    return () => {
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ipLocations and loadingLocations are read as guards but must not be deps (would cause infinite re-runs)
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
      .channel(`security-logs-realtime-${Math.random().toString(36).slice(2,8)}`)
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
  const { page: currentPage, pageSize: logsPageSize, totalPages, setPage: setCurrentPage, setPageSize: setLogsPageSize } = usePagination({
    tableId: "admin-security-logs",
    defaultPageSize: 25,
    totalItems: filteredLogs?.length ?? 0,
  });
  const paginatedLogs = filteredLogs?.slice(
    (currentPage - 1) * logsPageSize,
    currentPage * logsPageSize
  );

  const { page: blockedPage, pageSize: blockedPageSize, totalPages: totalBlockedPages, setPage: setBlockedPage, setPageSize: setBlockedPageSize } = usePagination({
    tableId: "admin-security-blocked",
    defaultPageSize: 25,
    totalItems: filteredBlocked?.length ?? 0,
  });
  const paginatedBlocked = filteredBlocked?.slice(
    (blockedPage - 1) * blockedPageSize,
    blockedPage * blockedPageSize
  );

  // Reset page when filters change — setCurrentPage/setBlockedPage are stable useState setters
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, successFilter, dateRange, setCurrentPage]);

  useEffect(() => {
    setBlockedPage(1);
  }, [blockedSearchQuery, setBlockedPage]);

  const exportLogs = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error("No logs in current view to export");
      return;
    }
    const header = ["Timestamp", "Identifier", "Action", "Success", "Location", "Metadata"]
      .map(csvCell)
      .join(",");
    const rows = filteredLogs.map((log) => {
      const ip = extractIp(log.identifier, log.metadata);
      const location = ip ? ipLocations.get(ip) : null;
      const locationStr = location ? `${location.city}, ${location.country}` : "";
      return [
        log.created_at,
        log.identifier,
        log.action_type,
        log.success === true ? "Yes" : log.success === false ? "No" : "Unknown",
        locationStr,
        JSON.stringify(log.metadata || {}),
      ]
        .map(csvCell)
        .join(",");
    });
    const csv = [header, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} log${filteredLogs.length === 1 ? "" : "s"}`);
  };

  const handleRefresh = () => {
    refetchLogs();
    refetchSuspicious();
    refetchBlocked();
    toast.success("Security data refreshing");
  };

  const filtersActive =
    searchQuery !== "" ||
    actionFilter !== "all" ||
    successFilter !== "all" ||
    dateRange !== "7d" ||
    activeTab !== "activity";

  const handleClearFilters = useCallback(() => {
    setSearchQuery("");
    setActionFilter("all");
    setSuccessFilter("all");
    setDateRange("7d");
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
    setActiveTab("activity");
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      toast.success("Filtered view link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error(`Failed to copy link: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }, []);

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

  const anyQueryError = !!logsError || !!suspiciousError || !!blockedError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Security Logs</h1>
          <p className="text-muted-foreground">
            Monitor login attempts and manage blocked identifiers
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            aria-label="Copy link to filtered view"
            disabled={!filtersActive}
            title={filtersActive ? "Copy filtered view URL" : "Apply a filter first"}
          >
            {copiedLink ? (
              <CheckIcon className="h-4 w-4 mr-2 text-success" />
            ) : (
              <LinkIcon className="h-4 w-4 mr-2" />
            )}
            Copy link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            aria-label="Refresh security data"
            disabled={logsFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", logsFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportLogs}
            aria-label="Export current logs to CSV"
            disabled={logsLoading || (filteredLogs?.length ?? 0) === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => openBlockDialog()}
            aria-label="Open block identifier dialog"
          >
            <Plus className="h-4 w-4 mr-2" />
            Block IP/Email
          </Button>
        </div>
      </div>

      {/* Truncation banner — fires when the cap was hit so the admin
          knows to narrow the window. Same pattern as AdminAnalytics. */}
      {logsTruncated && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-warning/40 bg-warning/5 p-3 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-warning">
              Showing the first {RATE_LIMIT_LOG_CAP.toLocaleString()} log entries
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The query hit the row cap. Narrow the date range or apply a
              filter to see a complete window — stats above reflect only the
              capped slice.
            </p>
          </div>
        </div>
      )}

      {/* Query-error banner. Surfaces underlying errors with a Retry. */}
      {anyQueryError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">
              Failed to load security data
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">
              {(logsError || suspiciousError || blockedError) instanceof Error
                ? (logsError || suspiciousError || blockedError)!.message
                : String(logsError || suspiciousError || blockedError)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {filtersActive && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            aria-label="Clear all filters"
            className="h-7 -ml-2"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Clear filters
          </Button>
          {logsFetching && !logsLoading && (
            <span aria-live="polite" className="text-muted-foreground">
              Refreshing…
            </span>
          )}
        </div>
      )}

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
                  <SelectTrigger className="w-[200px]" aria-label="Filter by action type">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {(observedActionTypes ?? []).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                    {/* If the current filter doesn't appear in the observed
                        list (e.g. user landed via a URL deep-link before
                        new data arrived), still keep it selectable so the
                        Select component doesn't reset to "all". */}
                    {actionFilter !== "all" &&
                      !(observedActionTypes ?? []).includes(actionFilter) && (
                        <SelectItem value={actionFilter}>
                          {actionFilter.replace(/_/g, " ")} (no matches in window)
                        </SelectItem>
                      )}
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
                              <TableRow key={log.id} className={blocked ? "bg-destructive/5" : ""}>
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
                  <PaginationFooter
                    page={currentPage}
                    pageSize={logsPageSize}
                    totalPages={totalPages}
                    totalItems={filteredLogs?.length ?? 0}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setLogsPageSize}
                    itemLabel="log"
                  />
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
                        key={activity.identifier ?? index}
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
                    <Ban className="h-5 w-5 text-destructive" />
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
                                  <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-transparent">
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
                                            <ShieldCheck className="h-4 w-4 text-success" />
                                          ) : (
                                            <ShieldOff className="h-4 w-4 text-destructive" />
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
                  <PaginationFooter
                    page={blockedPage}
                    pageSize={blockedPageSize}
                    totalPages={totalBlockedPages}
                    totalItems={filteredBlocked?.length ?? 0}
                    onPageChange={setBlockedPage}
                    onPageSizeChange={setBlockedPageSize}
                    itemLabel="blocked identifier"
                  />
                </>
              ) : (
                <div className="text-center py-12">
                  <ShieldCheck className="h-12 w-12 text-success mx-auto mb-4" />
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
                    <Badge className="bg-success/10 text-success border-transparent">Success</Badge>
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

      {/* Block Dialog — never dismisses while the mutation is pending */}
      <Dialog
        open={blockDialogOpen}
        onOpenChange={(open) => {
          if (blockMutation.isPending) return;
          setBlockDialogOpen(open);
          if (!open) resetBlockForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
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
              <Label htmlFor="block-identifier">
                {blockType === 'ip' ? 'IP Address' : 'Email Address'}
              </Label>
              <Input
                id="block-identifier"
                placeholder={blockType === 'ip' ? '192.168.1.1' : 'user@example.com'}
                value={blockIdentifier}
                onChange={(e) => setBlockIdentifier(e.target.value.slice(0, 320))}
                aria-invalid={!!blockValidationError}
                disabled={blockMutation.isPending}
                maxLength={320}
              />
              {blockValidationError && (
                <p className="text-[11px] text-destructive">
                  {blockValidationError}
                </p>
              )}
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
              disabled={
                blockMutation.isPending ||
                !blockIdentifier.trim() ||
                !!blockValidationError
              }
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
