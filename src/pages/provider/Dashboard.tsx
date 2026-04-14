import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  CreditCard,
  Building2,
  Eye,
  FileEdit,
  Phone,
  Mail,
  AlertTriangle,
  Lock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  X,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useProviderCredits } from "@/hooks/useProviderCredits";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, isPast, format } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { LeadDetailDrawer } from "@/components/provider/leads/LeadDetailDrawer";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { cn } from "@/lib/utils";
import { LeadConversionWidget } from "@/components/provider/LeadConversionWidget";
import { ProBenefitsWidget } from "@/components/provider/ProBenefitsWidget";
import { ProMultiFacilityOverview } from "@/components/provider/ProMultiFacilityOverview";
import { ProROIWidget } from "@/components/provider/ProROIWidget";
import { Lead } from "@/components/provider/leads/LeadDetailPanel";
import { ProviderWelcomeModal } from "@/components/provider/ProviderWelcomeModal";
import { ListingPreviewModal } from "@/components/provider/listing/ListingPreviewModal";
import { ProviderPerformanceFeedback } from "@/components/provider/ProviderPerformanceFeedback";
import { DashboardTopBar } from "@/components/provider/DashboardTopBar";
import { DashboardKPIStrip } from "@/components/provider/DashboardKPIStrip";

