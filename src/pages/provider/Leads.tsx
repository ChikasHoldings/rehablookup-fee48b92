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
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
  
  // Filter states
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
      <div className="flex-shrink-0 px-6 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Leads</h1>
            <p className="text-sm text-muted-foreground">
              {leads.length} total • {thisMonthQualifiedLeads.length}/{leadLimit} qualified this month
            </p>
          </div>
        </div>
      </div>

      {/* Banners */}
      <div className="flex-shrink-0 px-6 pb-3 space-y-2">
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

      {/* CRM Split View */}
      <div className="flex-1 min-h-0 px-6 pb-4">
        <Card className="h-full flex flex-col overflow-hidden border-border/60">
          {/* Filters */}
          <div className="flex-shrink-0 px-4 py-3 border-b bg-muted/40">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm bg-background"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
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

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[100px] h-8 text-xs bg-background">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5 bg-background", dateRange.from && "text-primary border-primary/50")}>
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
                className={cn("h-8 text-xs gap-1", sortBy === 'score' && "text-primary bg-primary/10")}
                onClick={() => setSortBy(sortBy === 'score' ? 'date' : 'score')}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {sortBy === 'score' ? 'Score' : 'Date'}
              </Button>

              {hasActiveFilters && (
                <>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {filteredLeads.length} of {leads.length}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Split Pane */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Lead List */}
            <div className={cn(
              "flex flex-col transition-all overflow-hidden",
              selectedLead ? "w-[300px] lg:w-[340px] border-r" : "flex-1"
            )}>
              {isLoading ? (
                <div className="p-3 space-y-2 overflow-y-auto">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
                  ))}
                </div>
              ) : leads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-medium text-foreground">No leads yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                      Contact requests will appear here
                    </p>
                  </div>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <h3 className="font-medium text-foreground">No matches</h3>
                    <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">
                      Clear filters
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
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
                              ? "bg-primary/10 border border-primary/30 shadow-sm" 
                              : "hover:bg-muted/60 border border-transparent",
                            isLocked && "opacity-40 cursor-not-allowed blur-[1px]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "font-medium text-sm truncate",
                                  isSelected ? "text-primary" : "text-foreground"
                                )}>
                                  {isLocked ? "Hidden" : lead.name}
                                </span>
                                {lead.source === "Request Help Page" && !isLocked && (
                                  <Badge className="h-4 px-1 text-[9px] bg-primary text-primary-foreground flex-shrink-0">
                                    <Sparkles className="h-2 w-2 mr-0.5" />
                                    Q
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                <span>{format(new Date(lead.created_at), "MMM d")}</span>
                                {lead.message && !isLocked && (
                                  <MessageSquare className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                              {!isLocked && <LeadScoreBadge lead={lead} size="sm" />}
                            </div>
                          </div>
                          {!isLocked && (
                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {lead.preferred_contact === "email" ? (
                                  <Mail className="h-2.5 w-2.5" />
                                ) : (
                                  <Phone className="h-2.5 w-2.5" />
                                )}
                              </span>
                              {lead.location_city_state && (
                                <span className="truncate max-w-[120px]">{lead.location_city_state}</span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
