import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProviderLayout } from "@/components/provider/ProviderLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  CreditCard,
  ArrowRight,
  TrendingUp,
  Building2,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Facility {
  id: string;
  name: string;
  status: string;
}

export default function ProviderDashboardPage() {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [leadsCount, setLeadsCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: facilityData } = await supabase
        .from("facilities")
        .select("id, name, status")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (facilityData) {
        setFacility(facilityData);
      }

      setLeadsCount(0);
    };

    fetchData();
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { 
          label: "Active", 
          icon: CheckCircle, 
          bgClass: "bg-green-500/10",
          textClass: "text-green-600",
          badgeClass: "bg-green-100 text-green-700 border-green-200"
        };
      case "pending":
        return { 
          label: "Pending Review", 
          icon: Clock, 
          bgClass: "bg-amber-500/10",
          textClass: "text-amber-600",
          badgeClass: "bg-amber-100 text-amber-700 border-amber-200"
        };
      default:
        return { 
          label: "Inactive", 
          icon: AlertCircle, 
          bgClass: "bg-muted",
          textClass: "text-muted-foreground",
          badgeClass: "bg-muted text-muted-foreground border-border"
        };
    }
  };

  const statusConfig = facility ? getStatusConfig(facility.status) : null;
  const StatusIcon = statusConfig?.icon || AlertCircle;

  return (
    <ProviderLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Provider Dashboard</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your facility
            </p>
          </div>
          <Button asChild className="w-fit">
            <Link to="/provider/listing">
              <Building2 className="mr-2 h-4 w-4" />
              Edit Listing
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Listing Status */}
          <Card className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${statusConfig?.bgClass || 'bg-muted'} opacity-50`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Listing Status
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg ${statusConfig?.bgClass || 'bg-muted'} flex items-center justify-center`}>
                <StatusIcon className={`h-4 w-4 ${statusConfig?.textClass || 'text-muted-foreground'}`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${statusConfig?.badgeClass || 'bg-muted text-muted-foreground border-border'}`}>
                {statusConfig?.label || "No Listing"}
              </span>
            </CardContent>
          </Card>

          {/* Subscription Plan */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-primary/5 opacity-50" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Plan
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-xl font-bold text-foreground">Free Trial</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                30 days remaining
              </p>
            </CardContent>
          </Card>

          {/* Total Leads */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-blue-500/5 opacity-50" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold text-foreground">{leadsCount}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <TrendingUp className="h-3 w-3" />
                Last 30 days
              </p>
            </CardContent>
          </Card>

          {/* Quick Action */}
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full bg-primary-foreground/10" />
            <CardHeader className="pb-2 relative">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">
                Quick Action
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-lg font-semibold mb-3">View all leads</p>
              <Button 
                asChild 
                variant="secondary" 
                size="sm"
                className="shadow-md"
              >
                <Link to="/provider/leads">
                  View Leads
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Latest Leads Preview */}
        <Card className="shadow-sm">
          <CardHeader className="border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Latest Leads</CardTitle>
                  <p className="text-sm text-muted-foreground">Recent contact requests</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/provider/leads">
                  View All
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leadsCount === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="font-semibold text-foreground">No leads yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  When families submit contact requests for your facility, they'll appear here.
                </p>
              </div>
            ) : (
              <p className="p-6 text-muted-foreground">Lead list would appear here</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
