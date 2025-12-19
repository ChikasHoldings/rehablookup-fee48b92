import { useEffect, useState } from "react";
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
  Lock,
  TrendingUp,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderDashboardSkeleton } from "@/components/skeletons/ProviderDashboardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, differenceInHours, isPast, format } from "date-fns";
import { 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner 
} from "@/components/provider/LeadUsageIndicator";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { LeadDetailDrawer } from "@/components/provider/leads/LeadDetailDrawer";
import { OnboardingChecklist } from "@/components/provider/OnboardingChecklist";
import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { BasicPlanUpgradeBanner } from "@/components/provider/BasicPlanUpgradeBanner";
import { OnboardingTour } from "@/components/provider/OnboardingTour";
import { LeadUsageProgressCard } from "@/components/provider/LeadUsageProgressCard";
import { cn } from "@/lib/utils";
import { LeadConversionWidget } from "@/components/provider/LeadConversionWidget";

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

// Metric Card Component for consistent styling
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
    <Card className="relative overflow-hidden border-border/50 bg-card hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {subtitle}
              </p>
            )}
            {action && (
              <Button variant="link" className="h-auto p-0 text-xs text-primary" asChild>
                <Link to={action.href} className="flex items-center gap-1">
                  {action.label}
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
          <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
  
  const leadLimit = subscription?.lead_limit ?? 5;
  const planKey = subscription?.plan || "basic";
  const locationLimit = PLAN_DETAILS[planKey]?.location_limit ?? 1;
  const usedLocations = facilities?.length ?? 0;
  const facilityIds = facilities?.map(f => f.id) ?? [];

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch recent leads
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

  // Fetch total leads count for Basic plan
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
          description: "Your listing is visible to families",
          icon: CheckCircle, 
          bgClass: "bg-emerald-500/10",
          textClass: "text-emerald-600",
          dotClass: "bg-emerald-500"
        };
      case "pending":
        return { 
          label: "Under Review", 
          description: "Our team is reviewing your listing",
          icon: Clock, 
          bgClass: "bg-amber-500/10",
          textClass: "text-amber-600",
          dotClass: "bg-amber-500"
        };
      default:
        return { 
          label: "Not Listed", 
          description: "Complete your profile to go live",
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

  if (isLoading && !providerData) {
    return <ProviderDashboardSkeleton />;
  }

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
    <div className="min-h-full bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground font-medium">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {userName ? `Welcome back, ${userName}` : "Welcome back"}
            </h1>
            {facility && (
              <p className="text-muted-foreground">
                Managing <span className="font-medium text-foreground">{facility.name}</span>
              </p>
            )}
          </div>
          
          {facility && profileUrl && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="h-10 gap-2" asChild>
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4" />
                  Preview Listing
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button size="sm" className="h-10 gap-2" asChild>
                <Link to="/provider/listing">
                  <FileEdit className="h-4 w-4" />
                  Edit Listing
                </Link>
              </Button>
            </div>
          )}
        </header>

        {/* Alert Banners */}
        <div className="space-y-3">
          <LeadLimitReachedBanner usedLeads={monthlyLeadsCount} leadLimit={leadLimit} plan={planKey as "basic" | "professional" | "featured"} />
          <LeadLimitWarningBanner usedLeads={monthlyLeadsCount} leadLimit={leadLimit} />
          
          {planKey === "basic" && totalLeadsCount === 0 && <BasicPlanUpgradeBanner />}
          
          {/* Basic Plan - Leads Waiting Banner */}
          {planKey === "basic" && totalLeadsCount > 0 && (
            <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-card to-primary/5 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500 rounded-xl animate-ping opacity-20" />
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                        <span className="text-xl font-bold text-white">{totalLeadsCount}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {totalLeadsCount} Lead{totalLeadsCount !== 1 ? 's' : ''} Waiting
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Families are interested. Upgrade to view contact details.
                      </p>
                    </div>
                  </div>
                  <Button asChild className="shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Link to="/provider/billing">
                      Unlock Leads
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Onboarding Checklist */}
        {providerData?.facility && (
          <OnboardingChecklist 
            facilityId={providerData.facility.id} 
            facilityData={providerData.facility}
          />
        )}

        {/* Status Banner - Only for non-approved */}
        {facility?.status !== "approved" && (
          <Card className={cn("border-l-4", statusConfig.dotClass === 'bg-amber-500' ? "border-l-amber-500" : "border-l-muted-foreground")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", statusConfig.bgClass)}>
                  <StatusIcon className={cn("h-5 w-5", statusConfig.textClass)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", statusConfig.dotClass)} />
                    <span className={cn("font-semibold", statusConfig.textClass)}>{statusConfig.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
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

        {/* Featured Analytics Widget */}
        {planKey === "featured" && facility?.id && (
          <FeaturedAnalyticsWidget facilityId={facility.id} />
        )}

        {/* Lead Usage Progress Card */}
        {(planKey === "professional" || planKey === "featured") && (
          <LeadUsageProgressCard 
            usedLeads={monthlyLeadsCount} 
            leadLimit={leadLimit}
            plan={planKey as "professional" | "featured"}
            subscriptionEnd={subscription?.subscription_end}
          />
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Profile Views"
            value={viewsCount}
            subtitle="Last 30 days"
            icon={Eye}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-600"
            isLoading={isLoading}
          />
          <MetricCard
            title="Qualified Leads"
            value={monthlyLeadsCount}
            subtitle="This month"
            icon={TrendingUp}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600"
            action={planKey !== "basic" ? { label: "View all", href: "/provider/leads" } : undefined}
            isLoading={isLoading}
          />
          <MetricCard
            title="Locations"
            value={`${usedLocations}/${locationLimit}`}
            subtitle={usedLocations >= locationLimit && planKey !== "featured" ? "Limit reached" : "Active"}
            icon={Building2}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600"
            action={usedLocations >= locationLimit && planKey !== "featured" ? { label: "Upgrade", href: "/provider/billing" } : undefined}
          />
          <MetricCard
            title="Current Plan"
            value={subscription?.plan_name || "Basic"}
            icon={CreditCard}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            action={{ label: subscription?.subscribed ? "Manage" : "Upgrade", href: "/provider/billing" }}
          />
        </div>

        {/* Lead Conversion Analytics Widget */}
        {planKey !== "basic" && facilityIds.length > 0 && (
          <LeadConversionWidget facilityIds={facilityIds} />
        )}

        {/* Leads Awaiting Follow-up */}
        {planKey !== "basic" && urgentLeads.length > 0 && (
          <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 via-card to-card dark:from-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {urgentLeads.length} Lead{urgentLeads.length !== 1 ? 's' : ''} Awaiting Follow-up
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      These leads have been waiting over 24 hours
                      {snoozedLeads.length > 0 && ` • ${snoozedLeads.length} snoozed`}
                    </p>
                  </div>
                </div>
                <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700" asChild>
                  <Link to="/provider/leads?status=new">
                    <Phone className="h-4 w-4" />
                    Contact Now
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {urgentLeads.slice(0, 3).map((lead) => {
                  const hoursWaiting = differenceInHours(now, new Date(lead.created_at));
                  const urgencyLevel = hoursWaiting >= 72 ? 'critical' : hoursWaiting >= 48 ? 'high' : 'moderate';
                  
                  return (
                    <button
                      key={lead.id}
                      onClick={() => handleLeadClick(lead)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-all group text-left"
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                        urgencyLevel === 'critical' ? 'bg-red-100 dark:bg-red-950' : 
                        urgencyLevel === 'high' ? 'bg-orange-100 dark:bg-orange-950' : 'bg-amber-100 dark:bg-amber-950'
                      )}>
                        <span className={cn(
                          "text-sm font-semibold",
                          urgencyLevel === 'critical' ? 'text-red-700 dark:text-red-400' : 
                          urgencyLevel === 'high' ? 'text-orange-700 dark:text-orange-400' : 'text-amber-700 dark:text-amber-400'
                        )}>
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground text-sm truncate">{lead.name}</p>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded font-medium",
                            urgencyLevel === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 
                            urgencyLevel === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' : 
                            'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          )}>
                            {hoursWaiting}h waiting
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          {lead.preferred_contact === "call" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                          {lead.preferred_contact === "call" ? lead.phone : lead.email}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Contact Requests */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Contact Requests</CardTitle>
                  <p className="text-sm text-muted-foreground">Families interested in your facility</p>
                </div>
              </div>
              {planKey !== "basic" && recentLeads.length > 0 && (
                <Button variant="ghost" size="sm" className="gap-1" asChild>
                  <Link to="/provider/leads">
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {planKey === "basic" ? (
              <div className="relative p-6">
                <div className="space-y-3 blur-sm pointer-events-none select-none" aria-hidden="true">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="h-10 w-10 rounded-full bg-primary/10" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur-[2px]">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Lock className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">Upgrade to View Leads</h3>
                  <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs">
                    Contact details are hidden on the Basic plan
                  </p>
                  <Button asChild className="mt-5 gap-2">
                    <Link to="/provider/billing">
                      <Sparkles className="h-4 w-4" />
                      Upgrade Now
                    </Link>
                  </Button>
                </div>
              </div>
            ) : leadsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-foreground">No contact requests yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  When families reach out about your facility, their requests will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {recentLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleLeadClick(lead)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group text-left"
                  >
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {lead.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{lead.name}</p>
                        <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          {lead.preferred_contact === "call" ? <Phone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                          {lead.preferred_contact === "call" ? lead.phone : lead.email}
                        </span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started - No facility */}
        {!facility && (
          <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">Complete your listing</h3>
                    <p className="text-muted-foreground mt-1">
                      Add your facility information to start receiving leads from families.
                    </p>
                  </div>
                </div>
                <Button size="lg" className="gap-2" asChild>
                  <Link to="/provider/listing">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
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

        {/* Onboarding Tour */}
        <OnboardingTour />
      </div>
    </div>
  );
}