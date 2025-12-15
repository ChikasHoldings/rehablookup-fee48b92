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
  Search,
  X,
  CalendarIcon,
  Filter,
  Sparkles,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { LeadScoreBadge } from "@/components/provider/leads/LeadScoreBadge";
import { LeadDetailPanel, type Lead } from "@/components/provider/leads/LeadDetailPanel";
import { calculateLeadScore } from "@/lib/leadScoring";
import { 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner,
  BasicPlanBanner,
  LeadLimitOverlay
} from "@/components/provider/LeadUsageIndicator";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function ProviderLeadsPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.includes(query);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (sourceFilter !== "all") {
        const isQualified = lead.source === "Request Help Page";
        if (sourceFilter === "qualified" && !isQualified) return false;
        if (sourceFilter === "direct" && isQualified) return false;
      }

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

    if (sortBy === 'score') {
      result = [...result].sort((a, b) => {
        const scoreA = calculateLeadScore(a).total;
        const scoreB = calculateLeadScore(b).total;
        return scoreB - scoreA;
      });
    } else {
      result = [...result].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [leads, searchQuery, statusFilter, sourceFilter, dateRange, sortBy]);

  const thisMonthLeads = leads.filter(lead => {
    const leadDate = new Date(lead.created_at);
    return leadDate >= startOfMonth(new Date());
  });

  const thisMonthQualifiedLeads = thisMonthLeads.filter(lead => lead.source === "Request Help Page");
  const thisMonthDirectLeads = thisMonthLeads.filter(lead => lead.source !== "Request Help Page");
  const todayLeads = leads.filter(lead => isToday(new Date(lead.created_at)));
  const newLeads = leads.filter(lead => lead.status === "new");

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || sourceFilter !== "all" || dateRange.from || dateRange.to;

  // Check if lead is locked based on plan
  const isLeadLocked = (lead: Lead, index: number) => {
    const isQualifiedLead = lead.source === "Request Help Page";
    if (currentPlan === "basic") {
      return index >= leadLimit;
    } else if (currentPlan === "professional") {
      if (isQualifiedLead) {
        const qualifiedLeadsBeforeThis = filteredLeads.slice(0, index).filter(l => l.source === "Request Help Page").length;
        return qualifiedLeadsBeforeThis >= leadLimit;
      }
    }
    return false;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-0">
        <h1 className="font-display text-2xl font-bold text-foreground">Leads</h1>
        <p className="text-muted-foreground mt-1">
          Patient inquiries received through RehabLookup
        </p>
      </div>

      {/* Banners */}
      <div className="flex-shrink-0 px-4 pt-4 space-y-4">
        {leadLimit === 0 && <BasicPlanBanner />}
        {currentPlan === "basic" && leadLimit > 0 && (
          <>
            <LeadLimitReachedBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} plan="basic" />
            <LeadLimitWarningBanner usedLeads={thisMonthLeads.length} leadLimit={leadLimit} />
          </>
        )}
        {currentPlan === "professional" && leadLimit > 0 && (
          <>
            <LeadLimitReachedBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} plan="professional" isQualifiedLeads />
            <LeadLimitWarningBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} />
          </>
        )}
        {currentPlan === "featured" && leadLimit > 0 && (
          <>
            <LeadLimitReachedBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} plan="featured" isQualifiedLeads />
            <LeadLimitWarningBanner usedLeads={thisMonthQualifiedLeads.length} leadLimit={leadLimit} />
          </>
        )}
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 px-4 pt-4">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isLoading ? <Skeleton className="h-7 w-12" /> : (
                <p className="text-2xl font-bold text-foreground">{leads.length}</p>
              )}
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all",
              sourceFilter === "qualified" 
                ? "border-primary ring-1 ring-primary/20 bg-primary/5" 
                : "hover:border-primary/40"
            )}
            onClick={() => setSourceFilter(sourceFilter === "qualified" ? "all" : "qualified")}
          >
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Qualified
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isLoading ? <Skeleton className="h-7 w-12" /> : (
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold text-primary">{thisMonthQualifiedLeads.length}</p>
                  <span className="text-xs text-muted-foreground">/ {leadLimit}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card 
            className={cn(
              "relative overflow-hidden cursor-pointer transition-all",
              sourceFilter === "direct" 
                ? "border-blue-500 ring-1 ring-blue-500/20 bg-blue-500/5" 
                : "hover:border-blue-500/40"
            )}
            onClick={() => setSourceFilter(sourceFilter === "direct" ? "all" : "direct")}
          >
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Direct
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isLoading ? <Skeleton className="h-7 w-12" /> : (
                <p className="text-2xl font-bold text-foreground">{thisMonthDirectLeads.length}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isLoading ? <Skeleton className="h-7 w-12" /> : (
                <p className="text-2xl font-bold text-foreground">{todayLeads.length}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                New
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isLoading ? <Skeleton className="h-7 w-12" /> : (
                <p className="text-2xl font-bold text-foreground">{newLeads.length}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CRM Split View */}
      <div className="flex-1 min-h-0 p-4 pt-4">
        <Card className="h-full flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="flex-shrink-0 p-3 border-b bg-muted/30">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {getStatusOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", dateRange.from && "text-primary")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>{format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}</>
                      ) : format(dateRange.from, "MMM d")
                    ) : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    className="p-3"
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 text-xs gap-1", sortBy === 'score' && "text-primary")}
                onClick={() => setSortBy(sortBy === 'score' ? 'date' : 'score')}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {sortBy === 'score' ? 'By Score' : 'By Date'}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}

              {hasActiveFilters && (
                <span className="text-xs text-muted-foreground">
                  {filteredLeads.length} of {leads.length}
                </span>
              )}
            </div>
          </div>

          {/* Split Pane */}
          <div className="flex-1 flex min-h-0">
            {/* Lead List */}
            <div className={cn(
              "border-r flex flex-col transition-all",
              selectedLead ? "w-[320px] lg:w-[380px]" : "flex-1"
            )}>
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : leads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">No leads yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      When families submit contact requests, they'll appear here.
                    </p>
                  </div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">No matches</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your filters
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {filteredLeads.map((lead, index) => {
                      const isLocked = isLeadLocked(lead, index);
                      const isSelected = selectedLead?.id === lead.id;
                      
                      return (
                        <button
                          key={lead.id}
                          onClick={() => !isLocked && setSelectedLead(lead)}
                          disabled={isLocked}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all",
                            isSelected 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover:bg-muted/70 border border-transparent",
                            isLocked && "opacity-50 cursor-not-allowed blur-[2px]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-medium text-sm truncate",
                                  isSelected ? "text-primary" : "text-foreground"
                                )}>
                                  {isLocked ? "Hidden Lead" : lead.name}
                                </span>
                                {lead.source === "Request Help Page" && !isLocked && (
                                  <Badge className="h-4 px-1 text-[9px] bg-primary text-white flex-shrink-0">
                                    <Sparkles className="h-2 w-2 mr-0.5" />
                                    Q
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(lead.created_at), "MMM d")}
                                </span>
                                {lead.message && !isLocked && (
                                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                              {!isLocked && <LeadScoreBadge lead={lead} size="sm" />}
                            </div>
                          </div>
                          {!isLocked && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {lead.preferred_contact === "email" ? (
                                  <Mail className="h-3 w-3" />
                                ) : (
                                  <Phone className="h-3 w-3" />
                                )}
                                {lead.preferred_contact}
                              </span>
                              {lead.location_city_state && (
                                <span className="truncate">{lead.location_city_state}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Detail Panel */}
            <LeadDetailPanel 
              lead={selectedLead} 
              onClose={() => setSelectedLead(null)}
              facilityName={selectedFacility?.name}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
