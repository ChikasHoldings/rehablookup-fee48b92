import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  MessageSquare, 
  TrendingUp, 
  Inbox,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  Search,
  X,
  CalendarIcon,
  Filter,
  Sparkles,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, isToday, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { EmailLeadDialog } from "@/components/provider/leads/EmailLeadDialog";
import { LeadScoreBadge } from "@/components/provider/leads/LeadScoreBadge";
import { LeadProfileModal } from "@/components/leads/LeadProfileModal";
import { calculateLeadScore } from "@/lib/leadScoring";
import { 
  LeadUsageIndicator, 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner,
  BasicPlanBanner,
  LeadLimitOverlay
} from "@/components/provider/LeadUsageIndicator";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  preferred_contact: string;
  created_at: string;
  status: string;
  facility_id: string;
  source: string | null;
  email_verified: boolean | null;
  snooze_until: string | null;
  // Qualified intake fields
  who_seeking_help: string | null;
  location_zip: string | null;
  location_city_state: string | null;
  urgency: string | null;
  primary_substance: string[] | null;
  level_of_care: string | null;
  dual_diagnosis: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  budget_preference: string | null;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function ProviderLeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const { data: subscription } = useSubscription();
  const facilityId = selectedFacility?.id;
  const currentPlan = subscription?.plan || "basic";
  
  // Get lead limit from subscription data
  const leadLimit = subscription?.lead_limit ?? 4;

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["provider-leads", facilityId],
    queryFn: async (): Promise<Lead[]> => {
      if (!facilityId) return [];

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
  });

  // Real-time subscription for leads
  useEffect(() => {
    if (!facilityId) return;
    
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `facility_id=eq.${facilityId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["provider-leads", facilityId] });
          // Show toast notification for new lead
          const newLead = payload.new as Lead;
          toast({
            title: "🎉 New Lead Received!",
            description: `${newLead.name} just submitted a contact request`,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-leads", facilityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId, queryClient, toast]);

  // Sort state
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');

  // Filtered and sorted leads
  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== "all") {
        const isQualified = lead.source === "Request Help Page";
        if (sourceFilter === "qualified" && !isQualified) return false;
        if (sourceFilter === "direct" && isQualified) return false;
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const leadDate = new Date(lead.created_at);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(leadDate, { 
            start: startOfDay(dateRange.from), 
            end: endOfDay(dateRange.to) 
          })) {
            return false;
          }
        } else if (dateRange.from) {
          if (leadDate < startOfDay(dateRange.from)) return false;
        } else if (dateRange.to) {
          if (leadDate > endOfDay(dateRange.to)) return false;
        }
      }

      return true;
    });

    // Sort by score or date
    if (sortBy === 'score') {
      result = [...result].sort((a, b) => {
        const scoreA = calculateLeadScore(a).total;
        const scoreB = calculateLeadScore(b).total;
        return scoreB - scoreA; // Highest score first
      });
    } else {
      result = [...result].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [leads, searchQuery, statusFilter, sourceFilter, dateRange, sortBy]);

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-leads"] });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const thisMonthLeads = leads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    return leadDate >= startOfMonth(new Date());
  });

  // Separate qualified and direct leads for this month
  const thisMonthQualifiedLeads = thisMonthLeads.filter(lead => lead.source === "Request Help Page");
  const thisMonthDirectLeads = thisMonthLeads.filter(lead => lead.source !== "Request Help Page");

  const todayLeads = leads.filter(lead => isToday(new Date(lead.created_at)));
  const newLeads = leads.filter(lead => lead.status === "new");

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  const handleCopyContact = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Contact info copied" });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || sourceFilter !== "all" || dateRange.from || dateRange.to;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
        <p className="text-muted-foreground mt-1">
          Patient inquiries received through RehabLookup
        </p>
      </div>

      {/* Lead Limit Banners */}
      {leadLimit === 0 && <BasicPlanBanner />}
      {/* Basic plan: all leads count toward limit */}
      {currentPlan === "basic" && leadLimit > 0 && (
        <>
          <LeadLimitReachedBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} plan="basic" />
          <LeadLimitWarningBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} />
        </>
      )}
      {/* Professional plan: only qualified leads count toward limit */}
      {currentPlan === "professional" && leadLimit > 0 && (
        <>
          <LeadLimitReachedBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} plan="professional" isQualifiedLeads />
          <LeadLimitWarningBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} />
        </>
      )}
      {/* Featured plan uses same logic as professional */}
      {currentPlan === "featured" && leadLimit > 0 && (
        <>
          <LeadLimitReachedBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} plan="featured" isQualifiedLeads />
          <LeadLimitWarningBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} />
        </>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-primary/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{leads.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        {/* Qualified Leads This Month */}
        <Card 
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all hover:shadow-md",
            sourceFilter === "qualified" 
              ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
              : "border-primary/20 hover:border-primary/40"
          )}
          onClick={() => setSourceFilter(sourceFilter === "qualified" ? "all" : "qualified")}
        >
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Qualified
              {sourceFilter === "qualified" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">Active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-14 w-14 rounded-full" />
            ) : (
              <div className="flex items-center gap-4">
                {/* Progress Ring */}
                <div className="relative h-14 w-14 flex-shrink-0">
                  <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                    {/* Background circle */}
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-muted/30"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="28"
                      cy="28"
                      r="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                      className={cn(
                        "transition-all duration-500",
                        thisMonthQualifiedLeads.length >= leadLimit 
                          ? "text-destructive" 
                          : thisMonthQualifiedLeads.length >= leadLimit * 0.8 
                            ? "text-amber-500" 
                            : "text-primary"
                      )}
                      strokeDasharray={`${Math.min((thisMonthQualifiedLeads.length / leadLimit) * 150.8, 150.8)} 150.8`}
                    />
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn(
                      "text-sm font-bold",
                      thisMonthQualifiedLeads.length >= leadLimit 
                        ? "text-destructive" 
                        : thisMonthQualifiedLeads.length >= leadLimit * 0.8 
                          ? "text-amber-500" 
                          : "text-primary"
                    )}>
                      {Math.round((thisMonthQualifiedLeads.length / leadLimit) * 100)}%
                    </span>
                  </div>
                </div>
                {/* Count */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold text-primary">{thisMonthQualifiedLeads.length}</p>
                    <span className="text-sm text-muted-foreground">/ {leadLimit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Click to filter</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Direct Leads This Month */}
        <Card 
          className={cn(
            "relative overflow-hidden cursor-pointer transition-all hover:shadow-md",
            sourceFilter === "direct" 
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5" 
              : "hover:border-blue-500/40"
          )}
          onClick={() => setSourceFilter(sourceFilter === "direct" ? "all" : "direct")}
        >
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-blue-500/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Direct
              {sourceFilter === "direct" && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-auto">Active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-foreground">{thisMonthDirectLeads.length}</p>
                {currentPlan !== "basic" && (
                  <span className="text-xs text-green-600 font-medium">∞</span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Click to filter</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-green-500/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              New Today
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{todayLeads.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Fresh inquiries</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full bg-amber-500/5" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Awaiting Response
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{newLeads.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">New leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>All Leads</CardTitle>
                <p className="text-sm text-muted-foreground">Click a row to view details and add notes</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {getStatusOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Source Filter */}
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="qualified">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Qualified
                    </span>
                  </SelectItem>
                  <SelectItem value="direct">
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Direct
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal min-w-[200px]",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className="p-3 pointer-events-auto"
                  />
                  {(dateRange.from || dateRange.to) && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                      >
                        Clear dates
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  Showing {filteredLeads.length} of {leads.length} leads
                </span>
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {getStatusOptions().find(o => o.value === statusFilter)?.label}
                    <button onClick={() => setStatusFilter("all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {sourceFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Source: {sourceFilter === "qualified" ? "Qualified" : "Direct"}
                    <button onClick={() => setSourceFilter("all")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {dateRange.from && (
                  <Badge variant="secondary" className="gap-1">
                    {dateRange.to 
                      ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                      : `From ${format(dateRange.from, "MMM d")}`
                    }
                    <button onClick={() => setDateRange({ from: undefined, to: undefined })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-28" />
                  <Skeleton className="h-12 w-24" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                <Users className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No leads yet</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                When families submit contact requests for your facility, they'll appear here. 
                Make sure your listing is complete to attract more inquiries.
              </p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No matching leads</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Try adjusting your filters to find what you're looking for.
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              {/* Upgrade overlay when limit is reached */}
              {/* Basic plan: all leads count toward limit */}
              {currentPlan === "basic" && thisMonthLeads.length >= leadLimit && (
                <LeadLimitOverlay 
                  usedLeads={thisMonthLeads.length} 
                  leadLimit={leadLimit} 
                  hiddenLeadsCount={Math.max(0, thisMonthLeads.length - leadLimit)}
                  plan="basic"
                />
              )}
              {/* Professional plan: only qualified leads count toward limit */}
              {currentPlan === "professional" && thisMonthQualifiedLeads.length >= leadLimit && (
                <LeadLimitOverlay 
                  usedLeads={thisMonthQualifiedLeads.length} 
                  leadLimit={leadLimit} 
                  hiddenLeadsCount={Math.max(0, filteredLeads.filter(l => l.source === "Request Help Page").length - leadLimit)}
                  plan="professional"
                  isQualifiedOnly
                />
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">
                      <button 
                        onClick={() => setSortBy(sortBy === 'score' ? 'date' : 'score')}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Score
                        {sortBy === 'score' && <span className="text-primary">↓</span>}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Phone</TableHead>
                    <TableHead className="font-semibold">
                      <button 
                        onClick={() => setSortBy(sortBy === 'date' ? 'score' : 'date')}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Date
                        {sortBy === 'date' && <span className="text-primary">↓</span>}
                      </button>
                    </TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead, index) => {
                    const isQualifiedLead = lead.source === "Request Help Page";
                    
                    // Calculate if this lead should be locked
                    // Basic plan: all leads after limit are locked
                    // Professional plan: only qualified leads after limit are locked, direct leads are always unlocked
                    let isLocked = false;
                    if (currentPlan === "basic") {
                      isLocked = index >= leadLimit;
                    } else if (currentPlan === "professional") {
                      if (isQualifiedLead) {
                        // Count how many qualified leads came before this one
                        const qualifiedLeadsBeforeThis = filteredLeads.slice(0, index).filter(l => l.source === "Request Help Page").length;
                        isLocked = qualifiedLeadsBeforeThis >= leadLimit;
                      }
                      // Direct leads are never locked for Professional plan
                    }
                    // Featured plan: no leads are locked
                    
                    return (
                      <TableRow 
                        key={lead.id}
                        className={`hover:bg-muted/30 cursor-pointer group ${isLocked ? "select-none" : ""}`}
                        onClick={() => !isLocked && handleOpenLead(lead)}
                      >
                        <TableCell className="font-medium">
                          <div className={`flex items-center gap-2 ${isLocked ? "blur-sm" : ""}`}>
                            {isLocked ? (
                              <span>Hidden Lead</span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenLead(lead);
                                }}
                                className="text-left font-medium text-primary hover:underline focus:outline-none focus:underline"
                              >
                                {lead.name}
                              </button>
                            )}
                            {lead.message && !isLocked && (
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={isLocked ? "blur-sm" : ""}>
                            <LeadScoreBadge lead={lead} size="sm" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={isLocked ? "blur-sm" : ""}>
                            {lead.source === "Request Help Page" ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className="gap-1.5 text-xs font-semibold bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-sm cursor-help">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      Qualified
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[280px] text-center">
                                    <p className="font-semibold mb-1">Qualified Lead</p>
                                    <p className="text-xs text-muted-foreground">
                                      Matched to your facility through our intake form. Pre-screened for treatment needs, insurance, and location.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="gap-1.5 text-xs font-medium bg-muted/50 border-border cursor-help">
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                      Direct
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[280px] text-center">
                                    <p className="font-semibold mb-1">Direct Inquiry</p>
                                    <p className="text-xs text-muted-foreground">
                                      Submitted directly from your public profile page. These don't count toward your qualified lead limit.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 ${isLocked ? "blur-sm" : ""}`}>
                            {lead.preferred_contact === "email" ? (
                              <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center">
                                <Mail className="h-3 w-3 text-blue-600" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded bg-green-500/10 flex items-center justify-center">
                                <Phone className="h-3 w-3 text-green-600" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={isLocked ? "blur-sm" : ""}>
                            {isLocked ? (
                              <span className="text-sm text-muted-foreground">•••-•••-••••</span>
                            ) : (
                              <a 
                                href={`tel:${lead.phone}`} 
                                className="text-sm text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {lead.phone}
                              </a>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${isLocked ? "blur-sm" : ""}`}>
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(lead.created_at), "MMM d")}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <div className="blur-sm">
                              <Badge variant="outline" className="text-xs">Locked</Badge>
                            </div>
                          ) : (
                            <Select
                              value={lead.status}
                              onValueChange={(value) => 
                                updateStatus.mutate({ leadId: lead.id, status: value as LeadStatus })
                              }
                            >
                              <SelectTrigger className="w-[120px] h-7 text-xs">
                                <SelectValue>
                                  <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {getStatusOptions().map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <div className="blur-sm">
                              <div className="flex items-center gap-1">
                                <div className="h-8 w-8 rounded bg-muted" />
                                <div className="h-8 w-8 rounded bg-muted" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Email lead"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmailLead(lead);
                                  setEmailDialogOpen(true);
                                }}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Copy contact"
                                onClick={(e) => handleCopyContact(lead, e)}
                              >
                                {copiedId === lead.id ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View details"
                                onClick={() => handleOpenLead(lead)}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Profile Modal */}
      <LeadProfileModal
        lead={selectedLead}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Email Dialog */}
      <EmailLeadDialog
        lead={emailLead}
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
      />
    </div>
  );
}
