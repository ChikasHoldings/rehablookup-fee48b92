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
  ArrowRight
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

      // Fetch first facility
      const { data: facilityData } = await supabase
        .from("facilities")
        .select("id, name, status")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (facilityData) {
        setFacility(facilityData);
      }

      // Note: Leads count would come from a leads table when implemented
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
          className: "text-green-600 bg-green-50" 
        };
      case "pending":
        return { 
          label: "Pending Review", 
          icon: Clock, 
          className: "text-amber-600 bg-amber-50" 
        };
      default:
        return { 
          label: "Inactive", 
          icon: AlertCircle, 
          className: "text-muted-foreground bg-muted" 
        };
    }
  };

  const statusConfig = facility ? getStatusConfig(facility.status) : null;
  const StatusIcon = statusConfig?.icon || AlertCircle;

  return (
    <ProviderLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your facility and activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Listing Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Listing Status
              </CardTitle>
              <StatusIcon className={`h-5 w-5 ${statusConfig?.className.split(' ')[0] || 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${statusConfig?.className || 'text-muted-foreground bg-muted'}`}>
                  {statusConfig?.label || "No Listing"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Plan */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Subscription Plan
              </CardTitle>
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-foreground">Free Trial</p>
              <p className="text-sm text-muted-foreground">30 days remaining</p>
            </CardContent>
          </Card>

          {/* Total Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{leadsCount}</p>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          {/* Quick Action */}
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">
                Quick Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                asChild 
                variant="secondary" 
                className="w-full"
              >
                <Link to="/provider/listing">
                  Edit Listing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Latest Leads Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Latest Leads</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/provider/leads">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leadsCount === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="mt-3 text-muted-foreground">No leads yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Leads will appear here when families contact you
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Lead list would appear here</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
