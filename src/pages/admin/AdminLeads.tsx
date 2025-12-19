import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Building2,
  Clock,
  Zap,
  TrendingUp,
  MoreHorizontal,
  Eye,
  Bot,
  UserCheck,
  XCircle,
  CalendarIcon,
  PieChart,
  ShieldX,
  Ban,
  Copy,
  ShieldAlert,
  FileWarning,
  ShieldCheck,
  Send,
  Lock,
  Share2,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { calculateLeadScore, getScoreColor, type LeadScoringInput } from "@/lib/leadScoring";
import { LeadProfileModal } from "@/components/leads/LeadProfileModal";
import { RoutingLogsTable } from "@/components/admin/RoutingLogsTable";
import { LeadOverrideDialog } from "@/components/admin/LeadOverrideDialog";
import { cn } from "@/lib/utils";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";

// Source label mapping
const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  request_help: "Request Help",
  provider_profile_direct: "Provider Profile",
  request_info_modal: "Request Info Modal",
  social_landing: "Social Ads",
  ads_landing: "Google Ads",
  organic: "Organic",
  referral: "Referral",
};

const SOURCE_COLORS = [
  "hsl(221, 83%, 53%)", // blue
  "hsl(142, 71%, 45%)", // green
  "hsl(262, 83%, 58%)", // purple
  "hsl(24, 95%, 53%)",  // orange
  "hsl(340, 82%, 52%)", // pink
  "hsl(47, 96%, 53%)",  // yellow
  "hsl(174, 72%, 46%)", // teal
  "hsl(0, 72%, 51%)",   // red
];

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

const DATE_PRESETS = [
  { label: "All Time", value: "all", getRange: () => ({ from: undefined, to: undefined }) },
  { label: "Today", value: "today", getRange: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 Days", value: "7days", getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 14 Days", value: "14days", getRange: () => ({ from: subDays(new Date(), 14), to: new Date() }) },
  { label: "Last 30 Days", value: "30days", getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This Month", value: "thisMonth", getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", value: "lastMonth", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Custom", value: "custom", getRange: () => ({ from: undefined, to: undefined }) },
];

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferred_contact: string;
  location_city_state: string | null;
  location_zip: string | null;
  level_of_care: string | null;
  urgency: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  who_seeking_help: string | null;
  primary_substance: string[] | null;
  dual_diagnosis: string | null;
  message: string | null;
  email_verified: boolean | null;
  status: string;
  source: string | null;
  created_at: string;
  facility_id: string | null;
  snooze_until: string | null;
  budget_preference: string | null;
  qualified: boolean | null;
  qualification_reason: string | null;
  assignment_status: string | null;
  assignment_reason: string | null;
  assigned_at: string | null;
  validation_status: string | null;
  quality_flag: string | null;
  exclusivity: string | null;
  shared_with: string[] | null;
};

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
};

const ITEMS_PER_PAGE = 20;

