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
  Phone,
  Mail,
  AlertTriangle,
  Lock,
  TrendingUp,
  Sparkles,
  ChevronRight,
  X,
  Newspaper,
  Megaphone,
  Star,
  Zap
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
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-4.5 w-4.5", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            {isLoading ? (
              <Skeleton className="h-6 w-12 mt-0.5" />
            ) : (
              <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
            )}
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action && (
            <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" asChild>
              <Link to={action.href}>
                {action.label}
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Platform News Data
const platformNews = [
  {
    id: 1,
    type: "feature",
    icon: Zap,
    title: "New Lead Analytics Dashboard",
    description: "Track your conversion rates and lead quality with enhanced analytics.",
    date: "Dec 20",
    isNew: true
  },
  {
    id: 2,
    type: "announcement",
    icon: Megaphone,
    title: "Holiday Support Hours",
    description: "Support available Dec 24-25 with limited hours. Happy Holidays!",
    date: "Dec 18",
    isNew: true
  },
  {
    id: 3,
    type: "tip",
    icon: Star,
    title: "Complete Your Profile",
    description: "Facilities with complete profiles receive 40% more inquiries.",
    date: "Dec 15",
    isNew: false
  }
];

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

  useEffect(() => {
    if (facilityId) {
      setProfilePromptDismissedFields(localStorage.getItem(`profile-prompt-dismissed-${facilityId}`));
    }
  }, [facilityId]);

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
        .limit(4);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 5,
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
          bgClass: "bg-emerald-500/10",
          textClass: "text-emerald-600",
          dotClass: "bg-emerald-500"
        };
      case "pending":
        return { 
          label: "Under Review", 
          icon: Clock, 
          bgClass: "bg-amber-500/10",
          textClass: "text-amber-600",
          dotClass: "bg-amber-500"
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        
        {/* Main Grid Layout - No full-width sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          
          {/* Left Column - Header & Main Content */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4">
            
            {/* Header Card */}
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {format(new Date(), "EEEE, MMM d")}
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                      {userName ? `Welcome, ${userName}` : "Dashboard"}
                    </h1>
                    {facility && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{facility.name}</span>
                        {facility.status === "approved" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Live
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {facility && profileUrl && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                        <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </a>
                      </Button>
                      <Button size="sm" className="h-8 text-xs gap-1.5" asChild>
                        <Link to="/provider/listing">
                          <FileEdit className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Metrics Row - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <MetricCard
                title="Views"
                value={viewsCount}
                subtitle="Last 30 days"
                icon={Eye}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-600"
                isLoading={isLoading}
              />
              <MetricCard
                title="Leads"
                value={monthlyLeadsCount}
                subtitle="This month"
                icon={TrendingUp}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600"
                isLoading={isLoading}
              />
              <MetricCard
                title="Locations"
                value={`${usedLocations}/${locationLimit}`}
                subtitle={!subscriptionLoading && usedLocations >= locationLimit && planKey !== "featured" ? "Limit reached" : "Active"}
                icon={Building2}
                iconBg="bg-violet-500/10"
                iconColor="text-violet-600"
                isLoading={subscriptionLoading}
              />
              <MetricCard
                title="Plan"
                value={subscriptionLoading ? "" : (subscription?.plan_name || "Basic")}
                icon={CreditCard}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                action={{ label: "Manage", href: "/provider/billing" }}
                isLoading={subscriptionLoading}
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
                  {!subscriptionLoading && planKey !== "basic" && recentLeads.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" asChild>
                      <Link to="/provider/leads">
                        View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {subscriptionLoading || leadsLoading ? (
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
                ) : planKey === "basic" ? (
                  <div className="relative p-5">
                    <div className="space-y-2 blur-sm pointer-events-none select-none">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border">
                          <div className="h-8 w-8 rounded-full bg-muted" />
                          <div className="flex-1">
                            <div className="h-3.5 w-20 bg-muted rounded" />
                            <div className="h-2.5 w-28 bg-muted rounded mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95">
                      <Lock className="h-6 w-6 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">Upgrade to View</p>
                      <Button size="sm" className="mt-2 h-7 text-xs" asChild>
                        <Link to="/provider/billing">
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                          Upgrade
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : recentLeads.length === 0 ? (
                  <div className="text-center py-6 px-4">
                    <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">No leads yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Leads appear when families reach out</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {recentLeads.slice(0, 4).map((lead, index) => (
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
                            <span className="text-xs font-bold text-primary">
                              {lead.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {index === 0 && lead.status === 'new' && (
                            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                            <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            {lead.preferred_contact === "call" ? <Phone className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                            <span className="truncate">{lead.preferred_contact === "call" ? lead.phone : lead.email}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Conversion Widget - Conditional */}
            {!subscriptionLoading && planKey !== "basic" && facilityIds.length > 0 && (
              <LeadConversionWidget facilityIds={facilityIds} />
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-3 sm:space-y-4">
            
            {/* Alerts Card */}
            {!subscriptionLoading && (
              <div className="space-y-2.5">
                {planKey === "basic" && totalLeadsCount > 0 && (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white">{totalLeadsCount}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {totalLeadsCount} Lead{totalLeadsCount !== 1 ? 's' : ''} Waiting
                          </p>
                          <p className="text-xs text-muted-foreground">Upgrade to unlock</p>
                        </div>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" asChild>
                          <Link to="/provider/billing">
                            Unlock
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Urgent Leads Alert */}
                {planKey !== "basic" && urgentLeads.length > 0 && (
                  <Card className="border-l-2 border-l-amber-500">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {urgentLeads.length} Need Follow-up
                          </p>
                          <p className="text-xs text-muted-foreground">Waiting 24h+</p>
                        </div>
                        <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" asChild>
                          <Link to="/provider/leads?status=new">
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
                          <FileEdit className="h-4.5 w-4.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">Complete Profile</p>
                            <p className="text-xs text-muted-foreground">{missingFields.length} items missing</p>
                          </div>
                          <Button size="sm" className="h-7 text-xs" asChild>
                            <Link to="/provider/listing">Add</Link>
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
                  <Card className={cn("border-l-2", statusConfig.dotClass === 'bg-amber-500' ? "border-l-amber-500" : "border-l-muted-foreground")}>
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
            )}

            {/* Platform News */}
            <Card>
              <CardHeader className="p-3.5 pb-2.5 border-b">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Platform News</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {platformNews.map((news) => {
                    const NewsIcon = news.icon;
                    return (
                      <div key={news.id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "h-7 w-7 rounded flex items-center justify-center shrink-0",
                            news.type === 'feature' ? 'bg-blue-500/10 text-blue-600' :
                            news.type === 'announcement' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-violet-500/10 text-violet-600'
                          )}>
                            <NewsIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground leading-tight truncate">{news.title}</p>
                              {news.isNew && (
                                <span className="px-1.5 py-0.5 text-[9px] font-medium bg-primary text-primary-foreground rounded shrink-0">NEW</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{news.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="p-3.5 pb-2.5 border-b">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/listing">
                      <FileEdit className="h-3.5 w-3.5 mr-2" />
                      Listing
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="justify-start h-8 text-xs px-2.5" asChild>
                    <Link to="/provider/leads">
                      <Users className="h-3.5 w-3.5 mr-2" />
                      Leads
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

            {/* Lead Usage Progress - if applicable */}
            {!subscriptionLoading && (planKey === "professional" || planKey === "featured") && (
              <Card>
                <CardHeader className="p-3.5 pb-2.5 border-b">
                  <CardTitle className="text-sm font-semibold">Lead Usage</CardTitle>
                </CardHeader>
                <CardContent className="p-3.5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Used</span>
                      <span className="font-semibold">{monthlyLeadsCount} / {leadLimit}</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          monthlyLeadsCount >= leadLimit ? "bg-red-500" :
                          monthlyLeadsCount >= leadLimit * 0.8 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min((monthlyLeadsCount / leadLimit) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {leadLimit - monthlyLeadsCount > 0 
                        ? `${leadLimit - monthlyLeadsCount} leads remaining`
                        : "Limit reached"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Featured Analytics Widget - if applicable */}
            {!subscriptionLoading && planKey === "featured" && facility?.id && (
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
                      <Link to="/provider/listing">
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
    </div>
  );
}
