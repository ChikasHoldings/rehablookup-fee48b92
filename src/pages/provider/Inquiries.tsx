import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users, 
  Search,
  X,
  CalendarIcon,
  Clock,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  MapPin,
  Lock,
  Unlock,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  PhoneCall,
  XCircle,
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
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useLeadUnlocks } from "@/hooks/useLeadUnlocks";
import { useProviderCredits } from "@/hooks/useProviderCredits";
import { useProStatus } from "@/hooks/useProStatus";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { UnlockLeadButton } from "@/components/provider/UnlockLeadButton";
import { InquiryTypeBadge, type InquiryType } from "@/components/provider/InquiryTypeBadge";
import { maskLeadName, maskEmail, maskPhone } from "@/lib/leadMasking";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
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
}

interface LeadWithFacility extends Lead {
  facility_name?: string;
  facility_city?: string;
  facility_state?: string;
}

type ResponseStatus = 'pending' | 'contacted' | 'responded' | 'closed';

// Unlock price in cents
const UNLOCK_PRICE_CENTS = 2500; // $25

export default function ProviderInquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightLeadId = searchParams.get("highlight");
  
  const [selectedInquiry, setSelectedInquiry] = useState<LeadWithFacility | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  
  const queryClient = useQueryClient();
  const { facilities } = useProviderFacilities();
  const { isLeadUnlocked, refetch: refetchUnlocks } = useLeadUnlocks(facilities?.[0]?.id);
  const { balance } = useProviderCredits(facilities?.[0]?.id);
  const { data: proStatus } = useProStatus();
  const isMobile = useIsMobile();

  // Create facility lookup map
  const facilityMap = useMemo(() => {
    const map = new Map<string, { name: string; city: string; state: string }>();
    facilities.forEach(f => {
      map.set(f.id, { name: f.name, city: f.city, state: f.state });
    });
    return map;
  }, [facilities]);

  const facilityIds = useMemo(() => facilities.map(f => f.id), [facilities]);

  // Calculate final unlock price with Pro discount
  const getUnlockPrice = () => {
    if (proStatus?.isPro) {
      return Math.round(UNLOCK_PRICE_CENTS * (1 - proStatus.unlockDiscountPercent / 100));
    }
    return UNLOCK_PRICE_CENTS;
  };

  // Fetch all inquiries
  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["provider-inquiries", facilityIds],
    queryFn: async (): Promise<LeadWithFacility[]> => {
      if (facilityIds.length === 0) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(lead => ({
        ...lead,
        facility_name: facilityMap.get(lead.facility_id)?.name,
        facility_city: facilityMap.get(lead.facility_id)?.city,
        facility_state: facilityMap.get(lead.facility_id)?.state,
      })) as LeadWithFacility[];
    },
    enabled: facilityIds.length > 0,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Realtime subscription
  useEffect(() => {
    if (facilityIds.length === 0) return;
    
    const channel = supabase
      .channel("inquiries-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as Lead;
          if (facilityIds.includes(newLead.facility_id)) {
            queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
            const facilityName = facilityMap.get(newLead.facility_id)?.name || "your facility";
            toast.success(`🎉 New Inquiry from ${newLead.location_city_state || "Unknown Location"}`);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [facilityIds, facilityMap, queryClient]);

  // Filter inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter(inquiry => {
      // Search by location only (contact info is hidden for locked)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const locationMatch = inquiry.location_city_state?.toLowerCase().includes(q);
        const careMatch = inquiry.level_of_care?.toLowerCase().includes(q);
        if (!locationMatch && !careMatch) return false;
      }
      
      // Status filter based on unlock state and response status
      if (statusFilter !== "all") {
        const unlocked = isLeadUnlocked(inquiry.id);
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
  }, [inquiries, searchQuery, statusFilter, facilityFilter, dateRange, isLeadUnlocked]);

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

  const handleBackToList = () => setMobileView('list');

  // Update response status mutation
  const updateResponseStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: ResponseStatus }) => {
      const { error } = await supabase
        .from("leads")
        .update({
          provider_response_status: status,
          provider_responded_at: status !== 'pending' ? new Date().toISOString() : null,
        })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const getStatusDisplay = (inquiry: LeadWithFacility) => {
    const unlocked = isLeadUnlocked(inquiry.id);
    if (!unlocked) return { label: "Locked", color: "bg-muted text-muted-foreground" };
    
    const responseStatus = inquiry.provider_response_status || 'pending';
    switch (responseStatus) {
      case 'contacted':
        return { label: "Contacted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" };
      case 'responded':
        return { label: "Responded", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };
      case 'closed':
        return { label: "Closed", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" };
      default:
        return { label: "Unlocked", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 py-4 bg-background border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && mobileView === 'detail' && (
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={handleBackToList}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
                {isMobile && mobileView === 'detail' ? 'Inquiry Details' : 'Inquiries'}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {filteredInquiries.length} inquiries • Unlock to view contact details
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {(!isMobile || mobileView === 'list') && (
        <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b bg-muted/30">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by location, care type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="unlocked">Unlocked</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {facilities.length > 1 && (
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger className="w-[150px] h-9">
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
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <Skeleton className="h-24 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No inquiries yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              When families submit inquiries to your facility, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredInquiries.map((inquiry) => {
              const unlocked = isLeadUnlocked(inquiry.id);
              const status = getStatusDisplay(inquiry);
              const unlockPrice = getUnlockPrice();
              
              return (
                <Card 
                  key={inquiry.id} 
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:shadow-md",
                    !unlocked && "border-dashed"
                  )}
                  onClick={() => handleSelectInquiry(inquiry)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <InquiryTypeBadge type={inquiry.inquiry_type} />
                        {unlocked ? (
                          <Unlock className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", status.color)}>
                          {status.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Main Content */}
                      <div className="space-y-1.5">
                        {/* Location */}
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{inquiry.location_city_state || "Location not specified"}</span>
                        </div>

                        {/* Care Type & Urgency (visible always) */}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {inquiry.level_of_care && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {inquiry.level_of_care}
                            </span>
                          )}
                          {inquiry.urgency && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {inquiry.urgency}
                            </Badge>
                          )}
                        </div>

                        {/* Contact Info - Only if unlocked */}
                        {unlocked ? (
                          <>
                            <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t">
                              <span className="font-medium text-foreground">{inquiry.name}</span>
                              <a href={`tel:${inquiry.phone}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                <span>{inquiry.phone}</span>
                              </a>
                              <a href={`mailto:${inquiry.email}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span>{inquiry.email}</span>
                              </a>
                            </div>
                            
                            {/* Message preview if exists */}
                            {inquiry.message && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2 italic">
                                "{inquiry.message}"
                              </p>
                            )}
                            
                            {/* Response Status Buttons */}
                            <div className="flex items-center gap-2 mt-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant={inquiry.provider_response_status === 'contacted' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => updateResponseStatus.mutate({ leadId: inquiry.id, status: 'contacted' })}
                                disabled={updateResponseStatus.isPending}
                              >
                                <PhoneCall className="h-3 w-3" />
                                Contacted
                              </Button>
                              <Button
                                variant={inquiry.provider_response_status === 'responded' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => updateResponseStatus.mutate({ leadId: inquiry.id, status: 'responded' })}
                                disabled={updateResponseStatus.isPending}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Responded
                              </Button>
                              <Button
                                variant={inquiry.provider_response_status === 'closed' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => updateResponseStatus.mutate({ leadId: inquiry.id, status: 'closed' })}
                                disabled={updateResponseStatus.isPending}
                              >
                                <XCircle className="h-3 w-3" />
                                Close
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t text-sm text-muted-foreground">
                            <span className="font-medium">{maskLeadName(inquiry.name)}</span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {maskPhone(inquiry.phone)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {maskEmail(inquiry.email)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unlock Button */}
                    {!unlocked && (
                      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <UnlockLeadButton
                          leadId={inquiry.id}
                          facilityId={inquiry.facility_id}
                          inquiryType={inquiry.inquiry_type}
                          cityState={inquiry.location_city_state}
                          variant="compact"
                          onUnlockSuccess={() => {
                            refetchUnlocks();
                            queryClient.invalidateQueries({ queryKey: ["provider-inquiries"] });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
