import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Users, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { ConciergeDetailSheet } from "@/components/admin/ConciergeDetailSheet";
import { ConciergeStatsCharts } from "@/components/admin/ConciergeStatsCharts";

type CaseStatus = 'new' | 'reviewing' | 'matching' | 'matched' | 'introductions_sent' | 'in_contact' | 'placed' | 'closed' | 'all';

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  reviewing: { label: "Reviewing", variant: "secondary" },
  matching: { label: "Matching", variant: "secondary" },
  matched: { label: "Matched", variant: "outline" },
  introductions_sent: { label: "Intros Sent", variant: "outline" },
  in_contact: { label: "In Contact", variant: "secondary" },
  placed: { label: "Placed", variant: "default" },
  closed: { label: "Closed", variant: "destructive" },
};

export default function AdminConcierge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus>("all");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { data: cases, isLoading, refetch } = useQuery({
    queryKey: ["admin-concierge-cases", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("concierge_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Concierge Cases</h1>
          <p className="text-muted-foreground">Manage placement inquiries and matching</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Interactive Stats Charts */}
      <ConciergeStatsCharts 
        stats={stats} 
        onStatusClick={handleStatusClick}
        activeStatus={statusFilter}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cases ({filteredCases?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                    <th className="pb-3 font-medium">Payment</th>
                    <th className="pb-3 font-medium">Status</th>
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
                      <td className="py-3">{c.level_of_care || "Not specified"}</td>
                      <td className="py-3">
                        {c.desired_location_state || c.preferred_state || "Any"}
                      </td>
                      <td className="py-3">{c.payment_type || "Not specified"}</td>
                      <td className="py-3">
                        <Badge variant={STATUS_CONFIG[c.status]?.variant || "secondary"}>
                          {STATUS_CONFIG[c.status]?.label || c.status}
                        </Badge>
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
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <ConciergeDetailSheet
        caseData={selectedCase}
        open={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={() => refetch()}
      />
    </div>
  );
}
