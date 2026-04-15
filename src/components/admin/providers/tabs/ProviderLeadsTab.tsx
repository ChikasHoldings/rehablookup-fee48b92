import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { Inbox, BadgeCheck, Lock, Unlock, DollarSign, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatSourceLabel } from "@/lib/sourceLabels";
import type { Facility } from "../ProviderListItem";

interface ProviderLeadsTabProps {
  provider: Facility;
  providerFacilities: Facility[];
}

export function ProviderLeadsTab({ provider, providerFacilities }: ProviderLeadsTabProps) {
  const [facilityFilter, setFacilityFilter] = useState<string>("all");

  const facilityIds = providerFacilities?.map((f) => f.id) || [provider.id];
  const filteredIds = facilityFilter === "all" ? facilityIds : [facilityFilter];

  // Fetch leads across all facilities
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-provider-all-leads", provider.user_id, facilityFilter],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, facility_id, name, email, phone, status, source, created_at, urgency, lead_score, credit_cost, redistribution_status, original_facility_id")
        .in("facility_id", filteredIds)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Fetch unlock data for these leads
  const { data: unlocks } = useQuery({
    queryKey: ["admin-provider-unlocks", provider.user_id, facilityFilter],
    queryFn: async () => {
      if (!leads?.length) return {};
      const leadIds = leads.map((l) => l.id);
      const { data } = await supabase
        .from("lead_unlocks")
        .select("lead_id, unlock_price_cents, unlocked_at, payment_method")
        .in("lead_id", leadIds);
      const map: Record<string, any> = {};
      data?.forEach((u) => { map[u.lead_id] = u; });
      return map;
    },
    enabled: !!leads?.length,
  });

  const totalRevenue = Object.values(unlocks || {}).reduce((sum: number, u: any) => sum + (u.unlock_price_cents || 0), 0);

  const getLeadStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: "bg-info/10 text-info border-info/20",
      contacted: "bg-success/10 text-success border-success/20",
      unlocked: "bg-chart-3/10 text-chart-3 border-chart-3/20",
      responding: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      closed: "bg-muted text-muted-foreground",
      expired: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  const facilityName = (id: string) => providerFacilities?.find((f) => f.id === id)?.name || "—";

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold">Leads ({leads?.length || 0})</h3>
          <p className="text-sm text-muted-foreground">
            Unlock revenue: <span className="font-semibold text-foreground">${(totalRevenue / 100).toFixed(2)}</span>
          </p>
        </div>
        {providerFacilities && providerFacilities.length > 1 && (
          <Select value={facilityFilter} onValueChange={setFacilityFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by facility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              {providerFacilities.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Locked: {leads?.filter((l) => !unlocks?.[l.id]).length || 0}</Badge>
        <Badge variant="outline" className="gap-1 text-emerald-600"><Unlock className="h-3 w-3" /> Unlocked: {Object.keys(unlocks || {}).length}</Badge>
        <Badge variant="outline" className="gap-1"><ArrowRightLeft className="h-3 w-3" /> Redistributed: {leads?.filter((l) => l.redistribution_status === "extended").length || 0}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : leads && leads.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unlock</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Source</TableHead>
                {providerFacilities.length > 1 && <TableHead>Facility</TableHead>}
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const unlock = unlocks?.[lead.id];
                const isRedistributed = lead.original_facility_id && lead.original_facility_id !== lead.facility_id;
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getLeadStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      {unlock ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1 text-xs">
                          <Unlock className="h-3 w-3" />
                          {format(new Date(unlock.unlocked_at), "MMM d")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {unlock ? `$${(unlock.unlock_price_cents / 100).toFixed(2)}` : lead.credit_cost ? `$${(lead.credit_cost / 100).toFixed(2)}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">{formatSourceLabel(lead.source)}</Badge>
                        {isRedistributed && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                            <ArrowRightLeft className="h-3 w-3 mr-0.5" />Redist.
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {providerFacilities.length > 1 && (
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{facilityName(lead.facility_id)}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          <Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No leads received yet</p>
        </div>
      )}
    </div>
  );
}
