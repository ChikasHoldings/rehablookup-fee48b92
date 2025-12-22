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
  ChevronRight,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, differenceInHours, isPast, format } from "date-fns";
import { 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner 
} from "@/components/provider/LeadUsageIndicator";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { LeadDetailDrawer } from "@/components/provider/leads/LeadDetailDrawer";

import { FeaturedAnalyticsWidget } from "@/components/provider/FeaturedAnalyticsWidget";
import { BasicPlanUpgradeBanner } from "@/components/provider/BasicPlanUpgradeBanner";

import { LeadUsageProgressCard } from "@/components/provider/LeadUsageProgressCard";
import { cn } from "@/lib/utils";
import { LeadConversionWidget } from "@/components/provider/LeadConversionWidget";
import { Lead } from "@/components/provider/leads/LeadDetailPanel";

// Metric Card Component with polished design
function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconBg, 
  iconColor,
  action,
  isLoading,
  trend
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  action?: { label: string; href: string };
  isLoading?: boolean;
  trend?: { value: number; label: string };
}) {
  return (
    <Card className="group relative overflow-hidden border-border/40 bg-gradient-to-br from-card via-card to-muted/20 hover:shadow-lg hover:border-border/60 transition-all duration-300">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] pointer-events-none" />
      
      <CardContent className="p-4 sm:p-5 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
                {trend && (
                  <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded-md",
                    trend.value >= 0 
                      ? "text-emerald-600 bg-emerald-500/10" 
                      : "text-red-600 bg-red-500/10"
                  )}>
                    {trend.value >= 0 ? "+" : ""}{trend.value}%
                  </span>
                )}
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 opacity-70" />
                {subtitle}
              </p>
            )}
            {action && (
              <Button variant="link" className="h-auto p-0 text-xs font-medium text-primary hover:text-primary/80 mt-1" asChild>
                <Link to={action.href} className="flex items-center gap-1 group/link">
                  {action.label}
                  <ChevronRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
                </Link>
              </Button>
            )}
          </div>
          <div className={cn(
            "h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
            iconBg
          )}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconColor)} />
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
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { facilities } = useProviderFacilities();
  
  const facility = selectedFacility || providerData?.facility;
  const profile = providerData?.profile;
  const viewsCount = providerData?.viewsCount ?? 0;
  const monthlyLeadsCount = providerData?.monthlyLeadsCount ?? 0;
  const userName = profile?.first_name || "";
  
  const leadLimit = subscription?.lead_limit ?? 0;
  // Only use "basic" as default AFTER loading completes to prevent flash
  const planKey = subscriptionLoading ? undefined : (subscription?.plan || "basic");
  const locationLimit = planKey ? PLAN_DETAILS[planKey]?.location_limit ?? 1 : 1;
  const usedLocations = facilities?.length ?? 0;
  const facilityIds = facilities?.map(f => f.id) ?? [];

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profilePromptDismissedFields, setProfilePromptDismissedFields] = useState<string | null>(() => {
    if (!facilityId) return null;
    return localStorage.getItem(`profile-prompt-dismissed-${facilityId}`);
  });

  // Reset dismissed state when facility changes
  useEffect(() => {
    if (facilityId) {
      setProfilePromptDismissedFields(localStorage.getItem(`profile-prompt-dismissed-${facilityId}`));
    }
  }, [facilityId]);

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
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
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
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
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
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
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
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
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

  // Remove blocking skeleton - render page immediately, show inline loading states

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
    <div className="min-h-full bg-gradient-to-b from-muted/40 via-background to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 lg:space-y-8">
        
        {/* Header Section - Enhanced */}
        <header className="relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide uppercase">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                {userName ? `Welcome back, ${userName}` : "Welcome back"}
              </h1>
              {facility && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4 text-primary/70" />
                  <span>Managing</span>
                  <span className="font-semibold text-foreground">{facility.name}</span>
                  {facility.status === "approved" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {facility && profileUrl && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="outline" size="sm" className="h-10 gap-2 border-border/60 hover:bg-muted/80 shadow-sm" asChild>
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Preview</span> Listing
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                  </a>
                </Button>
                <Button size="sm" className="h-10 gap-2 shadow-sm" asChild>
                  <Link to="/provider/listing">
                    <FileEdit className="h-4 w-4" />
                    Edit Listing
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Alert Banners - Only show after subscription data is loaded to prevent flash */}
        {!subscriptionLoading && (
          <div className="space-y-3">
            <LeadLimitReachedBanner usedLeads={monthlyLeadsCount} leadLimit={leadLimit} plan={planKey as "basic" | "professional" | "featured"} />
            <LeadLimitWarningBanner usedLeads={monthlyLeadsCount} leadLimit={leadLimit} />
            
            {planKey === "basic" && totalLeadsCount === 0 && <BasicPlanUpgradeBanner />}
            
            {/* Basic Plan - Leads Waiting Banner */}
            {planKey === "basic" && totalLeadsCount > 0 && (
              <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-card to-primary/5 overflow-hidden shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500 rounded-xl animate-ping opacity-20" />
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
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
                    <Button asChild className="shrink-0 gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20">
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
        )}

        {/* Profile Completion Prompt */}
        {providerData?.facility && (() => {
          const missingFields = computeMissingFields();
          
          if (missingFields.length === 0) return null;
          
          // Check if dismissed for the same set of missing fields
          const currentFieldsKey = missingFields.join(",");
          if (profilePromptDismissedFields === currentFieldsKey) return null;
          
          const missingText = missingFields.length === 1 
            ? `Add your ${missingFields[0]}` 
            : `Add ${missingFields.slice(0, 2).join(", ")}${missingFields.length > 2 ? ` +${missingFields.length - 2} more` : ""}`;
          
          return (
            <Link to="/provider/listing" className="block">
              <Card className="border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileEdit className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{missingText}</span> to attract more families
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <button
                      onClick={(e) => handleDismissProfilePrompt(e, missingFields)}
                      className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })()}

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

        {/* Featured Analytics Widget - Only show after subscription loads */}
        {!subscriptionLoading && planKey === "featured" && facility?.id && (
          <FeaturedAnalyticsWidget facilityId={facility.id} />
        )}

        {/* Lead Usage Progress Card - Only show after subscription loads */}
        {!subscriptionLoading && (planKey === "professional" || planKey === "featured") && (
          <LeadUsageProgressCard 
            usedLeads={monthlyLeadsCount} 
            leadLimit={leadLimit}
            plan={planKey as "professional" | "featured"}
            subscriptionEnd={subscription?.subscription_end}
          />
        )}

        {/* Metrics Grid - Enhanced */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Performance Overview</h2>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              title="Profile Views"
              value={viewsCount}
              subtitle="Last 30 days"
              icon={Eye}
              iconBg="bg-gradient-to-br from-blue-500/15 to-blue-600/10"
              iconColor="text-blue-600"
              isLoading={isLoading}
            />
            <MetricCard
              title="Qualified Leads"
              value={monthlyLeadsCount}
              subtitle="This month"
              icon={TrendingUp}
              iconBg="bg-gradient-to-br from-emerald-500/15 to-emerald-600/10"
              iconColor="text-emerald-600"
              action={!subscriptionLoading && planKey !== "basic" ? { label: "View all", href: "/provider/leads" } : undefined}
              isLoading={isLoading}
            />
            <MetricCard
              title="Locations"
              value={`${usedLocations}/${locationLimit}`}
              subtitle={!subscriptionLoading && usedLocations >= locationLimit && planKey !== "featured" ? "Limit reached" : "Active"}
              icon={Building2}
              iconBg="bg-gradient-to-br from-violet-500/15 to-violet-600/10"
              iconColor="text-violet-600"
              action={!subscriptionLoading && usedLocations >= locationLimit && planKey !== "featured" ? { label: "Upgrade", href: "/provider/billing" } : undefined}
              isLoading={subscriptionLoading}
            />
            <MetricCard
              title="Current Plan"
              value={subscriptionLoading ? "" : (subscription?.plan_name || "Basic")}
              icon={CreditCard}
              iconBg="bg-gradient-to-br from-primary/15 to-primary/10"
              iconColor="text-primary"
              action={{ label: subscription?.subscribed ? "Manage" : "Upgrade", href: "/provider/billing" }}
              isLoading={subscriptionLoading}
            />
          </div>
        </section>

        {/* Lead Conversion Analytics Widget - Only show after subscription loads */}
        {!subscriptionLoading && planKey !== "basic" && facilityIds.length > 0 && (
          <LeadConversionWidget facilityIds={facilityIds} />
        )}

        {/* Leads Awaiting Follow-up - Enhanced */}
        {!subscriptionLoading && planKey !== "basic" && urgentLeads.length > 0 && (
          <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 via-card to-card dark:from-amber-950/20 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 pt-5 px-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center shadow-sm">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                      {urgentLeads.length}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-semibold">
                      Leads Awaiting Follow-up
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Waiting over 24 hours
                      {snoozedLeads.length > 0 && (
                        <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{snoozedLeads.length} snoozed</span>
                      )}
                    </p>
                  </div>
                </div>
                <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700 shadow-sm" asChild>
                  <Link to="/provider/leads?status=new">
                    <Phone className="h-4 w-4" />
                    Contact Now
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-5">
              <div className="space-y-2">
                {urgentLeads.slice(0, 3).map((lead) => {
                  const hoursWaiting = differenceInHours(now, new Date(lead.created_at));
                  const urgencyLevel = hoursWaiting >= 72 ? 'critical' : hoursWaiting >= 48 ? 'high' : 'moderate';
                  
                  return (
                    <button
                      key={lead.id}
                      onClick={() => handleLeadClick(lead)}
                      className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all group text-left shadow-sm"
                    >
                      <div className={cn(
                        "h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shrink-0 ring-2 ring-background",
                        urgencyLevel === 'critical' ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900' : 
                        urgencyLevel === 'high' ? 'bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-950 dark:to-orange-900' : 
                        'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950 dark:to-amber-900'
                      )}>
                        <span className={cn(
                          "text-sm font-bold",
                          urgencyLevel === 'critical' ? 'text-red-700 dark:text-red-400' : 
                          urgencyLevel === 'high' ? 'text-orange-700 dark:text-orange-400' : 'text-amber-700 dark:text-amber-400'
                        )}>
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm truncate">{lead.name}</p>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-semibold",
                            urgencyLevel === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : 
                            urgencyLevel === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' : 
                            'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          )}>
                            {hoursWaiting}h
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                          {lead.preferred_contact === "call" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                          <span className="truncate">{lead.preferred_contact === "call" ? lead.phone : lead.email}</span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Contact Requests - Enhanced */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h2>
            <div className="flex-1 h-px bg-border/50" />
          </div>
          
          <Card className="overflow-hidden border-border/40 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-muted/30 py-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/10 flex items-center justify-center shadow-sm">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-semibold">Contact Requests</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">Families interested in your facility</p>
                  </div>
                </div>
                {!subscriptionLoading && planKey !== "basic" && recentLeads.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-1.5 border-border/60 shadow-sm" asChild>
                    <Link to="/provider/leads">
                      View All
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {subscriptionLoading || leadsLoading ? (
                <div className="p-4 sm:p-5 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border/50 bg-muted/30">
                      <Skeleton className="h-11 w-11 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : planKey === "basic" ? (
                <div className="relative p-6 sm:p-8">
                  <div className="space-y-3 blur-sm pointer-events-none select-none" aria-hidden="true">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-xl border bg-card">
                        <div className="h-11 w-11 rounded-full bg-primary/10" />
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-muted rounded" />
                          <div className="h-3 w-48 bg-muted rounded mt-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-card/95 via-card/90 to-card/95 backdrop-blur-sm">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/10 flex items-center justify-center mb-5 shadow-lg shadow-primary/5">
                      <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-xl">Upgrade to View Leads</h3>
                    <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
                      Contact details are hidden on the Basic plan. Upgrade to connect with families.
                    </p>
                    <Button asChild size="lg" className="mt-6 gap-2 shadow-md">
                      <Link to="/provider/billing">
                        <Sparkles className="h-4 w-4" />
                        Upgrade Now
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : recentLeads.length === 0 ? (
                <div className="text-center py-16 sm:py-20 px-6">
                  <div className="h-16 w-16 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-5">
                    <Users className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">No contact requests yet</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                    When families reach out about your facility, their requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentLeads.map((lead, index) => (
                    <button
                      key={lead.id}
                      onClick={() => handleLeadClick(lead)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 sm:p-5 hover:bg-muted/50 transition-all duration-200 group text-left",
                        index === 0 && "bg-primary/[0.02]"
                      )}
                    >
                      <div className="relative">
                        <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary/15 to-primary/10 flex items-center justify-center shrink-0 ring-2 ring-background shadow-sm">
                          <span className="text-sm sm:text-base font-bold text-primary">
                            {lead.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {index === 0 && lead.status === 'new' && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{lead.name}</p>
                          <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            {lead.preferred_contact === "call" ? <Phone className="h-3.5 w-3.5 text-muted-foreground/70" /> : <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />}
                            <span className="truncate max-w-[140px] sm:max-w-none">{lead.preferred_contact === "call" ? lead.phone : lead.email}</span>
                          </span>
                          <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                          <span className="text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

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
      </div>
    </div>
  );
}