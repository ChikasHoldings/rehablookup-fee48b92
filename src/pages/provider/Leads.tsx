import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users, 
  Search,
  X,
  CalendarIcon,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
  ChevronDown,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  Zap,
  Building2,
  Phone,
  Mail,
  Share2,
  Star,
  Download,
  Lock,
  Bell,
  MapPin,
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
import { format, startOfMonth, isWithinInterval, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LeadStatusBadge, getStatusOptions, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { LeadScoreBadge } from "@/components/provider/leads/LeadScoreBadge";
import { LeadDetailPanel, type Lead } from "@/components/provider/leads/LeadDetailPanel";
import { MobileLeadCard } from "@/components/provider/leads/MobileLeadCard";
import { LockedLeadCard } from "@/components/provider/leads/LockedLeadCard";
import { LockedLeadDetailPanel } from "@/components/provider/leads/LockedLeadDetailPanel";
import { calculateLeadScore } from "@/lib/leadScoring";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  LeadLimitReachedBanner, 
  LeadLimitWarningBanner 
} from "@/components/provider/LeadUsageIndicator";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { toast } from "sonner";
import { EmailLeadDialog } from "@/components/provider/leads/EmailLeadDialog";
import { LeadLimitUpgradeModal } from "@/components/provider/LeadLimitUpgradeModal";
import { useProviderData } from "@/hooks/useProviderData";
import { Card } from "@/components/ui/card";
import { exportLeadsToCSV } from "@/lib/csvExport";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

// Extended Lead type with facility info
interface LeadWithFacility extends Lead {
  facility_name?: string;
  facility_city?: string;
  facility_state?: string;
}

