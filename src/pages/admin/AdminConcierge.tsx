import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw, UserCheck, HeartHandshake, Building2, Receipt, Globe, Flag, Filter, DollarSign, FileText, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";
import { ConciergeDetailSheet } from "@/components/admin/ConciergeDetailSheet";
import { ConciergeStatsCharts } from "@/components/admin/ConciergeStatsCharts";
import { PlacementPipelineBoard } from "@/components/admin/concierge/PlacementPipelineBoard";
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

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminConcierge() {
  const { user, adminRole } = useAdminAuth();
  const isAdvisor = adminRole === "advisor";
  
  const [activeTab, setActiveTab] = useState("domestic");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 350);
  const [statusFilter, setStatusFilter] = useState<CaseStatus>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [advisorFilter, setAdvisorFilter] = useState<"mine" | "all">(isAdvisor ? "mine" : "all");
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");

  const { data: cases, isLoading, refetch } = useQuery({
    queryKey: ["admin-concierge-cases", statusFilter, advisorFilter, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, payment_status, level_of_care, desired_location_state, preferred_state, match_count, assigned_advisor_id, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter === "in_progress") {
        query = query.in("status", IN_PROGRESS_STATUSES);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (advisorFilter === "mine" && user?.id) {
        query = query.eq("assigned_advisor_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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
      const statusKeys = ["new", "reviewing", "matching", "matched", "introductions_sent", "in_contact", "placed", "closed"];
      const results = await Promise.all(
        statusKeys.map(s =>
          supabase.from("concierge_inquiries").select("id", { count: "exact", head: true }).eq("status", s)
        )
      );
      const counts: Record<string, number> = {};
      statusKeys.forEach((key, i) => {
        counts[key] = results[i].count || 0;
      });
      return counts;
    },
  });

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

  // Fetch full case data when a case is selected
  const { data: selectedCase } = useQuery({
    queryKey: ["admin-concierge-case-detail", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return undefined;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("*")
        .eq("id", selectedCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCaseId,
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

  const handleStatusClick = (status: string) => {
    setStatusFilter(status as CaseStatus);
  };

  const getAdvisorName = (advisorId: string | null) => {
    if (!advisorId) return "—";
    const advisor = adminStaff?.find(a => a.user_id === advisorId);
    return advisor ? (advisor.display_name || `${advisor.first_name} ${advisor.last_name}`) : "—";
  };

  // Build advisor name map for pipeline board
  const advisorNames: Record<string, string> = {};
  adminStaff?.forEach(a => {
    advisorNames[a.user_id] = a.display_name || `${a.first_name} ${a.last_name}`;
  });

  const isPaid = (status: string) => status === 'paid' || status === 'succeeded';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header */}
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

      {/* Main Tabs */}
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
          <ConciergeStatsCharts 
            stats={stats} 
            onStatusClick={handleStatusClick}
            activeStatus={statusFilter}
          />

          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border-b gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8 sm:pl-10 w-full sm:w-[300px] h-9 text-sm"
                  />
                </div>
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
              <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                {filteredCases?.length || 0} domestic cases
              </span>
            </div>
            <div className="p-3 sm:p-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : filteredCases?.length === 0 ? (
                <div className="text-center py-12">
                  <HeartHandshake className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No cases found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your filters or search</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium min-w-[120px]">Name</th>
                        <th className="pb-3 font-medium min-w-[180px]">Contact</th>
                        <th className="pb-3 font-medium min-w-[100px]">Care Type</th>
                        <th className="pb-3 font-medium min-w-[80px]">Location</th>
                        <th className="pb-3 font-medium min-w-[100px]">Status</th>
                        <th className="pb-3 font-medium min-w-[80px]">Payment</th>
                        <th className="pb-3 font-medium min-w-[100px]">Advisor</th>
                        <th className="pb-3 font-medium min-w-[60px]">Matches</th>
                        <th className="pb-3 font-medium min-w-[90px]">Date</th>
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
                          <td className="py-3">{c.level_of_care || "—"}</td>
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
                                isPaid(c.payment_status)
                                  ? "bg-success/10 text-success border-success/30" 
                                  : "bg-destructive/10 text-destructive border-destructive/30"
                              }
                            >
                              {isPaid(c.payment_status) ? '✓ Paid' : '⚠ Unpaid'}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            {getAdvisorName(c.assigned_advisor_id)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1 tabular-nums">
                              {c.match_count || 0}
                              {c.match_count && c.match_count > 0 && (
                                <UserCheck className="h-4 w-4 text-success" />
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

        <TabsContent value="international">
          <InternationalCasesTab />
        </TabsContent>

        <TabsContent value="providers">
          <NetworkProvidersTab />
        </TabsContent>

        <TabsContent value="invoices">
          <AllInvoicesTab />
        </TabsContent>
      </Tabs>

      <ConciergeDetailSheet
        caseData={selectedCase}
        open={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
