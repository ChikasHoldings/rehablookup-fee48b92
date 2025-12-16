import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  CreditCard,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Eye,
  FileEdit,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  BellOff,
  MapPin,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, differenceInHours, isPast } from "date-fns";
import { 
  LeadUsageIndicator, 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner 
} from "@/components/provider/LeadUsageIndicator";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { LeadDetailDrawer } from "@/components/provider/leads/LeadDetailDrawer";
import { OnboardingChecklist } from "@/components/provider/OnboardingChecklist";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  status: string;
  created_at: string;
  preferred_contact: string;
  facility_id: string;
  source: string | null;
  email_verified: boolean | null;
  snooze_until: string | null;
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

export default function ProviderDashboardPage() {
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  
  const { data: providerData, isLoading } = useProviderData(facilityId);
  const { data: subscription } = useSubscription();
  const { facilities } = useProviderFacilities();
  
  const facility = selectedFacility || providerData?.facility;
  const profile = providerData?.profile;
  const viewsCount = providerData?.viewsCount ?? 0;
  const monthlyLeadsCount = providerData?.monthlyLeadsCount ?? 0;
  const userName = profile?.first_name || "";
  
  // Get lead limit from subscription data
  const leadLimit = subscription?.lead_limit ?? 5;
  
  // Get location limit based on plan
  const planKey = subscription?.plan || "basic";
  const locationLimit = PLAN_DETAILS[planKey]?.location_limit ?? 1;
  const usedLocations = facilities?.length ?? 0;

  // State for lead detail drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // State for dismissible contact hidden warning
  const [contactWarningDismissed, setContactWarningDismissed] = useState(() => {
    return localStorage.getItem("contact-hidden-warning-dismissed") === "true";
  });

  const dismissContactWarning = () => {
    setContactWarningDismissed(true);
    localStorage.setItem("contact-hidden-warning-dismissed", "true");
  };

  // Reset warning dismissed state when upgrading from basic plan
  useEffect(() => {
    if (planKey !== "basic") {
      localStorage.removeItem("contact-hidden-warning-dismissed");
      setContactWarningDismissed(false);
    }
  }, [planKey]);

  // Fetch recent leads for dashboard
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["recent-leads", facilityId],
    queryFn: async (): Promise<Lead[]> => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60,
  });

  // Fetch total leads count for Basic plan upgrade banner
  const { data: totalLeadsCount = 0 } = useQuery({
    queryKey: ["total-leads-count", facilityId],
    queryFn: async (): Promise<number> => {
      if (!facilityId) return 0;
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!facilityId && planKey === "basic",
    staleTime: 1000 * 60,
  });

  // Real-time subscription for leads and views
  useEffect(() => {
    if (!facilityId) return;
    
    const leadsChannel = supabase
      .channel("dashboard-leads")
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
          queryClient.invalidateQueries({ queryKey: ["provider-data", facilityId] });
          queryClient.invalidateQueries({ queryKey: ["total-leads-count", facilityId] });
        }
      )
      .subscribe();

    const viewsChannel = supabase
      .channel("dashboard-views")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_views",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-data", facilityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(viewsChannel);
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
          description: "Your listing is visible to families",
          icon: CheckCircle, 
          dotClass: "bg-green-500",
          bgClass: "bg-green-500/10",
          textClass: "text-green-600"
        };
      case "pending":
        return { 
          label: "Under Review", 
          description: "Our team is reviewing your listing",
          icon: Clock, 
          dotClass: "bg-amber-500",
          bgClass: "bg-amber-500/10",
          textClass: "text-amber-600"
        };
      default:
        return { 
          label: "Not Listed", 
          description: "Complete your profile to go live",
          icon: AlertCircle, 
          dotClass: "bg-muted-foreground",
          bgClass: "bg-muted",
          textClass: "text-muted-foreground"
        };
    }
  };

  const statusConfig = facility ? getStatusConfig(facility.status) : getStatusConfig("inactive");
  const StatusIcon = statusConfig.icon;


  // Get the correct profile URL
  const profileUrl = facility?.slug ? `/center/${facility.slug}` : facility?.id ? `/rehab-centers/${facility.id}` : null;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            {userName ? `Welcome back, ${userName}` : "Welcome back"}
          </h1>
          <p className="text-muted-foreground">
            {facility ? `Managing ${facility.name}` : "Set up your facility listing to get started"}
          </p>
        </div>
        
        {facility && profileUrl && (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <a 
                href={profileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview Listing
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/provider/listing" className="gap-2">
                <FileEdit className="h-4 w-4" />
                Edit Listing
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Lead Limit Banners */}
      <LeadLimitReachedBanner usedLeads={monthlyLeadsCount} leadLimit={leadLimit} />
      <LeadLimitWarningBanner usedLeads={monthlyLeadsCount} leadLimit={leadLimit} />

      {/* Basic Plan Contact Hidden Warning */}
      {planKey === "basic" && !contactWarningDismissed && (
        <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-background to-amber-500/5 overflow-hidden relative">
          <button
            onClick={dismissContactWarning}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-amber-500/10 transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <CardContent className="py-4 pr-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Phone & Website Hidden</p>
                  <p className="text-sm text-muted-foreground">
                    Your contact details are hidden on your public profile. Upgrade to allow direct calls and website visits.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="shrink-0 gap-2">
                <Link to="/provider/billing">
                  Upgrade Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Plan Upgrade Banner - show when Basic users have leads waiting */}
      {planKey === "basic" && totalLeadsCount > 0 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-background to-amber-500/5 overflow-hidden">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{totalLeadsCount}</span>
                    <span className="text-lg font-semibold text-foreground">
                      Lead{totalLeadsCount !== 1 ? 's' : ''} Waiting
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to view contact details and respond to inquiries
                  </p>
                </div>
              </div>
              <Button asChild className="shrink-0 gap-2">
                <Link to="/provider/billing">
                  Upgrade to View Leads
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Checklist - only show if we have full facility data */}
      {providerData?.facility && (
        <OnboardingChecklist 
          facilityId={providerData.facility.id} 
          facilityData={providerData.facility}
        />
      )}

      {/* Status Banner - only show when not approved (pending or inactive) */}
      {facility?.status !== "approved" && (
        <Card className="border-l-4" style={{ borderLeftColor: statusConfig.dotClass === 'bg-green-500' ? '#22c55e' : statusConfig.dotClass === 'bg-amber-500' ? '#f59e0b' : '#71717a' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg ${statusConfig.bgClass} flex items-center justify-center`}>
                  <StatusIcon className={`h-5 w-5 ${statusConfig.textClass}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusConfig.dotClass}`} />
                    <span className={`font-semibold ${statusConfig.textClass}`}>{statusConfig.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
                </div>
              </div>
              {facility?.status === "pending" && (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Usually reviewed within 24-48 hours
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Profile Views */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Profile Views</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{viewsCount}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last 30 days
            </p>
          </CardContent>
        </Card>

        {/* Leads - different display for Basic vs Paid plans */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {planKey === "basic" ? "Direct Inquiry" : "Leads This Month"}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : planKey === "basic" ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{monthlyLeadsCount}</span>
                  <span className="text-lg text-muted-foreground">/ 1</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyLeadsCount >= 1 
                    ? "Lifetime limit reached" 
                    : "1 direct inquiry (lifetime)"}
                </p>
                <Button variant="link" className="h-auto p-0 text-xs text-primary" asChild>
                  <Link to="/provider/billing">
                    Upgrade for more leads
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <LeadUsageIndicator 
                usedLeads={monthlyLeadsCount} 
                leadLimit={leadLimit}
              />
            )}
          </CardContent>
        </Card>

        {/* Facility Locations */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Facility Locations</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {/* Circular progress ring */}
              <div className="relative h-12 w-12">
                <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    className={usedLocations >= locationLimit ? "stroke-red-500" : "stroke-purple-500"}
                    strokeWidth="3"
                    strokeDasharray={`${(usedLocations / locationLimit) * 94.2} 94.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{usedLocations}/{locationLimit}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {usedLocations} of {locationLimit} used
                </p>
                <p className="text-xs text-muted-foreground">
                  {locationLimit - usedLocations > 0 
                    ? `${locationLimit - usedLocations} available` 
                    : "Limit reached"}
                </p>
              </div>
            </div>
            {usedLocations >= locationLimit && planKey !== "featured" && (
              <Button variant="link" className="h-auto p-0 text-xs text-primary mt-2" asChild>
                <Link to="/provider/billing">
                  Upgrade for more
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscription</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">{subscription?.plan_name || "Basic Listing"}</span>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs text-primary mt-1" asChild>
              <Link to="/provider/billing">
                {subscription?.subscribed ? "Manage plan" : "Upgrade plan"}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Leads Awaiting Follow-up Widget */}
      {(() => {
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

        if (leadsAwaitingFollowup.length === 0) return null;

        return (
          <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-amber-800">
                      {urgentLeads.length} Lead{urgentLeads.length !== 1 ? 's' : ''} Awaiting Follow-up
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {urgentLeads.length > 0 
                        ? "These leads have been waiting over 24 hours" 
                        : "All leads are snoozed"}
                      {snoozedLeads.length > 0 && ` • ${snoozedLeads.length} snoozed`}
                    </p>
                  </div>
                </div>
                <Button variant="default" size="sm" asChild className="gap-1.5 bg-amber-600 hover:bg-amber-700">
                  <Link to="/provider/leads?status=new">
                    <Phone className="h-3.5 w-3.5" />
                    Contact Now
                  </Link>
                </Button>
              </div>
            </CardHeader>
            {urgentLeads.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {urgentLeads.slice(0, 3).map((lead) => {
                    const hoursWaiting = differenceInHours(now, new Date(lead.created_at));
                    const urgencyLevel = hoursWaiting >= 72 ? 'critical' : hoursWaiting >= 48 ? 'high' : 'moderate';
                    
                    return (
                      <button
                        key={lead.id}
                        onClick={() => handleLeadClick(lead)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-colors group text-left"
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          urgencyLevel === 'critical' ? 'bg-red-100' : 
                          urgencyLevel === 'high' ? 'bg-orange-100' : 'bg-amber-100'
                        }`}>
                          <span className={`text-sm font-semibold ${
                            urgencyLevel === 'critical' ? 'text-red-700' : 
                            urgencyLevel === 'high' ? 'text-orange-700' : 'text-amber-700'
                          }`}>
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground text-sm truncate">{lead.name}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              urgencyLevel === 'critical' ? 'bg-red-100 text-red-700' : 
                              urgencyLevel === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {hoursWaiting}h
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              {lead.preferred_contact === "call" ? (
                                <Phone className="h-3 w-3" />
                              ) : (
                                <Mail className="h-3 w-3" />
                              )}
                              {lead.preferred_contact === "call" ? lead.phone : lead.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild onClick={(e) => e.stopPropagation()}>
                            <a href={`tel:${lead.phone}`}>
                              <Phone className="h-3 w-3" />
                              Call
                            </a>
                          </Button>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })}
                  {urgentLeads.length > 3 && (
                    <Button variant="ghost" size="sm" asChild className="w-full text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50">
                      <Link to="/provider/leads?status=new">
                        +{urgentLeads.length - 3} more lead{urgentLeads.length - 3 !== 1 ? 's' : ''} awaiting follow-up
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
                {snoozedLeads.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2 text-xs text-muted-foreground">
                    <BellOff className="h-3.5 w-3.5" />
                    <span>{snoozedLeads.length} lead{snoozedLeads.length !== 1 ? 's' : ''} with snoozed reminders</span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })()}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Recent Contact Requests</CardTitle>
                <p className="text-xs text-muted-foreground">Families interested in your facility</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/provider/leads">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {leadsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/20">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground text-sm">No contact requests yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                When families reach out about your facility, their requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => handleLeadClick(lead)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground text-sm truncate">{lead.name}</p>
                      <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        {lead.preferred_contact === "call" ? (
                          <Phone className="h-3 w-3" />
                        ) : (
                          <Mail className="h-3 w-3" />
                        )}
                        {lead.preferred_contact === "call" ? lead.phone : lead.email}
                      </span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Getting Started (only show if no facility) */}
      {!facility && (
        <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/10">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Complete your listing</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Add your facility information to start receiving inquiries from families.
                  </p>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/provider/listing">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      </div>
    </div>
  );
}
