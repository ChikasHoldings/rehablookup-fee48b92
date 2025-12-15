import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Building2,
  ArrowRight,
  Clock,
  Shield,
  Zap,
  TrendingUp,
  MoreHorizontal,
  CheckSquare,
  Square,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { calculateLeadScore, getScoreColor, type LeadScoringInput } from "@/lib/leadScoring";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState(
    searchParams.get("unassigned") === "true" ? "unassigned" : "all"
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Invalidate leads queries helper
  const invalidateLeadsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    queryClient.invalidateQueries({ queryKey: ["admin-leads-count"] });
  }, [queryClient]);

  // Real-time subscriptions for leads - always active
  useEffect(() => {
    const leadsChannel = supabase
      .channel("admin-leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          invalidateLeadsQueries();
          toast.success("New lead received", {
            description: `${(payload.new as Lead).name} submitted a new inquiry`,
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
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        () => {
          invalidateLeadsQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [invalidateLeadsQueries]);

  // Fetch total count for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["admin-leads-count", assignmentFilter, statusFilter, urgencyFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("id", { count: "exact", head: true });

      if (assignmentFilter === "unassigned") {
        query = query.is("facility_id", null);
      } else if (assignmentFilter === "assigned") {
        query = query.not("facility_id", "is", null);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (urgencyFilter !== "all") {
        query = query.eq("urgency", urgencyFilter);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch leads with pagination
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads", assignmentFilter, statusFilter, urgencyFilter, searchQuery, currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (assignmentFilter === "unassigned") {
        query = query.is("facility_id", null);
      } else if (assignmentFilter === "assigned") {
        query = query.not("facility_id", "is", null);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (urgencyFilter !== "all") {
        query = query.eq("urgency", urgencyFilter);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });

  // Filter leads by score grade on client side
  const filteredLeads = useMemo(() => {
    if (!leads || scoreFilter === "all") return leads;
    
    return leads.filter((lead) => {
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
    setSelectedLeads(new Set());
  };

  // Fetch facilities for assignment
  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities-for-assignment"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facilities")
        .select("id, name, city, state")
        .eq("status", "approved")
        .eq("suspended", false)
        .order("name");
      return data as Facility[];
    },
  });

  // Assign lead mutation
  const assignLead = useMutation({
    mutationFn: async ({ leadId, facilityId }: { leadId: string; facilityId: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ facility_id: facilityId })
        .eq("id", leadId);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: "lead_assigned",
        target_type: "lead",
        target_id: leadId,
        details: { facility_id: facilityId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Lead assigned successfully");
      setShowAssignDialog(false);
    },
    onError: () => {
      toast.error("Failed to assign lead");
    },
  });

  // Bulk assign mutation
  const bulkAssignLeads = useMutation({
    mutationFn: async ({ leadIds, facilityId }: { leadIds: string[]; facilityId: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ facility_id: facilityId })
        .in("id", leadIds);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert(
        leadIds.map((leadId) => ({
          admin_user_id: user?.id,
          action_type: "lead_bulk_assigned",
          target_type: "lead",
          target_id: leadId,
          details: { facility_id: facilityId },
        }))
      );
    },
    onSuccess: (_, { leadIds }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success(`${leadIds.length} leads assigned successfully`);
      setShowBulkAssignDialog(false);
      setSelectedLeads(new Set());
    },
    onError: () => {
      toast.error("Failed to assign leads");
    },
  });

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);
  };

  const openAssignDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setShowAssignDialog(true);
  };

  const handleAssign = (facilityId: string) => {
    if (!selectedLead) return;
    assignLead.mutate({ leadId: selectedLead.id, facilityId });
  };

  const handleBulkAssign = (facilityId: string) => {
    const leadIds = Array.from(selectedLeads);
    bulkAssignLeads.mutate({ leadIds, facilityId });
  };

  const toggleLeadSelection = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const toggleSelectAll = () => {
    if (!filteredLeads) return;
    const unassignedLeads = filteredLeads.filter((l) => !l.facility_id);
    if (selectedLeads.size === unassignedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(unassignedLeads.map((l) => l.id)));
    }
  };

  const unassignedSelectedCount = useMemo(() => {
    if (!filteredLeads) return 0;
    return filteredLeads.filter((l) => !l.facility_id && selectedLeads.has(l.id)).length;
  }, [filteredLeads, selectedLeads]);

  // Stats
  const stats = useMemo(() => {
    if (!leads) return { totalNew: 0, unassigned: 0, highPriority: 0, gradeA: 0 };
    
    let gradeA = 0;
    let highPriority = 0;
    
    leads.forEach((lead) => {
      if (lead.urgency === "immediate") highPriority++;
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
      if (calculateLeadScore(scoringInput).grade === "A") gradeA++;
    });

    return {
      totalNew: leads.filter((l) => l.status === "new").length,
      unassigned: leads.filter((l) => !l.facility_id).length,
      highPriority,
      gradeA,
    };
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads Management</h1>
          <p className="text-muted-foreground">Review, score, and route incoming leads</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedLeads.size > 0 && (
            <Button onClick={() => setShowBulkAssignDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Assign {unassignedSelectedCount} Lead{unassignedSelectedCount !== 1 ? "s" : ""}
            </Button>
          )}
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
              <div className="p-2 rounded-lg bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.unassigned}</p>
                <p className="text-xs text-muted-foreground">Unassigned</p>
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
              <div className="p-2 rounded-lg bg-green-50">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.gradeA}</p>
                <p className="text-xs text-muted-foreground">Grade A Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
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
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
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
        </CardContent>
      </Card>

      {/* Leads Table */}
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredLeads.filter((l) => !l.facility_id).length > 0 &&
                          selectedLeads.size === filteredLeads.filter((l) => !l.facility_id).length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="group">
                      <TableCell>
                        {!lead.facility_id && (
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate max-w-[200px]">{lead.name}</p>
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
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={lead.status} />
                          {!lead.facility_id ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">
                              Unassigned
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                              Assigned
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {lead.insurance_type || "—"}
                        </span>
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
                            <DropdownMenuItem onClick={() => openLeadDetail(lead)}>
                              View Details
                            </DropdownMenuItem>
                            {!lead.facility_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openAssignDialog(lead)}>
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Assign to Provider
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
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

      {/* Lead Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Lead Details
              {selectedLead && <LeadScoreBadge lead={selectedLead} />}
            </DialogTitle>
            <DialogDescription>
              Submitted {selectedLead && format(new Date(selectedLead.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-6 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedLead.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{selectedLead.email}</p>
                      {selectedLead.email_verified && (
                        <Badge variant="outline" className="text-green-600">Verified</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedLead.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {selectedLead.location_city_state || selectedLead.location_zip || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Level of Care</p>
                    <p className="font-medium">{selectedLead.level_of_care || "Not specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Urgency</p>
                    <p className="font-medium">{selectedLead.urgency || "Not specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Insurance</p>
                    <p className="font-medium">
                      {selectedLead.insurance_type || "Not specified"}
                      {selectedLead.insurance_provider && ` - ${selectedLead.insurance_provider}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Seeking Help For</p>
                    <p className="font-medium">{selectedLead.who_seeking_help || "Not specified"}</p>
                  </div>
                </div>

                {selectedLead.primary_substance && selectedLead.primary_substance.length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Primary Substances</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedLead.primary_substance.map((substance) => (
                        <Badge key={substance} variant="secondary">
                          {substance}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.message && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Message</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{selectedLead.message}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {selectedLead && !selectedLead.facility_id && (
            <DialogFooter className="mt-4">
              <Button
                className="w-full"
                onClick={() => {
                  setShowDetailDialog(false);
                  openAssignDialog(selectedLead);
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Assign to Provider
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Single Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Lead to Provider</DialogTitle>
            <DialogDescription>
              Select a provider to receive this lead. They will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {facilities?.map((facility) => (
                <button
                  key={facility.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                  onClick={() => handleAssign(facility.id)}
                  disabled={assignLead.isPending}
                >
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{facility.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {facility.city}, {facility.state}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Assign {unassignedSelectedCount} Lead{unassignedSelectedCount !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Select a provider to receive these leads. They will be notified for each lead.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {facilities?.map((facility) => (
                <button
                  key={facility.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                  onClick={() => handleBulkAssign(facility.id)}
                  disabled={bulkAssignLeads.isPending}
                >
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{facility.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {facility.city}, {facility.state}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