// Compact Metric Card
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconBg, 
  iconColor,
  action,
  isLoading
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  action?: { label: string; href: string };
  isLoading?: boolean;
}) {
  return (
    <Card className="border-border/40 hover:border-border/60 transition-colors">
      <CardContent className="p-2.5 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-4 w-4 sm:h-[18px] sm:w-[18px]", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            {isLoading ? (
              <Skeleton className="h-5 sm:h-6 w-10 sm:w-12 mt-0.5" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-foreground leading-tight tabular-nums">{value}</p>
            )}
            {subtitle && <p className="text-xs sm:text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          {action && (
            <Button variant="ghost" size="sm" className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs sm:text-xs hidden sm:flex" asChild>
              <Link to={action.href}>
                {action.label}
                <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-0.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Mask name helper (e.g., "John Smith" -> "John S.")
const maskName = (name: string): string => {
  if (!name) return "Verified User";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
};

export default function ProviderDashboardPage() {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  
  const { data: providerData, isLoading } = useProviderData(facilityId);
  const { facilities } = useProviderFacilities();
  const { data: creditsData, isLoading: creditsLoading } = useProviderCredits(facilityId);
  const { limit: locationLimit, used: usedLocations, planTier, isLoading: proLoading } = useFacilityLimits();
  const proStatus = { isPro: planTier === "pro" };
  
  const facility = selectedFacility || providerData?.facility;
  const profile = providerData?.profile;
  const viewsCount = providerData?.viewsCount ?? 0;
  const userName = profile?.first_name || "";
  const facilityIds = facilities?.map(f => f.id) ?? [];

  // Welcome modal - show for first-time providers (check for falsy value since null = not yet celebrated)
  const showWelcomeModal = providerData?.facility && !providerData.facility.profile_completion_celebrated;

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [profilePromptDismissedFields, setProfilePromptDismissedFields] = useState<string | null>(() => {
    if (!facilityId) return null;
    return localStorage.getItem(`profile-prompt-dismissed-${facilityId}`);
  });

  useEffect(() => {
    if (facilityId) {
      setProfilePromptDismissedFields(localStorage.getItem(`profile-prompt-dismissed-${facilityId}`));
    }
  }, [facilityId]);

  // Fetch recent leads using PII-safe view (masks locked lead contact info at DB level)
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["recent-leads", facilityId],
    queryFn: async (): Promise<Lead[]> => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("leads_provider_view")
        .select("id, facility_id, name, email, phone, status, created_at, urgency, level_of_care, source, location_city_state, location_zip, primary_substance, insurance_type, message, is_unlocked, inquiry_type, who_seeking_help, provider_response_status, provider_responded_at, preferred_contact, snooze_until")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Fetch unlocked lead IDs for the current facility
  const { data: unlockedLeadIds = new Set<string>() } = useQuery({
    queryKey: ["unlocked-lead-ids", facilityId],
    queryFn: async (): Promise<Set<string>> => {
      if (!facilityId) return new Set();
      const { data, error } = await supabase
        .from("lead_unlocks")
        .select("lead_id")
        .eq("facility_id", facilityId);
      if (error) throw error;
      return new Set((data || []).map(u => u.lead_id));
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch total leads count via secure DB function (bypasses RLS unlock restriction for accurate counts)
  const { data: totalLeadsCount = 0 } = useQuery({
    queryKey: ["total-leads-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { data, error } = await supabase.rpc("get_facility_leads_count", { p_facility_id: facilityId });
      if (error) throw error;
      return Number(data?.[0]?.total_count) || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
  });

  // Fetch services count for profile completion
  const { data: servicesCount = 0 } = useQuery({
    queryKey: ["services-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { count, error } = await supabase
        .from("facility_services")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

  // Fetch insurance count for profile completion
  const { data: insuranceCount = 0 } = useQuery({
    queryKey: ["insurance-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { count, error } = await supabase
        .from("facility_insurance")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

  // Compute missing fields
  const computeMissingFields = () => {
    if (!providerData?.facility) return [];
    const f = providerData.facility;
    const missing: string[] = [];
    if (!f.description) missing.push("description");
    if (!f.phone) missing.push("phone");
    if (!f.address || !f.city || !f.state || !f.zip_code) missing.push("address");
    if (!f.logo_url) missing.push("logo");
    if (!f.gallery_urls || f.gallery_urls.length === 0) missing.push("photos");
    if (servicesCount === 0) missing.push("services");
    if (insuranceCount === 0) missing.push("insurance");
    return missing.sort();
  };

  const handleDismissProfilePrompt = (e: React.MouseEvent, missingFields: string[]) => {
    e.preventDefault();
    e.stopPropagation();
    if (facilityId) {
      const fieldsKey = missingFields.sort().join(",");
      localStorage.setItem(`profile-prompt-dismissed-${facilityId}`, fieldsKey);
      setProfilePromptDismissedFields(fieldsKey);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!facilityId) return;
    
    const leadsChannel = supabase
      .channel(`dashboard-leads-${facilityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["recent-leads", facilityId] });
          queryClient.invalidateQueries({ queryKey: ["total-leads-count", facilityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
    };
  }, [facilityId, queryClient]);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { 
          label: "Live", 
          icon: CheckCircle, 
          bgClass: "bg-success/10",
          textClass: "text-success",
          dotClass: "bg-success"
        };
      case "pending":
        return { 
          label: "Under Review", 
          icon: Clock, 
          bgClass: "bg-warning/10",
          textClass: "text-warning",
          dotClass: "bg-warning"
        };
      default:
        return { 
          label: "Not Listed", 
          icon: AlertCircle, 
          bgClass: "bg-muted",
          textClass: "text-muted-foreground",
          dotClass: "bg-muted-foreground"
        };
    }
  };

  const statusConfig = facility ? getStatusConfig(facility.status) : getStatusConfig("inactive");
  const StatusIcon = statusConfig.icon;
  const profileUrl = facility?.slug ? `/center/${facility.slug}` : facility?.id ? `/rehab-centers/${facility.id}` : null;

  // Calculate leads awaiting follow-up
  const now = new Date();
  const leadsAwaitingFollowup = recentLeads.filter(lead => {
    if (lead.status !== 'new') return false;
    const hoursSinceCreated = differenceInHours(now, new Date(lead.created_at));
    return hoursSinceCreated >= 24;
  });
  
  const snoozedLeads = leadsAwaitingFollowup.filter(
    lead => lead.snooze_until && !isPast(new Date(lead.snooze_until))
  );
  const urgentLeads = leadsAwaitingFollowup.filter(
    lead => !lead.snooze_until || isPast(new Date(lead.snooze_until))
  );

  return (
    <div className="min-h-full bg-background">
      {/* Welcome Modal for New Providers */}
      {showWelcomeModal && providerData?.facility && (
        <ProviderWelcomeModal
          facilityId={providerData.facility.id}
          facilityName={providerData.facility.name}
          isFirstLogin={true}
          onDismiss={() => {
            queryClient.invalidateQueries({ queryKey: ["provider-data"] });
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        
        {/* Main Grid Layout - No full-width sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-5">
          
          {/* Left Column - Header & Main Content */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4 md:space-y-5">
            
            {/* Header Card */}
            <Card>
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
                  <div className="space-y-1">
                    <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">
                      {format(new Date(), "EEEE, MMM d")}
                    </p>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                      {userName ? `Welcome, ${userName}` : "Dashboard"}
                    </h1>
                    {facility && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{facility.name}</span>
                        {facility.status === "approved" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 px-1.5 py-0.5 rounded">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            Live
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {facility && profileUrl && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setPreviewOpen(true)}>
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                      </Button>
                      <Button size="sm" className="h-8 text-xs gap-1.5" asChild>
                        <Link to="/provider/listings">
                          <FileEdit className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Bar - Credits, Warnings, Pro Status */}
            <DashboardTopBar
              balanceCents={creditsData?.balance_cents ?? 0}
              isPro={proStatus.isPro}
              isLoading={creditsLoading || proLoading}
              discountPercent={proStatus.isPro ? 20 : 0}
            />

            {/* Primary KPI Strip */}
            {facilityId && (
              <DashboardKPIStrip
                facilityId={facilityId}
                isPro={proStatus.isPro}
              />
            )}

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              <MetricCard
                title="Views"
                value={viewsCount}
                subtitle="Last 30 days"
                icon={Eye}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                isLoading={isLoading}
              />
              <MetricCard
                title="Inquiries"
                value={totalLeadsCount}
                subtitle={totalLeadsCount > 0 ? `${recentLeads.filter(l => l.status === 'new').length} new` : "No inquiries yet"}
                icon={TrendingUp}
                iconBg="bg-success/10"
                iconColor="text-success"
                action={totalLeadsCount > 0 ? { label: "View", href: "/provider/inquiries" } : undefined}
                isLoading={leadsLoading}
              />
            </div>

            {/* Recent Leads Card */}
            <Card>
              <CardHeader className="p-3 sm:p-4 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Recent Leads</CardTitle>
                  </div>
                  {recentLeads.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" asChild>
                      <Link to="/provider/inquiries">
                        View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {leadsLoading ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-2 w-28" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentLeads.length === 0 ? (
                  <div className="text-center py-6 px-4">
                    <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No leads yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Leads appear when families reach out</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {recentLeads.slice(0, 4).map((lead, index) => {
                      const isUnlocked = unlockedLeadIds.has(lead.id);
                      // View data is already masked/unmasked at DB level
                      const displayName = lead.name;
                      const displayContact = isUnlocked 
                        ? (lead.preferred_contact === "call" ? lead.phone : lead.email)
                        : "••••••••••";
                      
                      return (
                        <button
                          key={lead.id}
                          onClick={() => handleLeadClick(lead)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left",
                            index === 0 && lead.status === 'new' && "bg-primary/[0.02]"
                          )}
                        >
                          <div className="relative">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              {isUnlocked ? (
                                <span className="text-xs font-bold text-primary">
                                  {lead.name.charAt(0).toUpperCase()}
                                </span>
                              ) : (
                                <Lock className="h-3.5 w-3.5 text-primary" />
                              )}
                            </div>
                            {index === 0 && lead.status === 'new' && (
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full border-2 border-background" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                              <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                              {!isUnlocked && (
                                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                                  <Lock className="h-2.5 w-2.5" />
                                  Locked
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              {lead.preferred_contact === "call" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                              <span className="truncate">{displayContact}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Conversion Widget */}
            {facilityIds.length > 0 && (
              <LeadConversionWidget facilityIds={facilityIds} />
            )}

            {/* Multi-Facility Overview (Pro only) */}
            {proStatus?.isPro && facilities && facilities.length > 1 && (
              <ProMultiFacilityOverview facilities={facilities} />
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">
            
            {/* Alerts */}
            <div className="space-y-2.5">
              {/* Locked Inquiries Alert */}
              {totalLeadsCount > 0 && (
                <Card className="border-success/30 bg-success/5">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white tabular-nums">{totalLeadsCount}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          <span className="tabular-nums">{totalLeadsCount}</span> Inquir{totalLeadsCount !== 1 ? 'ies' : 'y'} Available
                        </p>
                        <p className="text-xs text-muted-foreground">Unlock to view details</p>
                      </div>
                      <Button size="sm" className="h-7 text-xs bg-success hover:bg-success/90" asChild>
                        <Link to="/provider/inquiries">
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Urgent Leads Alert */}
              {urgentLeads.length > 0 && (
                <Card className="border-l-2 border-l-warning">
                  <CardContent className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          <span className="tabular-nums">{urgentLeads.length}</span> Need Follow-up
                        </p>
                        <p className="text-xs text-muted-foreground">Waiting 24h+</p>
                      </div>
                      <Button size="sm" className="h-7 text-xs bg-warning hover:bg-warning/90 text-warning-foreground" asChild>
                        <Link to="/provider/inquiries?status=new">
                          <Phone className="h-3.5 w-3.5 mr-1" />
                          Call
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Profile Completion */}
              {providerData?.facility && (() => {
                const missingFields = computeMissingFields();
                if (missingFields.length === 0) return null;
                const currentFieldsKey = missingFields.join(",");
                if (profilePromptDismissedFields === currentFieldsKey) return null;
                
                return (
                  <Card className="border-dashed border-primary/30 bg-primary/5">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileEdit className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Complete Profile</p>
                          <p className="text-xs text-muted-foreground">{missingFields.length} items missing</p>
                        </div>
                        <Button size="sm" className="h-7 text-xs" asChild>
                          <Link to="/provider/listings">Add</Link>
                        </Button>
                        <button
                          onClick={(e) => handleDismissProfilePrompt(e, missingFields)}
                          className="p-1.5 hover:bg-muted/50 rounded text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Status Banner */}
              {facility?.status !== "approved" && (
                <Card className={cn("border-l-2", statusConfig.dotClass === 'bg-warning' ? "border-l-warning" : "border-l-muted-foreground")}>
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", statusConfig.bgClass)}>
                      <StatusIcon className={cn("h-4 w-4", statusConfig.textClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-sm font-medium", statusConfig.textClass)}>{statusConfig.label}</span>
                      {facility?.status === "pending" && (
                        <p className="text-xs text-muted-foreground">Review: 24-48h</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Performance Feedback Loop */}
            {facilityId && <ProviderPerformanceFeedback facilityId={facilityId} />}

            {/* Pro Benefits Widget */}
            <ProBenefitsWidget />

            {/* Quick Actions */}
            <Card>
              <CardHeader className="p-3.5 pb-2.5 border-b">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/listings">
                      <FileEdit className="h-3.5 w-3.5 mr-2" />
                      Listing
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/inquiries">
                      <Users className="h-3.5 w-3.5 mr-2" />
                      Inquiries
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/analytics">
                      <TrendingUp className="h-3.5 w-3.5 mr-2" />
                      Analytics
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/billing">
                      <CreditCard className="h-3.5 w-3.5 mr-2" />
                      Billing
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Credit Balance Card */}
            <Card>
              <CardHeader className="p-3.5 pb-2.5 border-b">
                <CardTitle className="text-sm font-semibold">Credit Balance</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground tabular-nums">
                      {creditsLoading ? (
                        <Skeleton className="h-7 w-16" />
                      ) : (
                        `$${((creditsData?.balance_cents || 0) / 100).toFixed(2)}`
                      )}
                    </span>
                    <Button size="sm" className="h-7 text-xs" asChild>
                      <Link to="/provider/billing">
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Add Credits
                      </Link>
                    </Button>
                  </div>
                  {proStatus?.isPro && (
                    <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 px-2 py-1 rounded">
                      <Sparkles className="h-3 w-3" />
                      <span className="font-medium">Pro Member — 20% off unlocks</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ROI Widget (Pro only) */}
            {proStatus?.isPro && !creditsLoading && (
              <ProROIWidget
                transactions={creditsData?.transactions ?? []}
                balanceCents={creditsData?.balance_cents ?? 0}
                isPro={true}
              />
            )}

            {/* Pro Status / Upgrade CTA */}
            {!proStatus?.isPro && (
              <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Upgrade to Pro</p>
                      <p className="text-xs text-muted-foreground">20% off unlocks + featured placement</p>
                    </div>
                    <Button size="sm" className="h-7 text-xs bg-accent hover:bg-accent/90" asChild>
                      <Link to="/provider/pro-upgrade">
                        Upgrade
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Featured Analytics Widget - if Pro */}
            {proStatus?.isPro && facility?.id && (
              <FeaturedAnalyticsWidget facilityId={facility.id} />
            )}
          </div>

          {/* Getting Started - No facility (spans both columns) */}
          {!facility && (
            <div className="lg:col-span-12">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">Complete your listing</p>
                        <p className="text-sm text-muted-foreground">Add facility info to start receiving leads</p>
                      </div>
                    </div>
                    <Button size="sm" className="h-9 text-sm" asChild>
                      <Link to="/provider/listings">
                        Get Started <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Lead Detail Drawer */}
        <LeadDetailDrawer
          lead={selectedLead}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>

      {/* Preview Modal */}
      {facility?.slug && (
        <ListingPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          facilityName={facility.name}
          facilitySlug={facility.slug}
        />
      )}
    </div>
  );
}
