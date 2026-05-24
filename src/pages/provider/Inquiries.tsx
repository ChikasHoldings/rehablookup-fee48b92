import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Users, Search, X, ChevronLeft, Inbox, ShieldCheck, MailQuestion, AlertCircle } from "lucide-react";
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
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import { fromLeadsProviderView } from "@/lib/leadsProviderView";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

import { InquiryListItem } from "@/components/provider/inquiries/InquiryListItem";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";
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
  location_zip: string | null;
  urgency: string | null;
  message: string | null;
  source: string | null;
  who_seeking_help: string | null;
  inquiry_type: InquiryType | null;
  provider_response_status: string | null;
  provider_responded_at: string | null;
  provider_response_notes: string | null;
  insurance_type: string | null;
  insurance_provider: string | null;
  primary_substance: string[] | null;
  age_range: string | null;
  gender: string | null;
  preferred_contact: string | null;
  relationship_to_patient: string | null;
  budget_preference: string | null;
  dual_diagnosis: string | null;
  previous_treatment: string | null;
  previous_treatment_details: string | null;
  readiness_level: string | null;
  best_time_to_call: string | null;
  co_occurring_conditions: string[] | null;
  special_needs: string[] | null;
}

interface LeadWithFacility extends Lead {
  facility_name?: string;
  facility_city?: string;
  facility_state?: string;
}