// Lead Score Badge Component
function LeadScoreBadge({ lead }: { lead: Lead }) {
  const scoringInput: LeadScoringInput = {
    insurance_type: lead.insurance_type,
    urgency: lead.urgency,
    level_of_care: lead.level_of_care,
    email_verified: lead.email_verified,
    preferred_contact: lead.preferred_contact,
    message: lead.message,
    who_seeking_help: lead.who_seeking_help,
    dual_diagnosis: lead.dual_diagnosis,
    primary_substance: lead.primary_substance,
  };

  const score = useMemo(() => calculateLeadScore(scoringInput), [lead]);
  const colors = getScoreColor(score.grade);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}>
            <span>{score.grade}</span>
            <span className="opacity-75">{score.total}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Lead Score Breakdown</p>
            <div className="space-y-1 text-xs">
              {score.factors.map((factor) => (
                <div key={factor.label} className="flex justify-between">
                  <span className="text-muted-foreground">{factor.label}</span>
                  <span className="font-medium">+{factor.points}/{factor.maxPoints}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-sm">
              <span>Total</span>
              <span>{score.total}/100</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    new: { label: "New", className: "bg-blue-50 text-blue-700 border-blue-200" },
    contacted: { label: "Contacted", className: "bg-purple-50 text-purple-700 border-purple-200" },
    qualified: { label: "Qualified", className: "bg-green-50 text-green-700 border-green-200" },
    converted: { label: "Converted", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    lost: { label: "Lost", className: "bg-slate-50 text-slate-600 border-slate-200" },
  };

  const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// Assignment Status Badge Component
function AssignmentStatusBadge({ lead }: { lead: Lead }) {
  const status = lead.assignment_status || (lead.facility_id ? "assigned" : "pending");
  
  const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    assigned: { 
      label: "Assigned", 
      icon: <UserCheck className="h-3 w-3" />, 
      className: "bg-green-50 text-green-700 border-green-200" 
    },
    pending: { 
      label: "Pending", 
      icon: <Clock className="h-3 w-3" />, 
      className: "bg-amber-50 text-amber-700 border-amber-200" 
    },
    unassigned_no_capacity: { 
      label: "No Capacity", 
      icon: <XCircle className="h-3 w-3" />, 
      className: "bg-red-50 text-red-700 border-red-200" 
    },
    unassigned_no_match: { 
      label: "No Match", 
      icon: <AlertCircle className="h-3 w-3" />, 
      className: "bg-slate-50 text-slate-600 border-slate-200" 
    },
    unassigned_not_qualified: { 
      label: "Not Qualified", 
      icon: <XCircle className="h-3 w-3" />, 
      className: "bg-slate-50 text-slate-600 border-slate-200" 
    },
    unqualified_not_routed: { 
      label: "Blocked", 
      icon: <Ban className="h-3 w-3" />, 
      className: "bg-red-50 text-red-700 border-red-200" 
    },
  };

  const { label, icon, className } = config[status] || config.pending;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${className}`}>
            {icon}
            {label}
          </Badge>
        </TooltipTrigger>
        {lead.assignment_reason && (
          <TooltipContent>
            <p className="max-w-xs">{lead.assignment_reason}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

// Exclusivity Badge Component
function ExclusivityBadge({ lead, facilitiesMap }: { lead: Lead; facilitiesMap: Map<string, Facility> }) {
  const isExclusive = lead.exclusivity === "exclusive";
  const sharedCount = lead.shared_with?.length || 0;
  const totalRecipients = (lead.facility_id ? 1 : 0) + sharedCount;
  
  // If not assigned, show nothing
  if (!lead.facility_id && sharedCount === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  // Get all provider names for tooltip
  const providerNames: string[] = [];
  if (lead.facility_id) {
    const primary = facilitiesMap.get(lead.facility_id);
    if (primary) providerNames.push(primary.name);
  }
  if (lead.shared_with) {
    lead.shared_with.forEach(id => {
      const facility = facilitiesMap.get(id);
      if (facility) providerNames.push(facility.name);
    });
  }

  if (isExclusive) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
              <Lock className="h-3 w-3" />
              Exclusive
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Exclusive Lead</p>
            <p className="text-xs text-muted-foreground">
              Only sent to: {providerNames[0] || "1 provider"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
            <Share2 className="h-3 w-3" />
            Shared ({totalRecipients})
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Shared Lead</p>
          <p className="text-xs text-muted-foreground mb-1">
            Sent to {totalRecipients} provider{totalRecipients !== 1 ? "s" : ""}:
          </p>
          <ul className="text-xs space-y-0.5">
            {providerNames.map((name, i) => (
              <li key={i}>• {name}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Block Reason Badge Component
function BlockReasonBadge({ lead }: { lead: Lead }) {
  const reasons: { icon: React.ReactNode; label: string; className: string }[] = [];

  // Check validation status
  if (lead.validation_status === "invalid_contact") {
    reasons.push({
      icon: <ShieldX className="h-3 w-3" />,
      label: "Invalid Contact",
      className: "bg-red-50 text-red-700 border-red-200",
    });
  }

  // Check quality flag
  if (lead.quality_flag === "spam") {
    reasons.push({
      icon: <ShieldAlert className="h-3 w-3" />,
      label: "Spam Detected",
      className: "bg-orange-50 text-orange-700 border-orange-200",
    });
  } else if (lead.quality_flag === "bot") {
    reasons.push({
      icon: <Bot className="h-3 w-3" />,
      label: "Bot Detected",
      className: "bg-purple-50 text-purple-700 border-purple-200",
    });
  } else if (lead.quality_flag === "duplicate") {
    reasons.push({
      icon: <Copy className="h-3 w-3" />,
      label: "Duplicate",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    });
  }

  // Parse qualification_reason for more detail
  if (lead.qualification_reason) {
    const reason = lead.qualification_reason.toLowerCase();
    if (reason.includes("invalid phone") && !reasons.some(r => r.label === "Invalid Contact")) {
      reasons.push({
        icon: <Phone className="h-3 w-3" />,
        label: "Invalid Phone",
        className: "bg-red-50 text-red-700 border-red-200",
      });
    }
    if (reason.includes("invalid email") && !reasons.some(r => r.label === "Invalid Contact")) {
      reasons.push({
        icon: <Mail className="h-3 w-3" />,
        label: "Invalid Email",
        className: "bg-red-50 text-red-700 border-red-200",
      });
    }
    if (reason.includes("duplicate") && !reasons.some(r => r.label === "Duplicate")) {
      reasons.push({
        icon: <Copy className="h-3 w-3" />,
        label: "Duplicate",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      });
    }
    if (reason.includes("location") || reason.includes("service area")) {
      reasons.push({
        icon: <MapPin className="h-3 w-3" />,
        label: "Location Mismatch",
        className: "bg-slate-50 text-slate-600 border-slate-200",
      });
    }
  }

  // Fallback if no specific reason found
  if (reasons.length === 0 && !lead.qualified) {
    reasons.push({
      icon: <FileWarning className="h-3 w-3" />,
      label: "Failed Validation",
      className: "bg-slate-50 text-slate-600 border-slate-200",
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {reasons.map((reason, index) => (
        <Badge key={index} variant="outline" className={`gap-1 text-xs ${reason.className}`}>
          {reason.icon}
          {reason.label}
        </Badge>
      ))}
    </div>
  );
}

// Urgency Indicator
function UrgencyIndicator({ urgency }: { urgency: string | null }) {
  if (!urgency) return null;

  const config: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
    immediate: { icon: <Zap className="h-3 w-3" />, className: "text-red-500", label: "Immediate" },
    "within-week": { icon: <Clock className="h-3 w-3" />, className: "text-amber-500", label: "This Week" },
    "within-month": { icon: <Calendar className="h-3 w-3" />, className: "text-blue-500", label: "This Month" },
    researching: { icon: <Search className="h-3 w-3" />, className: "text-slate-500", label: "Researching" },
  };

  const { icon, className, label } = config[urgency] || { icon: null, className: "", label: urgency };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Urgency: {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AdminLeads() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { logError, logInfo } = useAdminErrorHandler("AdminLeads");
  const [activeTab, setActiveTab] = useState<"all" | "blocked">(
    searchParams.get("blocked") === "true" ? "blocked" : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState(
    searchParams.get("unassigned") === "true" ? "unassigned" : "all"
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [qualifiedFilter, setQualifiedFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [blockReasonFilter, setBlockReasonFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle date preset changes
  const handleDatePresetChange = (value: string) => {
    setDatePreset(value);
    if (value !== "custom") {
      const preset = DATE_PRESETS.find(p => p.value === value);
      if (preset) {
        setDateRange(preset.getRange());
      }
    }
    setCurrentPage(1);
  };

  // Invalidate leads queries helper
  const invalidateLeadsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-count"] });
  }, [queryClient]);

  // Real-time subscriptions for leads
  useEffect(() => {
    const leadsChannel = supabase
      .channel("admin-leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          invalidateLeadsQueries();
          const newLead = payload.new as Lead;
          toast.success("New lead received", {
            description: `${newLead.name} - ${newLead.assignment_status === "assigned" ? "Auto-assigned" : "Pending assignment"}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        () => {
          invalidateLeadsQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateLeadsQueries]);

  // Fetch total count for pagination (qualified leads for "all" tab)
  const { data: totalCount } = useQuery({
    queryKey: ["admin-leads-count", activeTab, assignmentFilter, statusFilter, urgencyFilter, qualifiedFilter, blockReasonFilter, searchQuery, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      try {
        let query = supabase
          .from("leads")
          .select("id", { count: "exact", head: true });

        // Tab-based filtering
        if (activeTab === "blocked") {
          // Show only unqualified/blocked leads
          query = query.or("qualified.eq.false,assignment_status.eq.unqualified_not_routed");
          
          // Block reason filter
          if (blockReasonFilter !== "all") {
            if (blockReasonFilter === "invalid_contact") {
              query = query.eq("validation_status", "invalid_contact");
            } else if (blockReasonFilter === "spam") {
              query = query.eq("quality_flag", "spam");
            } else if (blockReasonFilter === "bot") {
              query = query.eq("quality_flag", "bot");
            } else if (blockReasonFilter === "duplicate") {
              query = query.eq("quality_flag", "duplicate");
            }
          }
        } else {
          // All tab - apply regular filters
          if (assignmentFilter === "unassigned") {
            query = query.is("facility_id", null);
          } else if (assignmentFilter === "assigned") {
            query = query.not("facility_id", "is", null);
          }

          if (qualifiedFilter !== "all") {
            query = query.eq("qualified", qualifiedFilter === "qualified");
          }
        }

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        if (urgencyFilter !== "all") {
          query = query.eq("urgency", urgencyFilter);
        }

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
        }

        // Date range filter
        if (dateRange.from) {
          query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
        }
        if (dateRange.to) {
          query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      } catch (error) {
        logError("fetch_leads_count", error, { activeTab, assignmentFilter, statusFilter });
        throw error;
      }
    },
  });

  // Fetch blocked leads count for tab badge
  const { data: blockedCount } = useQuery({
    queryKey: ["admin-blocked-leads-count", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      try {
        let query = supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .or("qualified.eq.false,assignment_status.eq.unqualified_not_routed");

        // Date range filter
        if (dateRange.from) {
          query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
        }
        if (dateRange.to) {
          query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      } catch (error) {
        logError("fetch_blocked_leads_count", error);
        throw error;
      }
    },
  });

  // Fetch leads with pagination
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads", activeTab, assignmentFilter, statusFilter, urgencyFilter, qualifiedFilter, blockReasonFilter, searchQuery, currentPage, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      try {
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to);

        // Tab-based filtering
        if (activeTab === "blocked") {
          // Show only unqualified/blocked leads
          query = query.or("qualified.eq.false,assignment_status.eq.unqualified_not_routed");
          
          // Block reason filter
          if (blockReasonFilter !== "all") {
            if (blockReasonFilter === "invalid_contact") {
              query = query.eq("validation_status", "invalid_contact");
            } else if (blockReasonFilter === "spam") {
              query = query.eq("quality_flag", "spam");
            } else if (blockReasonFilter === "bot") {
              query = query.eq("quality_flag", "bot");
            } else if (blockReasonFilter === "duplicate") {
              query = query.eq("quality_flag", "duplicate");
            }
          }
        } else {
          // All tab - apply regular filters
          if (assignmentFilter === "unassigned") {
            query = query.is("facility_id", null);
          } else if (assignmentFilter === "assigned") {
            query = query.not("facility_id", "is", null);
          }

          if (qualifiedFilter !== "all") {
            query = query.eq("qualified", qualifiedFilter === "qualified");
          }
        }

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        if (urgencyFilter !== "all") {
          query = query.eq("urgency", urgencyFilter);
        }

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
        }

        // Date range filter
        if (dateRange.from) {
          query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
        }
        if (dateRange.to) {
          query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Lead[];
      } catch (error) {
        logError("fetch_leads", error, { activeTab, assignmentFilter, statusFilter, currentPage });
        throw error;
      }
    },
  });

  // Filter leads by score grade on client side
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (scoreFilter === "all") return leads;
    
    return leads.filter((lead) => {
      if (!lead) return false;
      const scoringInput: LeadScoringInput = {
        insurance_type: lead.insurance_type,
        urgency: lead.urgency,
        level_of_care: lead.level_of_care,
        email_verified: lead.email_verified,
        preferred_contact: lead.preferred_contact,
        message: lead.message,
        who_seeking_help: lead.who_seeking_help,
        dual_diagnosis: lead.dual_diagnosis,
        primary_substance: lead.primary_substance,
      };
      const score = calculateLeadScore(scoringInput);
      return score.grade === scoreFilter;
    });
  }, [leads, scoreFilter]);

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Fetch facilities for display (read-only)
  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities-lookup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .eq("status", "approved");
      return data as Facility[];
    },
  });

  // Fetch lead source breakdown (all leads, respects date filter)
  const { data: sourceBreakdown } = useQuery({
    queryKey: ["admin-leads-source-breakdown", dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("source");

      // Date range filter
      if (dateRange.from) {
        query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
      }
      if (dateRange.to) {
        query = query.lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59.999Z");
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count by source
      const counts: Record<string, number> = {};
      (data || []).forEach((lead) => {
        const source = lead.source || "direct";
        counts[source] = (counts[source] || 0) + 1;
      });

      // Convert to chart format
      return Object.entries(counts)
        .map(([source, count], index) => ({
          name: SOURCE_LABELS[source] || source,
          value: count,
          source,
          color: SOURCE_COLORS[index % SOURCE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);
    },
  });

  const facilitiesMap = useMemo(() => {
    if (!facilities) return new Map<string, Facility>();
    return new Map(facilities.map(f => [f.id, f]));
  }, [facilities]);

  const openLeadProfile = (lead: Lead) => {
    setSelectedLead(lead);
    setShowProfileModal(true);
  };

  const openOverrideDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setShowOverrideDialog(true);
  };

  // Stats
  const stats = useMemo(() => {
    if (!leads) return { totalNew: 0, autoAssigned: 0, highPriority: 0, qualified: 0 };
    
    let qualified = 0;
    let highPriority = 0;
    let autoAssigned = 0;
    
    leads.forEach((lead) => {
      if (lead.urgency === "immediate") highPriority++;
      if (lead.qualified) qualified++;
      if (lead.assignment_status === "assigned" && lead.assignment_reason?.startsWith("Auto")) {
        autoAssigned++;
      }
    });

    return {
      totalNew: leads.filter((l) => l.status === "new").length,
      autoAssigned,
      highPriority,
      qualified,
    };
  }, [leads]);

  const totalSourceLeads = useMemo(() => {
    return (sourceBreakdown || []).reduce((sum, item) => sum + item.value, 0);
  }, [sourceBreakdown]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads Overview</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Leads are automatically qualified and assigned to providers
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalNew}</p>
                <p className="text-xs text-muted-foreground">New Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Bot className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.autoAssigned}</p>
                <p className="text-xs text-muted-foreground">Auto-Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <Zap className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.highPriority}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.qualified}</p>
                <p className="text-xs text-muted-foreground">Qualified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Source Breakdown Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Lead Sources</CardTitle>
          </div>
          <CardDescription>
            Breakdown of leads by acquisition source {dateRange.from || dateRange.to ? "(filtered by date)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-[250px]">
              {sourceBreakdown && sourceBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={sourceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sourceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [
                        `${value} leads (${((value / totalSourceLeads) * 100).toFixed(1)}%)`,
                        name
                      ]}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No lead data available
                </div>
              )}
            </div>
            {/* Source List */}
            <div className="space-y-3">
              {sourceBreakdown && sourceBreakdown.length > 0 ? (
                sourceBreakdown.map((source, index) => {
                  const percentage = totalSourceLeads > 0 ? (source.value / totalSourceLeads) * 100 : 0;
                  return (
                    <div key={source.source} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: source.color }} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{source.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {source.value} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div 
                            className="h-1.5 rounded-full transition-all" 
                            style={{ width: `${percentage}%`, backgroundColor: source.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No source data available
                </div>
              )}
              {sourceBreakdown && sourceBreakdown.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total Leads</span>
                    <span>{totalSourceLeads}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for All Leads vs Blocked */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "all" | "blocked"); setCurrentPage(1); }}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Leads
          </TabsTrigger>
          <TabsTrigger value="blocked" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Blocked / Unqualified
            {blockedCount ? (
              <Badge variant="secondary" className="ml-1 text-xs">
                {blockedCount}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Filters for All Leads */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={assignmentFilter} onValueChange={handleFilterChange(setAssignmentFilter)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={qualifiedFilter} onValueChange={handleFilterChange(setQualifiedFilter)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="unqualified">Unqualified</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={urgencyFilter} onValueChange={handleFilterChange(setUrgencyFilter)}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Urgency</SelectItem>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="within-week">This Week</SelectItem>
                        <SelectItem value="within-month">This Month</SelectItem>
                        <SelectItem value="researching">Researching</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={scoreFilter} onValueChange={handleFilterChange(setScoreFilter)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Score" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        <SelectItem value="A">Grade A</SelectItem>
                        <SelectItem value="B">Grade B</SelectItem>
                        <SelectItem value="C">Grade C</SelectItem>
                        <SelectItem value="D">Grade D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Date Range Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger className="w-[140px]">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {datePreset === "custom" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                              </>
                            ) : (
                              format(dateRange.from, "MMM d, yyyy")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange.from}
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => {
                            setDateRange({ from: range?.from, to: range?.to });
                            setCurrentPage(1);
                          }}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {(dateRange.from || dateRange.to) && (
                    <Badge variant="secondary" className="text-xs">
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                        : dateRange.from
                        ? `From ${format(dateRange.from, "MMM d, yyyy")}`
                        : `Until ${format(dateRange.to!, "MMM d, yyyy")}`}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Leads Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Leads ({totalCount || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredLeads && filteredLeads.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Contact</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Qualified</TableHead>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Exclusivity</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => {
                        const assignedFacility = lead.facility_id ? facilitiesMap.get(lead.facility_id) : null;
                        
                        return (
                          <TableRow key={lead.id} className="group">
                            <TableCell>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openLeadProfile(lead)}
                                    className="font-medium text-primary hover:underline focus:outline-none focus:underline truncate max-w-[200px] text-left"
                                  >
                                    {lead.name}
                                  </button>
                                  {lead.email_verified && (
                                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                  )}
                                  <UrgencyIndicator urgency={lead.urgency} />
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    {lead.email}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {lead.phone}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <LeadScoreBadge lead={lead} />
                            </TableCell>
                            <TableCell>
                              {lead.qualified ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Qualified
                                </Badge>
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-muted-foreground">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Unqualified
                                      </Badge>
                                    </TooltipTrigger>
                                    {lead.qualification_reason && (
                                      <TooltipContent>
                                        <p>{lead.qualification_reason}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </TableCell>
                            <TableCell>
                              <AssignmentStatusBadge lead={lead} />
                            </TableCell>
                            <TableCell>
                              <ExclusivityBadge lead={lead} facilitiesMap={facilitiesMap} />
                            </TableCell>
                            <TableCell>
                              {assignedFacility ? (
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate max-w-[150px]">{assignedFacility.name}</p>
                                    <p className="text-xs text-muted-foreground">{assignedFacility.city}, {assignedFacility.state}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lead.location_city_state ? (
                                <span className="flex items-center gap-1 text-sm">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {lead.location_city_state}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(lead.created_at), "MMM d, h:mm a")}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openLeadProfile(lead)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {(!lead.qualified || lead.assignment_status === "unqualified_not_routed") && (
                                    <DropdownMenuItem onClick={() => openOverrideDialog(lead)}>
                                      <ShieldCheck className="h-4 w-4 mr-2" />
                                      Override & Route
                                    </DropdownMenuItem>
                                  )}
                                  {lead.qualified && !lead.facility_id && (
                                    <DropdownMenuItem onClick={() => openOverrideDialog(lead)}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Route to Provider
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No leads found</p>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount || 0)} of {totalCount} leads
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
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
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked" className="space-y-4 mt-4">
          {/* Filters for Blocked Leads */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => handleFilterChange(setSearchQuery)(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={blockReasonFilter} onValueChange={handleFilterChange(setBlockReasonFilter)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Block Reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Reasons</SelectItem>
                        <SelectItem value="invalid_contact">Invalid Contact</SelectItem>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="bot">Bot Detected</SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Date Range Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger className="w-[140px]">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {datePreset === "custom" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                              </>
                            ) : (
                              format(dateRange.from, "MMM d, yyyy")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange.from}
                          selected={{ from: dateRange.from, to: dateRange.to }}
                          onSelect={(range) => {
                            setDateRange({ from: range?.from, to: range?.to });
                            setCurrentPage(1);
                          }}
                          numberOfMonths={2}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {(dateRange.from || dateRange.to) && (
                    <Badge variant="secondary" className="text-xs">
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                        : dateRange.from
                        ? `From ${format(dateRange.from, "MMM d, yyyy")}`
                        : `Until ${format(dateRange.to!, "MMM d, yyyy")}`}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blocked Leads Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShieldX className="h-5 w-5 text-red-500" />
                  Blocked / Unqualified Leads ({totalCount || 0})
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        These leads were not routed
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Leads shown here failed qualification checks and were not counted toward provider monthly caps.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription>
                Leads that failed validation, were flagged as spam/bot, or were duplicates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredLeads && filteredLeads.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Contact</TableHead>
                        <TableHead>Block Reasons</TableHead>
                        <TableHead>Qualification Details</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id} className="group">
                          <TableCell>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openLeadProfile(lead)}
                                  className="font-medium text-primary hover:underline focus:outline-none focus:underline truncate max-w-[200px] text-left"
                                >
                                  {lead.name}
                                </button>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1 truncate max-w-[180px]">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {lead.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <BlockReasonBadge lead={lead} />
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[250px]">
                              {lead.qualification_reason ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-sm text-muted-foreground truncate cursor-help">
                                        {lead.qualification_reason}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{lead.qualification_reason}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {SOURCE_LABELS[lead.source || "direct"] || lead.source || "Direct"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), "MMM d, h:mm a")}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openLeadProfile(lead)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openOverrideDialog(lead)}>
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Override & Route
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShieldX className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No blocked or unqualified leads found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leads that fail validation will appear here
                  </p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount || 0)} of {totalCount} leads
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
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
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Routing Logs (Collapsible) */}
      <RoutingLogsTable />

      {/* Lead Profile Modal (Read-only for admin) */}
      <LeadProfileModal
        lead={selectedLead}
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        isAdmin
        facilities={facilities || []}
      />

      {/* Lead Override Dialog */}
      <LeadOverrideDialog
        lead={selectedLead}
        open={showOverrideDialog}
        onOpenChange={setShowOverrideDialog}
      />
    </div>
  );
}
