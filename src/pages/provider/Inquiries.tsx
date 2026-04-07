import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Users, Search, X, ChevronLeft, ShieldCheck, Clock, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

import { InquiryListItem } from "@/components/provider/inquiries/InquiryListItem";
import { InquiryDetailPanel } from "@/components/provider/inquiries/InquiryDetailPanel";
import { InquiriesStatsHeader } from "@/components/provider/inquiries/InquiriesStatsHeader";
import type { InquiryType } from "@/components/provider/InquiryTypeBadge";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  facility_id: string;
  level_of_care: string | null;
  location_city_state: string | null;
  urgency: string | null;
  message: string | null;
  source: string | null;
  who_seeking_help: string | null;
  inquiry_type: InquiryType | null;
  provider_response_status: string | null;
  provider_responded_at: string | null;
  is_unlocked: boolean | null;
}

interface LeadWithFacility extends Lead {
  facility_name?: string;
  facility_city?: string;
  facility_state?: string;
}

export default function ProviderInquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightLeadId = searchParams.get("highlight");
  const statusParam = searchParams.get("status");
  
  const [selectedInquiry, setSelectedInquiry] = useState<LeadWithFacility | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(statusParam || "all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  
  const queryClient = useQueryClient();
  const { facilities } = useProviderFacilities();
  const isMobile = useIsMobile();

  // Sync status filter from URL param on mount
  useEffect(() => {
    if (statusParam && statusParam !== statusFilter) {
      setStatusFilter(statusParam);
      // Clear the URL param after applying
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("status");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  // Get all facility IDs
  const facilityIds = useMemo(() => facilities.map(f => f.id), [facilities]);

  // Create facility lookup map
  const facilityMap = useMemo(() => {
    const map = new Map<string, { name: string; city: string; state: string }>();
    facilities.forEach(f => {
      map.set(f.id, { name: f.name, city: f.city, state: f.state });
    });
    return map;
  }, [facilities]);

  // Fetch all inquiries using leads_provider_view (PII-safe: masks locked lead contact info)
  const { data: inquiries = [], isLoading, error: inquiriesError } = useQuery({
    queryKey: ["provider-inquiries", facilityIds],
    queryFn: async (): Promise<LeadWithFacility[]> => {
      if (facilityIds.length === 0) return [];
      
      const { data: allLeads, error } = await supabase
        .from("leads_provider_view")
        .select("id, facility_id, name, email, phone, status, created_at, urgency, level_of_care, source, location_city_state, location_zip, primary_substance, insurance_type, message, is_unlocked, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (allLeads || []).map(lead => ({
        ...lead,
        facility_name: facilityMap.get(lead.facility_id ?? "")?.name,
        facility_city: facilityMap.get(lead.facility_id ?? "")?.city,
        facility_state: facilityMap.get(lead.facility_id ?? "")?.state,
      })) as LeadWithFacility[];
    },
    enabled: facilityIds.length > 0,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Show error toast if query fails
  useEffect(() => {
    if (inquiriesError) {
      toast.error("Failed to load inquiries. Please try again.");
      console.error("[Inquiries] Query error:", inquiriesError);
    }
  }, [inquiriesError]);

  // Realtime subscription — listen for INSERT and UPDATE
  useEffect(() => {
    if (facilityIds.length === 0) return;
    
    const channel = supabase
      .channel("inquiries-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as Lead;
          if (facilityIds.includes(newLead.facility_id)) {
            queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
            toast.success(`🎉 New Inquiry from ${newLead.location_city_state || "Unknown Location"}`);
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const updatedLead = payload.new as Lead;
          if (facilityIds.includes(updatedLead.facility_id)) {
            queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
          }
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_unlocks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
          queryClient.invalidateQueries({ queryKey: ["provider-lead-unlocks"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [facilityIds, queryClient]);

  // Helper to check if a lead is unlocked
  const isLeadUnlocked = useCallback((leadId: string): boolean => {
    const inquiry = inquiries.find(i => i.id === leadId);
    return inquiry?.is_unlocked === true;
  }, [inquiries]);

  // Compute stats from all inquiries (unfiltered)
  const stats = useMemo(() => {
    const locked = inquiries.filter(i => !i.is_unlocked).length;
    const unlocked = inquiries.filter(i => i.is_unlocked && !i.provider_response_status).length;
    const contacted = inquiries.filter(i => i.provider_response_status === "contacted").length;
    const responded = inquiries.filter(i => i.provider_response_status === "responded").length;
    return { total: inquiries.length, locked, unlocked, contacted, responded };
  }, [inquiries]);

  // Filter inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(inquiry => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const locationMatch = inquiry.location_city_state?.toLowerCase().includes(q);
        const careMatch = inquiry.level_of_care?.toLowerCase().includes(q);
        const nameMatch = inquiry.name?.toLowerCase().includes(q);
        const facilityMatch = inquiry.facility_name?.toLowerCase().includes(q);
        if (!locationMatch && !careMatch && !nameMatch && !facilityMatch) return false;
      }
      
      if (statusFilter !== "all") {
        const unlocked = inquiry.is_unlocked === true;
        if (statusFilter === "new" && inquiry.status !== "new") return false;
        if (statusFilter === "locked" && unlocked) return false;
        if (statusFilter === "unlocked" && (!unlocked || inquiry.provider_response_status)) return false;
        if (statusFilter === "contacted" && inquiry.provider_response_status !== "contacted") return false;
        if (statusFilter === "responded" && inquiry.provider_response_status !== "responded") return false;
        if (statusFilter === "closed" && inquiry.provider_response_status !== "closed") return false;
      }
      
      if (facilityFilter !== "all" && inquiry.facility_id !== facilityFilter) return false;
      if (dateRange.from || dateRange.to) {
        const d = new Date(inquiry.created_at);
        if (dateRange.from && dateRange.to && !isWithinInterval(d, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
        if (dateRange.from && !dateRange.to && d < startOfDay(dateRange.from)) return false;
        if (dateRange.to && !dateRange.from && d > endOfDay(dateRange.to)) return false;
      }
      return true;
    });
  }, [inquiries, searchQuery, statusFilter, facilityFilter, dateRange]);


  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFacilityFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const hasFilters = searchQuery || statusFilter !== "all" || facilityFilter !== "all" || dateRange.from || dateRange.to;

  const handleSelectInquiry = (inquiry: LeadWithFacility) => {
    setSelectedInquiry(inquiry);
    if (isMobile) setMobileView('detail');
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedInquiry(null);
  };

  const handleUnlockSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
    queryClient.invalidateQueries({ queryKey: ["provider-lead-unlocks"] });
    queryClient.invalidateQueries({ queryKey: ["provider-credits"] });
  };

  // Auto-select first inquiry on desktop
  useEffect(() => {
    if (!isMobile && filteredInquiries.length > 0 && !selectedInquiry) {
      const toSelect = highlightLeadId 
        ? filteredInquiries.find(i => i.id === highlightLeadId) || filteredInquiries[0]
        : filteredInquiries[0];
      setSelectedInquiry(toSelect);
      // Clear highlight param after use
      if (highlightLeadId) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("highlight");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [filteredInquiries, isMobile, selectedInquiry, highlightLeadId]);

  // Keep selected inquiry updated
  useEffect(() => {
    if (selectedInquiry) {
      const updated = inquiries.find(i => i.id === selectedInquiry.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedInquiry)) {
        setSelectedInquiry(updated);
      }
    }
  }, [inquiries, selectedInquiry]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 border-b bg-card">
        <div className="flex items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 min-w-0">
            {isMobile && mobileView === 'detail' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 -ml-1 sm:-ml-2" onClick={handleBackToList}>
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                {isMobile && mobileView === 'detail' ? 'Lead Details' : 'Leads'}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Manage and respond to your leads
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Exclusive Leads Banner */}
      {(!isMobile || mobileView === 'list') && !isLoading && inquiries.length > 0 && (
        <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 border-b bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Your leads are exclusive</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  <Star className="h-3 w-3" />
                  Exclusive
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Each lead is sent only to your facility for 24 hours before redistribution if you don't contact the leads
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {(!isMobile || mobileView === 'list') && (
        <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 md:py-4 border-b bg-muted/30">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-xs md:max-w-sm">
              <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, location, care type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-9 h-8 sm:h-9 md:h-10 bg-background text-xs sm:text-sm"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 sm:h-9 bg-background text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="unlocked">Unlocked</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {facilities.length > 1 && (
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-9 bg-background text-xs sm:text-sm">
                  <SelectValue placeholder="Facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {facilities.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            )}

            {/* Results count */}
            {!isLoading && (
              <span className="text-xs sm:text-xs text-muted-foreground ml-auto whitespace-nowrap">
                {filteredInquiries.length === inquiries.length
                  ? `${inquiries.length} total`
                  : `${filteredInquiries.length} of ${inquiries.length}`
                }
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content - Split Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* List Panel */}
        {(!isMobile || mobileView === 'list') && (
          <div className={cn(
            "flex flex-col border-r bg-card overflow-hidden",
            isMobile ? "w-full" : "w-[320px] md:w-[360px] lg:w-[400px] flex-shrink-0"
          )}>
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 sm:h-24 w-full" />
                  ))}
                </div>
              ) : filteredInquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No inquiries found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {hasFilters 
                      ? "Try adjusting your filters to see more results."
                      : "When families submit inquiries to your facility, they'll appear here."
                    }
                  </p>
                  {hasFilters && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredInquiries.map((inquiry) => (
                  <InquiryListItem
                    key={inquiry.id}
                    inquiry={inquiry}
                    isUnlocked={inquiry.is_unlocked === true}
                    isSelected={selectedInquiry?.id === inquiry.id}
                    onClick={() => handleSelectInquiry(inquiry)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Detail Panel */}
        {(!isMobile || mobileView === 'detail') && (
          <div className="flex-1 overflow-hidden">
            {selectedInquiry ? (
              <InquiryDetailPanel
                inquiry={selectedInquiry}
                isUnlocked={selectedInquiry.is_unlocked === true}
                onUnlockSuccess={handleUnlockSuccess}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20">
                <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Select an inquiry
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Click on an inquiry from the list to view details and take action.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
