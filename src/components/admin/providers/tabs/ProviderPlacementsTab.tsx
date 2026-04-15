import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Handshake, CheckCircle, Clock, XCircle, DollarSign, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Facility } from "../ProviderListItem";

interface ProviderPlacementsTabProps {
  provider: Facility;
  providerFacilities?: Facility[];
}

export function ProviderPlacementsTab({ provider, providerFacilities }: ProviderPlacementsTabProps) {
  const facilityIds = providerFacilities?.map((f) => f.id) || [provider.id];

  const { data: introductions, isLoading: loadingIntros } = useQuery({
    queryKey: ["admin-provider-introductions", provider.user_id, facilityIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("concierge_introductions")
        .select("id, facility_id, inquiry_id, sent_at, provider_response, provider_responded_at, provider_notes, seeker_contacted, seeker_contacted_at")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: engagements, isLoading: loadingEngagements } = useQuery({
    queryKey: ["admin-provider-engagements", provider.user_id, facilityIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("concierge_engagements")
        .select("id, facility_id, concierge_inquiry_id, status, engaged_at, outcome_at, outcome_notes, unlock_price_cents, payment_method, contacted_at")
        .in("facility_id", facilityIds)
        .order("engaged_at", { ascending: false });
      return data || [];
    },
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["admin-provider-placement-invoices", provider.user_id, facilityIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("placement_invoices")
        .select("id, facility_id, case_id, amount_cents, status, created_at, paid_at, fee_type")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const isLoading = loadingIntros || loadingEngagements || loadingInvoices;
  const totalPlacementRevenue = invoices?.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount_cents, 0) || 0;
  const activePlacements = engagements?.filter((e) => ["admitted", "completed"].includes(e.status)).length || 0;

  const facilityName = (id: string) => providerFacilities?.find((f) => f.id === id)?.name || "—";
  const showFacilityCol = facilityIds.length > 1;

  const getResponseBadge = (response: string | null) => {
    if (!response) return <Badge variant="outline" className="text-xs">Pending</Badge>;
    if (response === "interested") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">Interested</Badge>;
    if (response === "declined") return <Badge variant="destructive" className="text-xs">Declined</Badge>;
    return <Badge variant="outline" className="text-xs">{response}</Badge>;
  };

  const getEngagementStatusBadge = (status: string) => {
    const styles: Record<string, { cls: string; icon: any }> = {
      engaged: { cls: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Clock },
      contacted: { cls: "bg-amber-500/10 text-amber-600 border-amber-200", icon: ArrowRight },
      placed: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle },
      closed: { cls: "bg-muted text-muted-foreground", icon: XCircle },
    };
    const s = styles[status] || styles.engaged;
    const Icon = s.icon;
    return <Badge variant="outline" className={`${s.cls} text-xs gap-1`}><Icon className="h-3 w-3" />{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{introductions?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Introductions</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{engagements?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Engagements</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{activePlacements}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">${(totalPlacementRevenue / 100).toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </CardContent></Card>
      </div>

      {/* Introductions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="h-4 w-4 text-purple-500" />
            Introductions ({introductions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {introductions && introductions.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Sent</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Seeker Contacted</TableHead>
                    {showFacilityCol && <TableHead>Facility</TableHead>}
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {introductions.map((intro) => (
                    <TableRow key={intro.id}>
                      <TableCell className="text-sm">
                        {intro.sent_at ? format(new Date(intro.sent_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>{getResponseBadge(intro.provider_response)}</TableCell>
                      <TableCell>
                        {intro.seeker_contacted ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 text-xs gap-1">
                            <CheckCircle className="h-3 w-3" />Yes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      {showFacilityCol && (
                        <TableCell><span className="text-xs text-muted-foreground">{facilityName(intro.facility_id)}</span></TableCell>
                      )}
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{intro.provider_notes || "—"}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Handshake className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No introductions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placement Invoices */}
      {invoices && invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Placement Invoices ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    {showFacilityCol && <TableHead>Facility</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{format(new Date(inv.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{inv.fee_type || "placement"}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">${(inv.amount_cents / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        {inv.status === "paid" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">{inv.status}</Badge>
                        )}
                      </TableCell>
                      {showFacilityCol && (
                        <TableCell><span className="text-xs text-muted-foreground">{facilityName(inv.facility_id)}</span></TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