export default function ProviderInquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightLeadId = searchParams.get("highlight") || searchParams.get("lead");
  const statusParam = searchParams.get("status");
  
  const [selectedInquiry, setSelectedInquiry] = useState<LeadWithFacility | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Debounce the search input so typing in the box doesn't re-filter the
  // entire client-side list on every keystroke (perceivable jank at
  // 1000+ leads). 200ms is fast enough to feel instant while skipping
  // the work for partial words.
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional run-once effect on mount; reads URL params to seed state
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
      
      const { data: allLeads, error } = await fromLeadsProviderView()
        .select("id, facility_id, name, email, phone, status, created_at, urgency, level_of_care, source, location_city_state, location_zip, primary_substance, insurance_type, insurance_provider, message, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at, provider_response_notes, age_range, gender, preferred_contact, relationship_to_patient, budget_preference, dual_diagnosis, previous_treatment, previous_treatment_details, readiness_level, best_time_to_call, co_occurring_conditions, special_needs")
        // BUGFIX: Always filter to the provider's own facilities. Without this .in() filter,
        // the query relied solely on RLS which is correct but sends all matching rows with no
        // server-side pagination — potentially thousands of rows for large providers.
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false })
        .limit(2000);
      
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
    retry: 2,
  });

  // Show error toast if query fails
  useEffect(() => {
    if (inquiriesError) {
      toast.error("Failed to load inquiries. Please try again.");
      console.error("[Inquiries] Query error:", inquiriesError);
    }
  }, [inquiriesError]);

  // Poll for new leads every 30 seconds (Realtime disabled for PII
  // safety). Skip the round-trip when the tab is hidden.
  useEffect(() => {
    if (facilityIds.length === 0) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      queryClient.invalidateQueries({ queryKey: ["provider-inquiries", facilityIds] });
    }, 30000);
    return () => clearInterval(interval);
  }, [facilityIds, queryClient]);

  // Stats: every lead delivered to the provider is fully accessible (the
  // credit-based lock/unlock model is retired). "new" = no response logged yet.
  const stats = useMemo(() => {
    const newCount = inquiries.filter(i => !i.provider_response_status).length;
    const contacted = inquiries.filter(i => i.provider_response_status === "contacted").length;
    const responded = inquiries.filter(i => i.provider_response_status === "responded").length;
    return { total: inquiries.length, new: newCount, contacted, responded };
  }, [inquiries]);

  // Filter inquiries (uses the debounced search query so re-filtering
  // only happens after the user pauses typing).
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(inquiry => {
      if (debouncedSearchQuery) {
        const q = debouncedSearchQuery.toLowerCase();
        const locationMatch = inquiry.location_city_state?.toLowerCase().includes(q);
        const careMatch = inquiry.level_of_care?.toLowerCase().includes(q);
        const nameMatch = inquiry.name?.toLowerCase().includes(q);
        const facilityMatch = inquiry.facility_name?.toLowerCase().includes(q);
        if (!locationMatch && !careMatch && !nameMatch && !facilityMatch) return false;
      }

      if (statusFilter !== "all") {
        if (statusFilter === "new" && inquiry.provider_response_status) return false;
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
  }, [inquiries, debouncedSearchQuery, statusFilter, facilityFilter, dateRange]);

  // Pagination over filtered inquiries (numbered, persisted page size).
  const {
    page,
    pageSize,
    totalPages,
    paginate,
    setPage,
    setPageSize,
    reset: resetPage,
  } = usePagination({
    tableId: "provider-inquiries",
    defaultPageSize: 25,
    totalItems: filteredInquiries.length,
  });
  const visibleInquiries = paginate(filteredInquiries);

  // Reset to page 1 when any inquiry filter changes. Use the debounced
  // search value so we don't reset on every keystroke mid-typing.
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, statusFilter, facilityFilter, dateRange.from, dateRange.to]);


  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setFacilityFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const hasFilters = debouncedSearchQuery || statusFilter !== "all" || facilityFilter !== "all" || dateRange.from || dateRange.to;

  const handleSelectInquiry = (inquiry: LeadWithFacility) => {
    setSelectedInquiry(inquiry);
    if (isMobile) setMobileView('detail');
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedInquiry(null);
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
        newParams.delete("lead");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [filteredInquiries, isMobile, selectedInquiry, highlightLeadId, searchParams, setSearchParams]);

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
    <div className="flex h-full flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0">
        <ProviderPageHeader
          title={isMobile && mobileView === 'detail' ? 'Lead details' : 'Leads'}
          description="Manage and respond to inquiries from families looking for care."
          icon={<Users className="h-4 w-4" />}
          actions={
            isMobile && mobileView === 'detail' ? (
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : null
          }
        />
      </div>

      {/* Stats */}
      {(!isMobile || mobileView === 'list') && !isLoading && inquiries.length > 0 && (
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 lg:px-8">
          <InquiriesStatsHeader
            total={stats.total}
            new={stats.new}
            contacted={stats.contacted}
            responded={stats.responded}
          />
        </div>
      )}


      {/* Filters */}
      {(!isMobile || mobileView === 'list') && (
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-3.5 lg:px-8">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
            <div className="relative min-w-[160px] max-w-xs flex-1 sm:min-w-[200px] md:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 sm:left-3 sm:h-4 sm:w-4" />
              <Input
                placeholder="Search by name, location, care type…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-slate-200 bg-slate-50 pl-8 text-xs sm:h-9 sm:pl-9 sm:text-sm md:h-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[100px] border-slate-200 bg-slate-50 text-xs sm:h-9 sm:w-[130px] sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {facilities.length > 1 && (
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger className="h-8 w-[120px] border-slate-200 bg-slate-50 text-xs sm:h-9 sm:w-[150px] sm:text-sm">
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
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-slate-600 hover:bg-slate-100 sm:h-9 sm:px-3 sm:text-sm">
                <X className="mr-0.5 h-3.5 w-3.5 sm:mr-1 sm:h-4 sm:w-4" />
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
      <div className="flex flex-1 overflow-hidden">
        {/* List Panel */}
        {(!isMobile || mobileView === 'list') && (
          <div className={cn(
            "flex flex-col overflow-hidden border-r border-slate-200 bg-white",
            isMobile ? "w-full" : "w-[320px] flex-shrink-0 md:w-[360px] lg:w-[400px]"
          )}>
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                // Render the same number of skeleton rows as the user's
                // persisted page size, so the visible list height
                // matches what they'll see post-load (no jarring jump).
                // Capped at 8 to keep the initial paint quick.
                <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3" aria-busy="true" aria-label="Loading inquiries">
                  {Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg border bg-card p-3 sm:p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-3.5 rounded-full" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <Skeleton className="h-3 w-24" />
                      <div className="flex items-center justify-between pt-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-xs text-muted-foreground pt-2">
                    Loading your leads…
                  </p>
                </div>
              ) : inquiriesError ? (
                <div className="flex flex-col items-center justify-center py-10 sm:py-14 px-4 text-center">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" aria-hidden />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
                    Couldn't load your inquiries
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-5">
                    There was a problem reaching the inquiries service.
                    Your inquiries are still saved; this is just a display issue.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </Button>
                </div>
              ) : filteredInquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 sm:py-14 px-4 text-center">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    {hasFilters ? (
                      <Search className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    ) : (
                      <Inbox className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
                    {hasFilters
                      ? "No matching inquiries"
                      : facilityIds.length === 0
                        ? "No facility yet"
                        : "No leads yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-5">
                    {hasFilters
                      ? "Try adjusting your search or filters to see more results."
                      : facilityIds.length === 0
                        ? "You don't have any facilities yet. Add a listing to start receiving leads."
                        : "When a family submits an inquiry to one of your listings, it will appear here with full contact details so you can respond right away."}
                  </p>

                  {hasFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1.5" />
                      Clear filters
                    </Button>
                  ) : facilityIds.length === 0 ? (
                    <Button asChild size="sm">
                      <Link to="/provider/listings?new=1">Create your first listing</Link>
                    </Button>
                  ) : (
                    <div className="w-full max-w-sm rounded-lg border bg-muted/30 p-4 text-left space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        How leads work
                      </p>
                      <div className="flex items-start gap-3">
                        <div className="h-7 w-7 rounded-full bg-background border flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="text-xs sm:text-sm">
                          <p className="font-medium text-foreground">Respond fast to win</p>
                          <p className="text-muted-foreground">
                            Reach out within 10 minutes for the best conversion rates.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {visibleInquiries.map((inquiry) => (
                    <InquiryListItem
                      key={inquiry.id}
                      inquiry={inquiry}
                      isSelected={selectedInquiry?.id === inquiry.id}
                      onClick={() => handleSelectInquiry(inquiry)}
                    />
                  ))}
                  {filteredInquiries.length > pageSize && (
                    <div className="px-3 sm:px-4">
                      <PaginationFooter
                        page={page}
                        pageSize={pageSize}
                        totalPages={totalPages}
                        totalItems={filteredInquiries.length}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                        itemLabel="lead"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Detail Panel */}
        {(!isMobile || mobileView === 'detail') && (
          <div className="flex-1 overflow-hidden bg-slate-50">
            {selectedInquiry ? (
              <InquiryDetailPanel inquiry={selectedInquiry} />
            ) : isLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            ) : inquiries.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <MailQuestion className="h-7 w-7 text-slate-500" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-slate-900">
                  Your inbox is ready
                </h3>
                <p className="max-w-md text-[13px] text-slate-600">
                  New family inquiries will land here automatically with full contact details so you can respond right away.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Users className="mb-4 h-14 w-14 text-slate-300" />
                <h3 className="mb-1.5 text-base font-semibold text-slate-700">
                  Select an inquiry
                </h3>
                <p className="max-w-sm text-[13px] text-slate-500">
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
