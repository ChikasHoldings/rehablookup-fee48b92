import { useEffect } from "react";
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
  Settings,
  Calendar,
  BarChart3,
  Phone,
  Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProviderData } from "@/hooks/useProviderData";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { 
  LeadUsageIndicator, 
  LeadLimitWarningBanner, 
  LeadLimitReachedBanner 
} from "@/components/provider/LeadUsageIndicator";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  created_at: string;
  preferred_contact: string;
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

  // Fetch recent leads for dashboard
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["recent-leads", facilityId],
    queryFn: async (): Promise<Lead[]> => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, email, status, created_at, preferred_contact")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60,
  });

  // Real-time subscription for leads
  useEffect(() => {
    if (!facilityId) return;
    
    const channel = supabase
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
          queryClient.invalidateQueries({ queryKey: ["provider-data"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId, queryClient]);

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

  const quickActions = [
    { 
      label: "Edit Listing", 
      description: "Update your facility details",
      icon: FileEdit, 
      href: "/provider/listing",
    },
    { 
      label: "View Analytics", 
      description: "See performance metrics",
      icon: BarChart3, 
      href: "/provider/leads",
    },
    { 
      label: "Account Settings", 
      description: "Manage your account",
      icon: Settings, 
      href: "/provider/settings",
    },
  ];

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

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.label} to={action.href}>
              <Card className="h-full hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

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
                <Link
                  key={lead.id}
                  to="/provider/leads"
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
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
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Getting Started (only show if no facility or pending) */}
      {(!facility || facility.status === "pending") && (
        <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/10">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {facility ? "Listing under review" : "Complete your listing"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {facility 
                      ? "We're reviewing your listing details. You'll be notified once it's approved."
                      : "Add your facility information to start receiving inquiries from families."}
                  </p>
                </div>
              </div>
              {!facility && (
                <Button asChild className="shrink-0">
                  <Link to="/provider/listing">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
