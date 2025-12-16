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
import { toast } from "sonner";
import { calculateLeadScore, getScoreColor, type LeadScoringInput } from "@/lib/leadScoring";
import { LeadProfileModal } from "@/components/leads/LeadProfileModal";
import { RoutingLogsTable } from "@/components/admin/RoutingLogsTable";

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
  const [qualifiedFilter, setQualifiedFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Fetch total count for pagination
  const { data: totalCount } = useQuery({
    queryKey: ["admin-leads-count", assignmentFilter, statusFilter, urgencyFilter, qualifiedFilter, searchQuery],
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

      if (qualifiedFilter !== "all") {
        query = query.eq("qualified", qualifiedFilter === "qualified");
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
    queryKey: ["admin-leads", assignmentFilter, statusFilter, urgencyFilter, qualifiedFilter, searchQuery, currentPage],
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

      if (qualifiedFilter !== "all") {
        query = query.eq("qualified", qualifiedFilter === "qualified");
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

  const facilitiesMap = useMemo(() => {
    if (!facilities) return new Map<string, Facility>();
    return new Map(facilities.map(f => [f.id, f]));
  }, [facilities]);

  const openLeadProfile = (lead: Lead) => {
    setSelectedLead(lead);
    setShowProfileModal(true);
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Qualified</TableHead>
                    <TableHead>Assignment</TableHead>
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
    </div>
  );
}
