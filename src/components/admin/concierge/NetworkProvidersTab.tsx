import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Building2,
  CheckCircle2,
  CreditCard,
  AlertCircle,
} from "lucide-react";

interface NetworkProvider {
  id: string;
  name: string;
  city: string;
  state: string;
  email: string | null;
  phone: string;
  concierge_network_opted_in: boolean | null;
  concierge_opted_in_at: string | null;
  concierge_terms_accepted_at: string | null;
  concierge_availability_status: string | null;
  concierge_accepted_care_types: Json;
  concierge_admissions_email: string | null;
  concierge_admissions_phone: string | null;
  user_id: string;
}

const AVAILABILITY_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  accepting: { label: "Accepting", variant: "default" },
  limited: { label: "Limited", variant: "secondary" },
  paused: { label: "Paused", variant: "outline" },
  not_accepting: { label: "Not Accepting", variant: "destructive" },
};

export function NetworkProvidersTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch facilities opted into concierge network
  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-network-providers", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("facilities")
        .select(`
          id,
          name,
          city,
          state,
          email,
          phone,
          user_id,
          concierge_network_opted_in,
          concierge_opted_in_at,
          concierge_terms_accepted_at,
          concierge_availability_status,
          concierge_accepted_care_types,
          concierge_admissions_email,
          concierge_admissions_phone
        `)
        .eq("concierge_network_opted_in", true)
        .order("concierge_opted_in_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("concierge_availability_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NetworkProvider[];
    },
  });

  // Fetch payment method status for facilities
  const { data: paymentMethods } = useQuery({
    queryKey: ["admin-provider-payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_payment_methods")
        .select("facility_id, is_default")
        .eq("is_default", true);
      if (error) throw error;
      return new Set(data?.map(pm => pm.facility_id) || []);
    },
  });

  // Fetch placement counts per facility
  const { data: placementCounts } = useQuery({
    queryKey: ["admin-placement-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("placed_facility_id")
        .not("placed_facility_id", "is", null);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(inquiry => {
        if (inquiry.placed_facility_id) {
          counts[inquiry.placed_facility_id] = (counts[inquiry.placed_facility_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const filteredProviders = providers?.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: providers?.length || 0,
    accepting: providers?.filter(p => p.concierge_availability_status === "accepting").length || 0,
    withPayment: providers?.filter(p => paymentMethods?.has(p.id)).length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 flex-1" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            Network Providers
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Accepting Placements
          </div>
          <p className="text-2xl font-bold text-success">{stats.accepting}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment Ready
          </div>
          <p className="text-2xl font-bold text-primary">{stats.withPayment}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="accepting">Accepting</SelectItem>
            <SelectItem value="limited">Limited</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="not_accepting">Not Accepting</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filteredProviders?.length || 0} providers
        </span>
      </div>

      {/* Providers Table */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Care Types</TableHead>
                <TableHead>Placements</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProviders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No network providers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProviders?.map((provider) => {
                  const hasPayment = paymentMethods?.has(provider.id);
                  const placements = placementCounts?.[provider.id] || 0;
                  const careTypes = provider.concierge_accepted_care_types as string[] | null;
                  
                  return (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {provider.concierge_admissions_email || provider.email || "No email"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {provider.city}, {provider.state}
                      </TableCell>
                      <TableCell>
                        {provider.concierge_availability_status ? (
                          <Badge variant={AVAILABILITY_CONFIG[provider.concierge_availability_status]?.variant || "secondary"}>
                            {AVAILABILITY_CONFIG[provider.concierge_availability_status]?.label || provider.concierge_availability_status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Set</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {careTypes && careTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {careTypes.slice(0, 2).map((type, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                            {careTypes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{careTypes.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={placements > 0 ? "font-medium text-success" : "text-muted-foreground"}>
                          {placements}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasPayment ? (
                          <div className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs">Ready</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">Missing</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {provider.concierge_opted_in_at
                          ? format(new Date(provider.concierge_opted_in_at), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