export default function ProviderLeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightLeadId = searchParams.get("highlight");
  
  const [selectedLead, setSelectedLead] = useState<LeadWithFacility | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailLead, setEmailLead] = useState<LeadWithFacility | null>(null);
  
  const queryClient = useQueryClient();
  const { facilities } = useProviderFacilities();
  const { data: subscription } = useSubscription();
  const { data: providerData } = useProviderData(facilities[0]?.id);
  const isMobile = useIsMobile();
  const currentPlan = subscription?.plan || "basic";
  const leadLimit = subscription?.lead_limit ?? 0;
  const monthlyLeadsUsed = providerData?.monthlyLeadsCount ?? 0;

  // Create facility lookup map for quick access
  const facilityMap = useMemo(() => {
    const map = new Map<string, { name: string; city: string; state: string }>();
    facilities.forEach(f => {
      map.set(f.id, { name: f.name, city: f.city, state: f.state });
    });
    return map;
  }, [facilities]);

  // Get all facility IDs for the provider
  const facilityIds = useMemo(() => facilities.map(f => f.id), [facilities]);

  // Swipe gestures for mobile navigation
  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile && selectedLead) return;
      if (isMobile && mobileView === 'list' && selectedLead) {
        setMobileView('detail');
      }
    },
    onSwipeRight: () => {
      if (isMobile && mobileView === 'detail') {
        setMobileView('list');
      }
    },
    threshold: 75,
  });

  // Handle lead selection on mobile
  const handleSelectLead = (lead: LeadWithFacility) => {
    setSelectedLead(lead);
    if (isMobile) {
      setMobileView('detail');
    }
  };

  // Handle back navigation on mobile
  const handleBackToList = () => {
    setMobileView('list');
  };

  // Fetch ALL leads across all facilities
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["provider-leads-all", facilityIds],
    queryFn: async (): Promise<LeadWithFacility[]> => {
      if (facilityIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Enrich leads with facility info
      return (data || []).map(lead => ({
        ...lead,
        facility_name: facilityMap.get(lead.facility_id)?.name,
        facility_city: facilityMap.get(lead.facility_id)?.city,
        facility_state: facilityMap.get(lead.facility_id)?.state,
      })) as LeadWithFacility[];
    },
    enabled: facilityIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes - leads update via realtime
    refetchOnMount: false,
  });

  // For Basic plan lifetime count
  const totalLeadsCount = leads.length;

  // Realtime subscription for ALL facilities
  useEffect(() => {
    if (facilityIds.length === 0) return;
    
    const channel = supabase
      .channel("leads-realtime-all")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as Lead;
          // Only process if it's one of our facilities
          if (facilityIds.includes(newLead.facility_id)) {
            queryClient.invalidateQueries({ queryKey: ["provider-leads-all"] });
            const facilityName = facilityMap.get(newLead.facility_id)?.name || "your facility";
            toast.success(`🎉 New Lead! ${newLead.name} submitted a request to ${facilityName}`);
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const updatedLead = payload.new as Lead;
          if (facilityIds.includes(updatedLead.facility_id)) {
            queryClient.invalidateQueries({ queryKey: ["provider-leads-all"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [facilityIds, facilityMap, queryClient]);

  // Sync selectedLead with leads data to reflect real-time updates
  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead && JSON.stringify(updatedLead) !== JSON.stringify(selectedLead)) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead]);

  // Auto-select highlighted lead from search results
  useEffect(() => {
    if (highlightLeadId && leads.length > 0 && !selectedLead) {
      const leadToHighlight = leads.find(l => l.id === highlightLeadId);
      if (leadToHighlight) {
        setSelectedLead(leadToHighlight);
        if (isMobile) {
          setMobileView('detail');
        }
        // Clear the highlight param after selecting
        setSearchParams({}, { replace: true });
      }
    }
  }, [highlightLeadId, leads, selectedLead, isMobile, setSearchParams]);
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
      // Urgency filter
      if (urgencyFilter !== "all" && lead.urgency !== urgencyFilter) return false;
      // Facility filter
      if (facilityFilter !== "all" && lead.facility_id !== facilityFilter) return false;
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
  }, [leads, searchQuery, statusFilter, sourceFilter, urgencyFilter, facilityFilter, dateRange, sortBy]);

  // Use qualified field for counting against cap (matches useProviderData logic)
  const thisMonthLeads = leads.filter(l => new Date(l.created_at) >= startOfMonth(new Date()));
  const thisMonthQualified = thisMonthLeads.filter(l => l.qualified === true);
  const clearFilters = () => { setSearchQuery(""); setStatusFilter("all"); setSourceFilter("all"); setUrgencyFilter("all"); setFacilityFilter("all"); setDateRange({ from: undefined, to: undefined }); };
  const hasFilters = searchQuery || statusFilter !== "all" || sourceFilter !== "all" || urgencyFilter !== "all" || facilityFilter !== "all" || dateRange.from || dateRange.to;

  // Status update mutation for mobile swipe actions
  const updateStatus = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: string; newStatus: LeadStatus }) => {
      const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(`Status changed to ${newStatus?.replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["provider-leads-all"] });
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Mobile action handlers
  const handleMobileCall = useCallback((lead: LeadWithFacility) => {
    window.location.href = `tel:${lead.phone}`;
    // Auto-update status to contacted if new
    if (lead.status === 'new') {
      updateStatus.mutate({ leadId: lead.id, newStatus: 'contacted' });
    }
  }, [updateStatus]);

  const handleMobileEmail = useCallback((lead: LeadWithFacility) => {
    setEmailLead(lead);
    setShowEmailDialog(true);
  }, []);

  const handleMobileMarkContacted = useCallback((lead: LeadWithFacility) => {
    const nextStatus: LeadStatus = lead.status === 'contacted' ? 'in_progress' : 'contacted';
    updateStatus.mutate({ leadId: lead.id, newStatus: nextStatus });
  }, [updateStatus]);

  // Basic plan: ALL leads are always locked/blurred to encourage upgrade
  const isLeadLocked = (lead: Lead, index: number) => {
    if (currentPlan === "basic") return true; // Always locked for basic plan
    // Check if over limit based on qualified leads
    if (lead.qualified === true) {
      return filteredLeads.slice(0, index).filter(l => l.qualified === true).length >= leadLimit;
    }
    return false;
  };

  // Determine if upgrade message should show
  const showUpgradeIndicator = currentPlan === "basic" || 
    (currentPlan === "professional" && thisMonthQualified.length >= leadLimit * 0.8);
  
  const isAtLimit = currentPlan === "basic" 
    ? true // Always show as at limit for basic to encourage upgrade
    : thisMonthQualified.length >= leadLimit;

  // CSV Export handler
  const handleExportCSV = useCallback(() => {
    if (filteredLeads.length === 0) {
      toast.error("No leads to export");
      return;
    }
    try {
      exportLeadsToCSV(filteredLeads);
      toast.success(`Exported ${filteredLeads.length} leads to CSV`);
    } catch (error) {
      toast.error("Failed to export leads");
      console.error("CSV export error:", error);
    }
  }, [filteredLeads]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col" {...swipeHandlers}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-background border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile back button */}
            {isMobile && mobileView === 'detail' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2 flex-shrink-0"
                onClick={handleBackToList}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
                {isMobile && mobileView === 'detail' ? 'Lead Details' : 'Lead Management'}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {isMobile && mobileView === 'detail' 
                  ? 'Swipe right to go back'
                  : isMobile && mobileView === 'list' && leads.length > 0 && currentPlan !== "basic"
                    ? 'Swipe cards for quick actions'
                    : currentPlan === "basic"
                      ? `${totalLeadsCount}/1 lifetime lead`
                      : `${leads.length} total • ${thisMonthQualified.length}/${leadLimit} qualified`
                }
              </p>
            </div>
          </div>
          
          {/* Right side - Export button and Upgrade Indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* CSV Export Button */}
            {(!isMobile || mobileView === 'list') && currentPlan !== "basic" && filteredLeads.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 text-xs h-8"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
            )}
            
            {/* Detailed Upgrade Indicator */}
            {showUpgradeIndicator && (!isMobile || mobileView === 'list') && (subscription?.plan !== "featured") && (
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg border",
                currentPlan === "basic"
                  ? "bg-primary/5 border-primary/20"
                  : isAtLimit
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
              )}>
                {/* Usage Info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={cn(
                      "h-3.5 w-3.5",
                      currentPlan === "basic" ? "text-primary" : isAtLimit ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                    )} />
                    <span className={cn(
                      "text-xs font-semibold",
                      currentPlan === "basic" ? "text-primary" : isAtLimit ? "text-destructive" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {currentPlan === "basic"
                        ? "Upgrade to view leads"
                        : isAtLimit 
                          ? "Limit reached!" 
                          : "Approaching limit"
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all rounded-full",
                          isAtLimit ? "bg-destructive" : currentPlan === "basic" ? "bg-primary" : "bg-amber-500"
                        )}
                        style={{ width: `${Math.min((currentPlan === "basic" ? 100 : thisMonthQualified.length / leadLimit * 100), 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {currentPlan === "basic" ? `${totalLeadsCount} waiting` : `${thisMonthQualified.length}/${leadLimit}`}
                    </span>
                  </div>
                </div>
                
                {/* Upgrade Button */}
                <Button 
                  size="sm" 
                  className={cn(
                    "h-7 px-2.5 text-xs gap-1.5",
                    isAtLimit && "animate-subtle-pulse"
                  )}
                  asChild
                >
                  <Link to="/provider/billing">
                    <Zap className="h-3 w-3" />
                    <span className="hidden sm:inline">Upgrade</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Usage Summary - Consistent with Dashboard */}
      {(!isMobile || mobileView === 'list') && currentPlan !== "basic" && (
        <div className="flex-shrink-0 px-4 md:px-6 pt-2">
          <Card className="p-3 bg-muted/30 border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Leads Used:</span>
                  <span className={cn(
                    "text-sm font-bold",
                    thisMonthQualified.length >= leadLimit ? "text-destructive" : "text-foreground"
                  )}>
                    {thisMonthQualified.length} / {leadLimit}
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {leadLimit - thisMonthQualified.length} remaining
                </span>
              </div>
              <Badge variant="outline" className={cn(
                "gap-1 text-xs",
                currentPlan === "featured" 
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400"
                  : "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400"
              )}>
                {currentPlan === "featured" ? (
                  <><Star className="h-3 w-3" /> Exclusive Leads</>
                ) : (
                  <><Share2 className="h-3 w-3" /> Shared (Max 2 Providers)</>
                )}
              </Badge>
            </div>
          </Card>
        </div>
      )}

      {/* Basic Plan Upgrade Banner */}
      {(!isMobile || mobileView === 'list') && currentPlan === "basic" && leads.length > 0 && (
        <div className="flex-shrink-0 px-4 md:px-6 pt-4">
          <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-amber-500/10 border-primary/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">
                      {leads.length} Lead{leads.length > 1 ? 's' : ''} Waiting for You!
                    </h3>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    People are interested in your facility. Upgrade to view their contact details and reach out.
                  </p>
                </div>
              </div>
              <Button asChild size="lg" className="gap-2 shadow-lg w-full sm:w-auto flex-shrink-0">
                <Link to="/provider/billing">
                  <Zap className="h-4 w-4" />
                  Unlock Leads - $399/mo
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Lead Limit Banners - Consistent with Dashboard */}
      {(!isMobile || mobileView === 'list') && currentPlan !== "basic" && (
        <div className="flex-shrink-0 px-4 md:px-6 pt-2 space-y-2">
          <LeadLimitReachedBanner 
            usedLeads={thisMonthQualified.length} 
            leadLimit={leadLimit} 
            plan={currentPlan as "basic" | "professional" | "featured"} 
          />
          <LeadLimitWarningBanner 
            usedLeads={thisMonthQualified.length} 
            leadLimit={leadLimit} 
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel - Lead List */}
        <div className={cn(
          "flex flex-col bg-background transition-all duration-300",
          // Desktop behavior
          !isMobile && selectedLead && "hidden md:flex w-[280px] lg:w-[320px] xl:w-[360px] border-r",
          !isMobile && !selectedLead && "flex-1 max-w-full md:max-w-2xl border-r",
          // Mobile behavior - full width, slide animation
          isMobile && mobileView === 'list' && "flex-1 w-full",
          isMobile && mobileView === 'detail' && "hidden"
        )}>
          {/* Mobile Quick Filters */}
          {isMobile && currentPlan !== "basic" && (
            <div className="flex-shrink-0 px-3 py-2 border-b bg-background overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-2 min-w-max">
                <button
                  onClick={() => { setStatusFilter("all"); setSourceFilter("all"); setUrgencyFilter("all"); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    statusFilter === "all" && sourceFilter === "all" && urgencyFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => { setStatusFilter("new"); setSourceFilter("all"); setUrgencyFilter("all"); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                    statusFilter === "new" && urgencyFilter === "all"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  New
                </button>
                <button
                  onClick={() => { setStatusFilter("all"); setSourceFilter("all"); setUrgencyFilter("immediate"); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                    urgencyFilter === "immediate"
                      ? "bg-red-500 text-white shadow-sm"
                      : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Urgent
                </button>
                <button
                  onClick={() => { setStatusFilter("all"); setSourceFilter("qualified"); setUrgencyFilter("all"); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                    sourceFilter === "qualified"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  Qualified
                </button>
                <button
                  onClick={() => { setStatusFilter("contacted"); setSourceFilter("all"); setUrgencyFilter("all"); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                    statusFilter === "contacted"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                  )}
                >
                  <Phone className="h-3 w-3" />
                  Contacted
                </button>
              </div>
            </div>
          )}

          {/* Filters Header */}
          <div className={cn("flex-shrink-0 border-b bg-muted/30", isMobile && "hidden")}>
            {/* Toggle Button */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="font-medium">Filters</span>
                {hasFilters && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    Active
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                filtersExpanded && "rotate-180"
              )} />
            </button>

            {/* Collapsible Filters */}
            <div className={cn(
              "overflow-hidden transition-all duration-200",
              filtersExpanded ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
            )}>
              <div className="p-3 pt-0 space-y-2">
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
                  {/* Facility Filter - only show if multiple facilities */}
                  {facilities.length > 1 && (
                    <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                      <SelectTrigger className={cn("w-[120px] h-9 text-xs", facilityFilter !== "all" && "border-primary text-primary")}>
                        <Building2 className="h-3.5 w-3.5 mr-1.5" />
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="all">All Locations</SelectItem>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            <span className="truncate max-w-[150px]">{f.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                  <p className="text-[11px] text-muted-foreground">
                    Showing {filteredLeads.length} of {leads.length} leads
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lead List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 relative">
            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
              </div>
            ) : currentPlan === "basic" && leads.length === 0 ? (
              // Basic plan - no leads yet, show upgrade CTA
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center max-w-md">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">Upgrade to View & Contact Leads</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your Basic Listing is live. Upgrade to Professional to view and contact leads directly.
                  </p>
                  <div className="space-y-3">
                    <Button asChild className="w-full">
                      <Link to="/provider/billing">
                        <Zap className="h-4 w-4 mr-2" />
                        Upgrade to Professional
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Up to 100 leads/month • Full contact info • Direct communication
                    </p>
                  </div>
                </div>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex items-center justify-center h-full p-8">
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
              <>
                {/* Basic Plan - Show locked lead cards instead of blur overlay */}
                <div className="space-y-3">
                  {filteredLeads.map((lead, idx) => {
                    const locked = isLeadLocked(lead, idx);
                    const selected = selectedLead?.id === lead.id;
                    const isQualified = lead.qualified === true;
                    // Determine exclusivity from lead data or plan default
                    const leadExclusivity = lead.exclusivity === 'exclusive' ? 'exclusive' 
                      : lead.exclusivity === 'shared' ? 'shared'
                      : currentPlan === "featured" ? "exclusive" 
                      : currentPlan === "professional" ? "shared" 
                      : null;
                    
                    // Basic plan: show locked lead cards
                    if (currentPlan === "basic") {
                      return (
                        <LockedLeadCard
                          key={lead.id}
                          leadId={lead.id}
                          name={lead.name}
                          createdAt={lead.created_at}
                          urgency={lead.urgency}
                          source={lead.source}
                          isSelected={selected}
                          onClick={() => handleSelectLead(lead)}
                        />
                      );
                    }
                    
                    // Use MobileLeadCard on mobile for swipe actions
                    if (isMobile) {
                      return (
                        <MobileLeadCard
                          key={lead.id}
                          lead={lead}
                          isSelected={selected}
                          isLocked={locked}
                          isQualified={isQualified}
                          showFacility={facilities.length > 1}
                          exclusivity={leadExclusivity}
                          onSelect={() => handleSelectLead(lead)}
                          onCall={() => handleMobileCall(lead)}
                          onEmail={() => handleMobileEmail(lead)}
                          onMarkContacted={() => handleMobileMarkContacted(lead)}
                        />
                      );
                    }
                    
                    // Desktop card - Professional redesign
                    const location = lead.location_city_state || (lead.location_zip ? `ZIP: ${lead.location_zip}` : null);
                    return (
                      <button
                        key={lead.id}
                        onClick={() => !locked && handleSelectLead(lead)}
                        disabled={locked}
                        className={cn(
                          "w-full text-left rounded-xl border transition-all duration-200 overflow-hidden",
                          selected 
                            ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20" 
                            : "border-border bg-card hover:border-primary/40 hover:shadow-md",
                          locked && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className="p-4">
                          {/* Top Row - Avatar, Name, Status */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Avatar */}
                              <div className={cn(
                                "h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold",
                                selected 
                                  ? "bg-primary text-primary-foreground" 
                                  : isQualified
                                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                                    : "bg-gradient-to-br from-slate-400 to-slate-500 text-white"
                              )}>
                                {locked ? "?" : lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              {/* Name and Location */}
                              <div className="min-w-0 flex-1">
                                <h4 className={cn(
                                  "font-semibold text-base truncate leading-tight",
                                  selected ? "text-primary" : "text-foreground"
                                )}>
                                  {locked ? "Hidden Lead" : lead.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {location && !locked && (
                                    <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Right side - Time and Status */}
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }).replace('about ', '')}
                              </span>
                              <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                            </div>
                          </div>

                          {/* Tags Row - Clean grid */}
                          {!locked && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Lead Type Badge - Primary indicator */}
                              {isQualified ? (
                                <Badge className="h-6 px-2.5 text-xs bg-emerald-500 text-white border-0 font-semibold">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Qualified
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="h-6 px-2.5 text-xs font-semibold">
                                  Direct
                                </Badge>
                              )}

                              {/* Urgency Badge */}
                              {lead.urgency === 'immediate' && (
                                <Badge className="h-6 px-2.5 text-xs bg-red-500 text-white border-0 font-semibold animate-pulse">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Urgent
                                </Badge>
                              )}
                              {lead.urgency === 'within-week' && (
                                <Badge className="h-6 px-2.5 text-xs bg-amber-500 text-white border-0 font-semibold">
                                  <Clock className="h-3 w-3 mr-1" />
                                  This Week
                                </Badge>
                              )}

                              {/* Exclusivity Badge */}
                              {leadExclusivity === "exclusive" && (
                                <Badge variant="outline" className="h-6 px-2.5 text-xs border-amber-300 bg-amber-50 text-amber-700 font-medium dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                  <Star className="h-3 w-3 mr-1" />
                                  Exclusive
                                </Badge>
                              )}
                              {leadExclusivity === "shared" && (
                                <Badge variant="outline" className="h-6 px-2.5 text-xs border-blue-300 bg-blue-50 text-blue-700 font-medium dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                  <Share2 className="h-3 w-3 mr-1" />
                                  Shared
                                </Badge>
                              )}

                              {/* Facility Badge - Multi-location */}
                              {facilities.length > 1 && lead.facility_name && (
                                <Badge variant="outline" className="h-6 px-2.5 text-xs border-primary/30 text-primary font-medium">
                                  <Building2 className="h-3 w-3 mr-1" />
                                  {lead.facility_name.length > 15 ? lead.facility_name.slice(0, 15) + "..." : lead.facility_name}
                                </Badge>
                              )}

                              {/* Verified & Message indicators */}
                              <div className="flex items-center gap-1.5 ml-auto">
                                {lead.email_verified && (
                                  <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center" title="Email verified">
                                    <ShieldCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                                  </div>
                                )}
                                {lead.message && (
                                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center" title="Has message">
                                    <MessageSquare className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                  </div>
                                )}
                                <LeadScoreBadge lead={lead} size="sm" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Detail */}
        <div className={cn(
          "flex-1 min-w-0 transition-all duration-300",
          // Desktop behavior
          !isMobile && selectedLead && "flex",
          !isMobile && !selectedLead && "hidden md:flex",
          // Mobile behavior
          isMobile && mobileView === 'detail' && "flex w-full",
          isMobile && mobileView === 'list' && "hidden"
        )}>
          {/* Show locked detail panel for basic users */}
          {currentPlan === "basic" ? (
            <LockedLeadDetailPanel 
              totalLeadsCount={totalLeadsCount}
              onClose={() => {
                if (isMobile) {
                  handleBackToList();
                } else {
                  setSelectedLead(null);
                }
              }}
            />
          ) : (
            <LeadDetailPanel 
              lead={selectedLead} 
              onClose={() => {
                if (isMobile) {
                  handleBackToList();
                } else {
                  setSelectedLead(null);
                }
              }}
              facilityName={selectedLead?.facility_name}
              exclusivity={
                selectedLead?.exclusivity === 'exclusive' ? 'exclusive'
                : selectedLead?.exclusivity === 'shared' ? 'shared'
                : currentPlan === "featured" ? "exclusive" 
                : currentPlan === "professional" ? "shared" 
                : null
              }
            />
          )}
        </div>
      </div>

      {/* Email Dialog for Mobile Swipe Actions */}
      {emailLead && (
        <EmailLeadDialog
          open={showEmailDialog}
          onOpenChange={(open) => {
            setShowEmailDialog(open);
            if (!open) setEmailLead(null);
          }}
          lead={emailLead}
        />
      )}

      {/* Lead Limit Upgrade Modal */}
      <LeadLimitUpgradeModal
        usedLeads={monthlyLeadsUsed}
        leadLimit={leadLimit}
        currentPlan={currentPlan}
      />
    </div>
  );
}
