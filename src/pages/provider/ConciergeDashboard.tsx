import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { format } from "date-fns";
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  DollarSign,
  MessageSquare,
  ArrowRight,
  Building2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { ConciergeTourRequests } from "@/components/provider/ConciergeTourRequests";
import { ConciergeMessages } from "@/components/provider/ConciergeMessages";
import { ConciergeIntroductionCard } from "@/components/provider/ConciergeIntroductionCard";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function ProviderConciergeDashboard() {
  const { selectedFacility } = useSelectedFacility();

  // Fetch facility concierge status
  const { data: facilityData, isLoading: facilityLoading } = useQuery({
    queryKey: ["concierge-status", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return null;
      const { data, error } = await supabase
        .from("facilities")
        .select("concierge_network_opted_in, concierge_opted_in_at, concierge_availability_status")
        .eq("id", selectedFacility.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch pending introductions from concierge_introductions
  const { data: introductions, isLoading: introductionsLoading } = useQuery({
    queryKey: ["provider-introductions", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("concierge_introductions")
        .select(`
          *,
          concierge_inquiries (
            id, user_name, level_of_care, payment_type, timeline_urgency, 
            preferred_state, status, primary_concern, gender, age_range,
            seeker_confirmed, seeker_confirmed_at, placement_confirmed, placement_confirmed_at
          )
        `)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Check for Pro subscription
  const { data: proSubscription } = useQuery({
    queryKey: ["pro-subscription", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return null;
      const { data } = await supabase
        .from("pro_subscriptions")
        .select("status")
        .eq("facility_id", selectedFacility.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!selectedFacility?.id,
  });

  const hasPro = !!proSubscription;

  // Fetch active placements (admitted cases)
  const { data: placements, isLoading: placementsLoading } = useQuery({
    queryKey: ["provider-placements", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await supabase
        .from("placement_cases")
        .select("*")
        .eq("admitted_facility_id", selectedFacility.id)
        .order("admitted_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["provider-invoices", selectedFacility?.id],
    queryFn: async () => {
      if (!selectedFacility?.id) return [];
      const { data, error } = await (supabase as any)
        .from("placement_invoices")
        .select(`
          *,
          concierge_inquiries(user_name)
        `)
        .eq("facility_id", selectedFacility.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedFacility?.id,
  });

  const isLoading = facilityLoading || introductionsLoading || placementsLoading || invoicesLoading;
  const isOptedIn = facilityData?.concierge_network_opted_in;

  // Calculate stats - updated for concierge_introductions
  const pendingIntroductions = introductions?.filter((i: any) => !i.provider_response || i.provider_response === "pending") || [];
  const respondedIntroductions = introductions?.filter((i: any) => i.provider_response && i.provider_response !== "pending") || [];
  const acceptedIntroductions = introductions?.filter((i: any) => i.provider_response === "interested") || [];
  // Cases where seeker confirmed but provider hasn't yet
  const awaitingProviderConfirm = introductions?.filter((i: any) => 
    i.concierge_inquiries?.seeker_confirmed && !i.concierge_inquiries?.placement_confirmed
  ) || [];
  const activePlacements = placements?.filter((p: any) => p.status === "admitted") || [];
  const pendingInvoices = invoices?.filter((i: any) => i.status === "pending" || i.status === "sent") || [];
  const totalRevenue = invoices?.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + i.amount_cents, 0) || 0;

  if (!selectedFacility) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-5xl mx-auto text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">No Facility Selected</h2>
          <p className="text-muted-foreground mt-2">Please select a facility to view the concierge dashboard.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!isOptedIn) {
    return (
      <div className="min-h-full bg-background p-6">
        <div className="max-w-5xl mx-auto">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Join the Placement Network</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Receive matched placement referrals from families working with our specialists. Pay only when a patient is successfully placed.
              </p>
              <Button asChild>
                <Link to="/provider/placement-network">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Concierge Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your placement referrals and billing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={facilityData?.concierge_availability_status === "open" ? "default" : "secondary"}>
              {facilityData?.concierge_availability_status === "open" ? "Accepting Referrals" : "Limited Availability"}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link to="/provider/placement-network">
                Network Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingIntroductions.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activePlacements.length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{acceptedIntroductions.length}</p>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Invoices Alert */}
        {pendingInvoices.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      {pendingInvoices.length} pending invoice{pendingInvoices.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Total: {formatCurrency(pendingInvoices.reduce((sum: number, i: any) => sum + i.amount_cents, 0))}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-amber-300" asChild>
                  <Link to="/provider/placement-network?tab=billing">View Invoices</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="introductions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="introductions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Intros</span>
              {pendingIntroductions.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {pendingIntroductions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="tours" className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Tours</span>
            </TabsTrigger>
            <TabsTrigger value="placements" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Placed</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          {/* Introductions Tab */}
          <TabsContent value="introductions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Introductions</CardTitle>
                <CardDescription>Cases matched to your facility by our placement team</CardDescription>
              </CardHeader>
              <CardContent>
                {introductions && introductions.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3 pr-4">
                      {introductions.map((intro: any) => (
                        <ConciergeIntroductionCard 
                          key={intro.id} 
                          introduction={intro}
                          facilityId={selectedFacility?.id || ""}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No introductions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cases matching your profile will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <ConciergeMessages />
          </TabsContent>

          {/* Tours Tab */}
          <TabsContent value="tours">
            <ConciergeTourRequests />
          </TabsContent>

          {/* Placements Tab */}
          <TabsContent value="placements">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Placements</CardTitle>
                <CardDescription>Patients successfully placed at your facility</CardDescription>
              </CardHeader>
              <CardContent>
                {placements && placements.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {placements.map((placement: any) => (
                        <div 
                          key={placement.id} 
                          className="p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{placement.seeker_name}</span>
                                <Badge variant="default" className="bg-emerald-100 text-emerald-700">
                                  Admitted
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                {placement.level_of_care && <span>{placement.level_of_care}</span>}
                                {placement.payment_type && <span>• {placement.payment_type}</span>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Admitted {placement.admitted_at ? format(new Date(placement.admitted_at), "MMM d, yyyy") : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No placements yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Admitted patients will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing History</CardTitle>
                <CardDescription>Invoices for placement fees</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices && invoices.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {invoices.map((invoice: any) => (
                        <div 
                          key={invoice.id} 
                          className="p-4 rounded-lg border bg-card flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatCurrency(invoice.amount_cents)}</span>
                              <Badge variant={
                                invoice.status === "paid" ? "default" :
                                invoice.status === "pending" || invoice.status === "sent" ? "secondary" :
                                "destructive"
                              }>
                                {invoice.status === "paid" ? "Paid" :
                                 invoice.status === "pending" ? "Pending" :
                                 invoice.status === "sent" ? "Sent" :
                                 invoice.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {invoice.placement_cases?.seeker_name || "Placement Fee"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(invoice.created_at), "MMM d, yyyy")}
                              {invoice.paid_at && ` • Paid ${format(new Date(invoice.paid_at), "MMM d, yyyy")}`}
                            </p>
                          </div>
                          {invoice.stripe_payment_link && (invoice.status === "pending" || invoice.status === "sent") && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={invoice.stripe_payment_link} target="_blank" rel="noopener noreferrer">
                                Pay Now
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No invoices yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Billing history will appear here after placements
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
