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
  BellOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useSubscription } from "@/hooks/useSubscription";
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
  
  const facility = selectedFacility || providerData?.facility;
  const profile = providerData?.profile;
  const viewsCount = providerData?.viewsCount ?? 0;
  const monthlyLeadsCount = providerData?.monthlyLeadsCount ?? 0;
  const userName = profile?.first_name || "";
  
  // Get lead limit from subscription data
  const leadLimit = subscription?.lead_limit ?? 5;

  // State for lead detail drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

      {/* Status Banner */}
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

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
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

        {/* Monthly Leads with Usage */}
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Leads This Month</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <LeadUsageIndicator 
                usedLeads={monthlyLeadsCount} 
                leadLimit={leadLimit}
              />
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
  );
}
