import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw, UserCheck, HeartHandshake, Building2, Receipt, Users, Globe, Flag, Filter, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { ConciergeDetailSheet } from "@/components/admin/ConciergeDetailSheet";
import { ConciergeStatsCharts } from "@/components/admin/ConciergeStatsCharts";
import { NetworkProvidersTab } from "@/components/admin/concierge/NetworkProvidersTab";
import { AllInvoicesTab } from "@/components/admin/concierge/AllInvoicesTab";
import { InternationalCasesTab } from "@/components/admin/concierge/InternationalCasesTab";

type CaseStatus = 'new' | 'in_progress' | 'placed' | 'closed' | 'all';

const IN_PROGRESS_STATUSES = ['reviewing', 'matching', 'matched', 'introductions_sent', 'in_contact'];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  reviewing: { label: "Reviewing", variant: "secondary" },
  matching: { label: "Placing", variant: "secondary" },
  matched: { label: "Facilities Found", variant: "outline" },
  introductions_sent: { label: "Intros Sent", variant: "outline" },
  in_contact: { label: "In Contact", variant: "secondary" },
  placed: { label: "Placed", variant: "default" },
  closed: { label: "Closed", variant: "destructive" },
};

export default function AdminConcierge() {
  const { user, adminRole } = useAdminAuth();
  const isAdvisor = adminRole === "advisor";
  
  const [activeTab, setActiveTab] = useState("domestic");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  // Advisors default to seeing only their cases
  const [advisorFilter, setAdvisorFilter] = useState<"mine" | "all">(isAdvisor ? "mine" : "all");

  const { data: cases, isLoading, refetch } = useQuery({
    queryKey: ["admin-concierge-cases", statusFilter, advisorFilter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("concierge_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter === "in_progress") {
        query = query.in("status", IN_PROGRESS_STATUSES);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Filter to advisor's own cases
      if (advisorFilter === "mine" && user?.id) {
        query = query.eq("assigned_advisor_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch admin staff for advisor display
  const { data: adminStaff } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_user_profiles")
        .select("user_id, first_name, last_name, display_name")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-concierge-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("status");
      
      if (error) throw error;

      const counts: Record<string, number> = {
        new: 0,
        reviewing: 0,
        matching: 0,
        matched: 0,
        introductions_sent: 0,
        in_contact: 0,
        placed: 0,
        closed: 0,
      };

      data?.forEach((c) => {
        if (counts[c.status] !== undefined) {
          counts[c.status]++;
        }
      });

      return counts;
    },
  });

  // Fetch network provider count for tab badge
  const { data: networkCount } = useQuery({
    queryKey: ["admin-network-provider-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("facilities")
        .select("id", { count: "exact", head: true })
        .eq("concierge_network_opted_in", true);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch international cases count
  const { data: internationalCount } = useQuery({
    queryKey: ["admin-international-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("international_placement_cases")
        .select("id", { count: "exact", head: true })
        .not("status", "eq", "closed");
      if (error) throw error;
      return count || 0;
    },
  });

  const filteredCases = cases?.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.user_name?.toLowerCase().includes(q) ||
      c.user_email?.toLowerCase().includes(q) ||
      c.user_phone?.includes(q)
    );
  });

  const selectedCase = cases?.find((c) => c.id === selectedCaseId);

  const handleStatusClick = (status: string) => {
    setStatusFilter(status as CaseStatus);
  };

  const getAdvisorName = (advisorId: string | null) => {
    if (!advisorId) return "—";
    const advisor = adminStaff?.find(a => a.user_id === advisorId);
    return advisor ? (advisor.display_name || `${advisor.first_name} ${advisor.last_name}`) : "—";
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header - responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">Placement Command Center</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage domestic & international placements, network providers, and billing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isAdvisor && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/placement-revenue">
                  <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  <span className="text-xs sm:text-sm">Revenue</span>
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/international/agreement">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                  <span className="text-xs sm:text-sm hidden sm:inline">Agreement</span>
                </Link>
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="text-xs sm:text-sm">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Tabs - horizontally scrollable on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className={`inline-flex w-auto sm:grid sm:w-full ${isAdvisor ? "sm:grid-cols-2 sm:max-w-xs" : "sm:grid-cols-4 sm:max-w-lg"}`}>
            <TabsTrigger value="domestic" className="flex items-center gap-1.5 px-3 sm:gap-2 whitespace-nowrap">
              <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Domestic</span>
            </TabsTrigger>
            <TabsTrigger value="international" className="flex items-center gap-1.5 px-3 sm:gap-2 whitespace-nowrap">
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Intl</span>
              {internationalCount ? (
                <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                  {internationalCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            {!isAdvisor && (
              <>
                <TabsTrigger value="providers" className="flex items-center gap-1.5 px-3 sm:gap-2 whitespace-nowrap">
                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Network</span>
                  {networkCount ? (
                    <Badge variant="secondary" className="ml-1 h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs">
                      {networkCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-1.5 px-3 sm:gap-2 whitespace-nowrap">
                  <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Invoices</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Domestic Cases Tab */}
        <TabsContent value="domestic" className="space-y-3 sm:space-y-4">
          {/* Pipeline Stats */}
          <ConciergeStatsCharts 
            stats={stats} 
            onStatusClick={handleStatusClick}
            activeStatus={statusFilter}
          />

          {/* Search & Table */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-10 w-full sm:w-[300px] h-9 text-sm"
                  />
                </div>
                {/* Advisor filter toggle */}
                {isAdvisor && (
                  <Button
                    variant={advisorFilter === "mine" ? "default" : "outline"}
                    size="sm"
                    className="h-9 text-xs whitespace-nowrap"
                    onClick={() => setAdvisorFilter(advisorFilter === "mine" ? "all" : "mine")}
                  >
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    {advisorFilter === "mine" ? "My Cases" : "All Cases"}
                  </Button>
                )}
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {filteredCases?.length || 0} domestic cases
              </span>
            </div>
            <div className="p-3 sm:p-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredCases?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No cases found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Contact</th>
                        <th className="pb-3 font-medium">Care Type</th>
                        <th className="pb-3 font-medium">Location</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Payment</th>
                        <th className="pb-3 font-medium">Advisor</th>
                        <th className="pb-3 font-medium">Matches</th>
                        <th className="pb-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases?.map((c) => (
                        <tr
                          key={c.id}
                          className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedCaseId(c.id)}
                        >
                          <td className="py-3 font-medium">{c.user_name}</td>
                          <td className="py-3">
                            <div className="text-sm">{c.user_email}</div>
                            <div className="text-xs text-muted-foreground">{c.user_phone}</div>
                          </td>
                          <td className="py-3">{c.level_of_care || "To be determined"}</td>
                          <td className="py-3">
                            {c.desired_location_state || c.preferred_state || "Any"}
                          </td>
                          <td className="py-3">
                            <Badge variant={STATUS_CONFIG[c.status]?.variant || "secondary"}>
                              {STATUS_CONFIG[c.status]?.label || c.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge 
                              variant="outline" 
                              className={
                                (c.payment_status === 'paid' || c.payment_status === 'succeeded') 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" 
                                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                              }
                            >
                              {(c.payment_status === 'paid' || c.payment_status === 'succeeded') ? '✓ Paid' : '⚠ Unpaid'}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {getAdvisorName(c.assigned_advisor_id)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              {c.match_count || 0}
                              {c.match_count && c.match_count > 0 && (
                                <UserCheck className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* International Cases Tab */}
        <TabsContent value="international">
          <InternationalCasesTab />
        </TabsContent>

        {/* Network Providers Tab */}
        <TabsContent value="providers">
          <NetworkProvidersTab />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <AllInvoicesTab />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet for Domestic Cases */}
      <ConciergeDetailSheet
        caseData={selectedCase}
        open={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
