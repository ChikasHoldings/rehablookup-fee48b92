import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Mail, 
  Phone, 
  MessageSquare, 
  TrendingUp, 
  Search,
  X,
  CalendarIcon,
  Sparkles,
  ChevronRight,
} from "lucide-react";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { LeadScoreBadge } from "@/components/provider/leads/LeadScoreBadge";
import { LeadDetailPanel, type Lead } from "@/components/provider/leads/LeadDetailPanel";
import { calculateLeadScore } from "@/lib/leadScoring";
import { 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner,
  BasicPlanBanner,
} from "@/components/provider/LeadUsageIndicator";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function ProviderLeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const { data: subscription } = useSubscription();
  const facilityId = selectedFacility?.id;
  const currentPlan = subscription?.plan || "basic";
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

  useEffect(() => {
    if (!facilityId) return;
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads", filter: `facility_id=eq.${facilityId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["provider-leads", facilityId] });
          const newLead = payload.new as Lead;
          toast({ title: "🎉 New Lead!", description: `${newLead.name} submitted a request` });
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads", filter: `facility_id=eq.${facilityId}` },
        () => queryClient.invalidateQueries({ queryKey: ["provider-leads", facilityId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [facilityId, queryClient, toast]);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!lead.name.toLowerCase().includes(q) && !lead.email.toLowerCase().includes(q) && !lead.phone.includes(q)) return false;
      }
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (sourceFilter !== "all") {
        const isQ = lead.source === "Request Help Page";
        if (sourceFilter === "qualified" && !isQ) return false;
        if (sourceFilter === "direct" && isQ) return false;
      }
      if (dateRange.from || dateRange.to) {
        const d = new Date(lead.created_at);
        if (dateRange.from && dateRange.to && !isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
        if (dateRange.from && !dateRange.to && d < startOfDay(dateRange.from)) return false;
        if (dateRange.to && !dateRange.from && d > endOfDay(dateRange.to)) return false;
      }
      return true;
    });
    return sortBy === 'score' 
      ? [...result].sort((a, b) => calculateLeadScore(b).total - calculateLeadScore(a).total)
      : [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [leads, searchQuery, statusFilter, sourceFilter, dateRange, sortBy]);

  const thisMonthLeads = leads.filter(l => new Date(l.created_at) >= startOfMonth(new Date()));
  const thisMonthQualified = thisMonthLeads.filter(l => l.source === "Request Help Page");
  const clearFilters = () => { setSearchQuery(""); setStatusFilter("all"); setSourceFilter("all"); setDateRange({ from: undefined, to: undefined }); };
  const hasFilters = searchQuery || statusFilter !== "all" || sourceFilter !== "all" || dateRange.from || dateRange.to;

  const isLeadLocked = (lead: Lead, index: number) => {
    if (currentPlan === "basic") return index >= leadLimit;
    if (currentPlan === "professional" && lead.source === "Request Help Page") {
      return filteredLeads.slice(0, index).filter(l => l.source === "Request Help Page").length >= leadLimit;
    }
    return false;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-muted/30">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-background border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Lead Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {leads.length} total leads • {thisMonthQualified.length}/{leadLimit} qualified this month
            </p>
          </div>
        </div>
      </div>

      {/* Banners */}
      {(leadLimit === 0 || currentPlan !== "featured") && (
        <div className="flex-shrink-0 px-6 py-2 space-y-2 bg-background border-b">
          {leadLimit === 0 && <BasicPlanBanner />}
          {currentPlan === "basic" && leadLimit > 0 && (
            <>
              <LeadLimitReachedBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} plan="basic" />
              <LeadLimitWarningBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} />
            </>
          )}
          {currentPlan === "professional" && leadLimit > 0 && (
            <>
              <LeadLimitReachedBanner usedLeads={thisMonthQualified.length} leadLimit={leadLimit} plan="professional" isQualifiedLeads />
              <LeadLimitWarningBanner usedLeads={thisMonthQualified.length} leadLimit={leadLimit} />
            </>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Lead List */}
        <div className={cn(
          "flex flex-col bg-background border-r transition-all duration-200",
          selectedLead ? "w-[320px] lg:w-[360px]" : "flex-1 max-w-2xl"
        )}>
          {/* Filters Bar */}
          <div className="flex-shrink-0 p-3 border-b bg-muted/30">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[100px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">All</SelectItem>
                  {getStatusOptions().map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[90px] h-9 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 text-xs px-2.5", dateRange.from && "border-primary text-primary")}>
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(r) => setDateRange({ from: r?.from, to: r?.to })}
                    numberOfMonths={2}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant={sortBy === 'score' ? "secondary" : "ghost"}
                size="sm"
                className="h-9 text-xs px-2.5"
                onClick={() => setSortBy(sortBy === 'score' ? 'date' : 'score')}
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs px-2">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {hasFilters && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Showing {filteredLeads.length} of {leads.length} leads
              </p>
            )}
          </div>

          {/* Lead List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[76px] rounded-lg" />)}
              </div>
            ) : leads.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-medium text-foreground">No leads yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">Contact requests will appear here</p>
                </div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <h3 className="font-medium">No matches</h3>
                  <Button variant="link" size="sm" onClick={clearFilters}>Clear filters</Button>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLeads.map((lead, idx) => {
                  const locked = isLeadLocked(lead, idx);
                  const selected = selectedLead?.id === lead.id;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => !locked && setSelectedLead(lead)}
                      disabled={locked}
                      className={cn(
                        "w-full text-left px-4 py-3 transition-colors relative group",
                        selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50 border-l-2 border-l-transparent",
                        locked && "opacity-40 blur-[1px] cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium",
                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {locked ? "?" : lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium text-sm truncate", selected && "text-primary")}>
                              {locked ? "Hidden Lead" : lead.name}
                            </span>
                            {lead.source === "Request Help Page" && !locked && (
                              <Badge className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-0">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                Qualified
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{format(new Date(lead.created_at), "MMM d, h:mm a")}</span>
                            {lead.message && !locked && <MessageSquare className="h-3 w-3" />}
                          </div>
                          {!locked && (
                            <div className="flex items-center gap-3 mt-1.5">
                              <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                              <LeadScoreBadge lead={lead} size="sm" />
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground/50 flex-shrink-0 transition-transform",
                          selected && "text-primary translate-x-0.5"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Detail */}
        <LeadDetailPanel 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)}
          facilityName={selectedFacility?.name}
        />
      </div>
    </div>
  );
}
