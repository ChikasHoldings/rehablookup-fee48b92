import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Users,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProviderDirectoryDetailModal } from "@/components/admin/ProviderDirectoryDetailModal";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface ProviderRow {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  email: string | null;
  website: string | null;
  facility_type: string;
  status: string;
  concierge_network_opted_in: boolean | null;
  concierge_availability_status: string | null;
  concierge_admissions_email: string | null;
  concierge_admissions_phone: string | null;
  logo_url: string | null;
  verified: boolean | null;
  bed_count: string | null;
}

export default function AdvisorProviderDirectory() {
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 350);
  const [tab, setTab] = useState("all");

  const [selectedProvider, setSelectedProvider] = useState<ProviderRow | null>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["advisor-providers", tab, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("facilities")
        .select("id, name, city, state, phone, email, website, facility_type, status, concierge_network_opted_in, concierge_availability_status, concierge_admissions_email, concierge_admissions_phone, logo_url, verified, bed_count")
        .eq("status", "approved")
        .order("name", { ascending: true })
        .limit(500);

      if (tab === "enrolled") {
        query = query.eq("concierge_network_opted_in", true);
      } else if (tab === "not_enrolled") {
        query = query.or("concierge_network_opted_in.is.null,concierge_network_opted_in.eq.false");
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProviderRow[];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["advisor-provider-counts"],
    queryFn: async () => {
      const [all, enrolled, notEnrolled] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved").eq("concierge_network_opted_in", true),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved").or("concierge_network_opted_in.is.null,concierge_network_opted_in.eq.false"),
      ]);
      return {
        all: all.count || 0,
        enrolled: enrolled.count || 0,
        not_enrolled: notEnrolled.count || 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Building2}
        iconGradient="bg-gradient-to-br from-primary to-primary/70"
        title="Provider Directory"
        subtitle={`${counts?.all ?? 0} providers · ${counts?.enrolled ?? 0} enrolled · ${counts?.not_enrolled ?? 0} not enrolled`}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "All Approved", value: counts?.all ?? 0, key: "all", color: "text-foreground" },
          { label: "Enrolled", value: counts?.enrolled ?? 0, key: "enrolled", color: "text-success" },
          { label: "Not Enrolled", value: counts?.not_enrolled ?? 0, key: "not_enrolled", color: "text-warning" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={cn(
              "p-3 rounded-xl border text-left transition-all hover:shadow-sm",
              tab === s.key && "ring-2 ring-primary/30 border-primary/50"
            )}
          >
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, or state..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="enrolled" className="text-xs px-3">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Enrolled
            </TabsTrigger>
            <TabsTrigger value="not_enrolled" className="text-xs px-3">
              <XCircle className="h-3 w-3 mr-1" />
              Not Enrolled
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Provider List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !providers?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No providers found</p>
          <p className="text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer"
              onClick={() => setSelectedProvider(provider)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Logo / Icon */}
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {provider.logo_url ? (
                      <img src={provider.logo_url} alt={`${provider.name} logo`} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm truncate">{provider.name}</h4>
                      {provider.verified && (
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">Verified</Badge>
                      )}
                      {provider.concierge_network_opted_in ? (
                        <Badge className="text-[10px] bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Enrolled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Not Enrolled
                        </Badge>
                      )}
                      {provider.concierge_availability_status && (
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {provider.concierge_availability_status}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {provider.city}, {provider.state}
                      </span>
                      <span className="capitalize">{provider.facility_type.replace(/_/g, " ")}</span>
                      {provider.bed_count && <span>{provider.bed_count} beds</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {provider.concierge_admissions_email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => window.open(`mailto:${provider.concierge_admissions_email}`, "_blank")}
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </Button>
                  )}
                  {!provider.concierge_admissions_email && provider.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => window.open(`mailto:${provider.email}`, "_blank")}
                    >
                      <Mail className="h-3 w-3" />
                      Email
                    </Button>
                  )}
                  {(provider.concierge_admissions_phone || provider.phone) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => window.open(`tel:${provider.concierge_admissions_phone || provider.phone}`, "_blank")}
                    >
                      <Phone className="h-3 w-3" />
                      Call
                    </Button>
                  )}
                  {provider.website && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => window.open(provider.website!, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProviderDirectoryDetailModal
        provider={selectedProvider}
        open={!!selectedProvider}
        onOpenChange={(open) => !open && setSelectedProvider(null)}
      />
    </div>
  );
}
