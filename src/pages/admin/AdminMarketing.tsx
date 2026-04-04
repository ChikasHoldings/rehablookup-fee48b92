import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  Users,
  Mail,
  TrendingUp,
  Search,
  Phone,
  MapPin,
  Shield,
  Zap,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  MarketingLeadProfileModal,
  type MarketingLead,
} from "@/components/admin/marketing/MarketingLeadProfileModal";

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminMarketing() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);

  // Fetch marketing leads with all needed columns
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-marketing-leads", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketing_leads")
        .select("id, first_name, last_name, email, phone, status, source, primary_substance, insurance_type, insurance_provider, level_of_care, location_city_state, location_zip, urgency, created_at, updated_at, converted_to_concierge, converted_at, admin_notes, followup_email_sent, followup_email_sent_at, message, who_seeking_help, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page, facilities_requested, matched_facility_ids, age_range, gender, previous_treatment, dual_diagnosis, employment_status, preferred_contact, co_occurring_conditions")
        .order("created_at", { ascending: false })
        .limit(500);

      if (statusFilter === "converted") {
        query = query.eq("converted_to_concierge", true);
      } else if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MarketingLead[];
    },
  });

  // Filter leads by search (client-side on debounced value)
  const filteredLeads = useMemo(() => {
    if (!debouncedSearch) return leads;
    const searchLower = debouncedSearch.toLowerCase();
    return leads.filter((lead) =>
      lead.first_name?.toLowerCase().includes(searchLower) ||
      lead.last_name?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(debouncedSearch) ||
      lead.location_city_state?.toLowerCase().includes(searchLower)
    );
  }, [leads, debouncedSearch]);

  // Calculate stats from ALL leads (not filtered)
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.converted_to_concierge).length;
  const pendingFollowup = leads.filter(
    (l) => !l.followup_email_sent && !(l.facilities_requested?.length)
  ).length;
  const engagedLeads = leads.filter(
    (l) => (l.facilities_requested?.length || 0) > 0
  ).length;
  const urgentLeads = leads.filter(
    (l) => l.urgency === "immediate" || l.urgency === "within-week"
  ).length;

  const getStatusBadge = (lead: MarketingLead) => {
    if (lead.converted_to_concierge) {
      return <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/30 gap-1"><Shield className="h-3 w-3" />Concierge</Badge>;
    }
    if ((lead.facilities_requested?.length || 0) > 0) {
      return <Badge className="bg-success/10 text-success border-success/30 gap-1"><MessageSquare className="h-3 w-3" />Engaged</Badge>;
    }
    if (lead.followup_email_sent) {
      return <Badge className="bg-info/10 text-info border-info/30 gap-1"><Mail className="h-3 w-3" />Followed Up</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />New</Badge>;
  };

  const handleLeadUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Marketing Leads
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Leads captured from paid advertising campaigns
          </p>
        </div>
      </div>

      {/* KPI Summary Bar */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-stretch flex-wrap">
            <div className="flex items-center gap-0.5 p-3">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  statusFilter === "all" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : totalLeads}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Total</span>
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px] hover:bg-muted/50"
              >
                <TrendingUp className="h-3.5 w-3.5 text-success mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : engagedLeads}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Engaged</span>
              </button>
              <button
                onClick={() => setStatusFilter("converted")}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px]",
                  statusFilter === "converted" ? "bg-accent/10 ring-1 ring-accent" : "hover:bg-muted/50"
                )}
              >
                <Shield className="h-3.5 w-3.5 text-chart-3 mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : convertedLeads}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Concierge</span>
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px] hover:bg-muted/50"
              >
                <Mail className="h-3.5 w-3.5 text-warning mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : pendingFollowup}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Pending</span>
              </button>
            </div>

            <div className="w-px bg-border my-2" />

            <div className="flex items-center gap-0.5 p-3">
              <div className="flex flex-col items-center justify-center px-3 py-2.5 min-w-[72px]">
                <Zap className="h-3.5 w-3.5 text-destructive mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : urgentLeads}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Urgent</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Lead</TableHead>
                  <TableHead className="min-w-[180px]">Contact</TableHead>
                  <TableHead className="min-w-[120px]">Location</TableHead>
                  <TableHead className="min-w-[100px]">Urgency</TableHead>
                  <TableHead className="min-w-[80px]">Source</TableHead>
                  <TableHead className="min-w-[100px]">Engagement</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="font-medium">No marketing leads found</p>
                      <p className="text-xs mt-1">
                        {debouncedSearch ? "Try adjusting your search" : "Leads from campaigns will appear here"}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {lead.first_name?.[0]}{lead.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {lead.first_name} {lead.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {lead.who_seeking_help || "Self"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-0.5">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.location_city_state || lead.location_zip ? (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {lead.location_city_state || lead.location_zip}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.urgency ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs gap-1",
                              lead.urgency === "immediate" && "bg-destructive/10 text-destructive border-destructive/30",
                              lead.urgency === "within-week" && "bg-warning/10 text-warning border-warning/30",
                              lead.urgency === "within-month" && "bg-info/10 text-info border-info/30",
                              lead.urgency === "researching" && "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {lead.urgency === "immediate" && <Zap className="h-3 w-3" />}
                            {lead.urgency}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                          {lead.utm_source || "direct"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm tabular-nums text-foreground">
                            {lead.facilities_requested?.length || 0}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            requests
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-foreground">{format(new Date(lead.created_at), "MMM d")}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail Modal */}
      <MarketingLeadProfileModal
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onUpdated={handleLeadUpdated}
      />
    </div>
  );
}
