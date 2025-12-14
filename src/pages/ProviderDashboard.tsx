import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Settings,
  BarChart3,
  LogOut,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

const providerNavLinks = [
  { href: "/provider-dashboard", label: "Dashboard" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/provider-support", label: "Support" },
];

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
}

interface Facility {
  id: string;
  name: string;
  facility_type: string;
  city: string;
  state: string;
  status: string;
  created_at: string;
}

export default function ProviderDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/provider-login");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch facilities
      const { data: facilitiesData } = await supabase
        .from("facilities")
        .select("id, name, facility_type, city, state, status, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (facilitiesData) {
        setFacilities(facilitiesData);
      }

      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/provider-login");
        }
      }
    );

    checkAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully logged out.",
    });
    navigate("/provider-login");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "pending":
        return "Pending Review";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        navLinks={providerNavLinks}
        ctaLink="#"
        ctaLabel="Sign Out"
        variant="provider"
      />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-primary py-8 md:py-10">
          <div className="container">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">
                  Welcome back, {profile?.first_name || "Provider"}
                </h1>
                <p className="mt-1 text-primary-foreground/80">
                  Manage your facility listings and view performance.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="gap-2 w-fit"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </section>

        {/* Dashboard Content */}
        <section className="py-10 md:py-14">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Facilities */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl font-bold text-foreground">
                      Your Facilities
                    </h2>
                    <Button asChild size="sm">
                      <Link to="/provider-signup">Add Facility</Link>
                    </Button>
                  </div>

                  {facilities.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 font-semibold text-foreground">No facilities yet</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Add your first treatment facility to start connecting with families.
                      </p>
                      <Button asChild className="mt-4">
                        <Link to="/provider-signup">Add Your Facility</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {facilities.map((facility) => (
                        <div
                          key={facility.id}
                          className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{facility.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {facility.facility_type} • {facility.city}, {facility.state}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                              {getStatusIcon(facility.status)}
                              <span className="text-xs font-medium">
                                {getStatusLabel(facility.status)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1">
                              <Settings className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1">
                              <BarChart3 className="h-3 w-3" />
                              Analytics
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Facilities</span>
                      <span className="font-semibold">{facilities.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Listings</span>
                      <span className="font-semibold">
                        {facilities.filter((f) => f.status === "approved").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pending Review</span>
                      <span className="font-semibold">
                        {facilities.filter((f) => f.status === "pending").length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Help */}
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
                  <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Our support team is here to help you succeed.
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link to="/provider-support">Contact Support</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
