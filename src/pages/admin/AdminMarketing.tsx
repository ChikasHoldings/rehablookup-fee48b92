import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  Users,
  Mail,
  TrendingUp,
  Search,
  ExternalLink,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Zap,
  Target,
  MessageSquare,
  UserCheck,
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

export default function AdminMarketing() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);

  // Fetch marketing leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-marketing-leads", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("marketing_leads")
        .select("id, first_name, last_name, email, phone, status, source, primary_substance, insurance_type, level_of_care, preferred_location, timeline, created_at, updated_at, converted_to_concierge, converted_at, admin_notes, followup_email_sent")
        .order("created_at", { ascending: false })
        .limit(200);

      // Handle special "converted" filter which should check converted_to_concierge boolean
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

  // Filter leads by search
  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      lead.first_name?.toLowerCase().includes(searchLower) ||
      lead.last_name?.toLowerCase().includes(searchLower) ||
      lead.email?.toLowerCase().includes(searchLower) ||
      lead.phone?.includes(searchQuery) ||
      lead.location_city_state?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate stats
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.converted_to_concierge).length;
  const pendingFollowup = leads.filter(
    (l) => !l.followup_email_sent && (l.facilities_requested?.length || 0) === 0
  ).length;
  const engagedLeads = leads.filter(
    (l) => (l.facilities_requested?.length || 0) > 0
  ).length;
  const urgentLeads = leads.filter(
    (l) => l.urgency === "immediate" || l.urgency === "within-week"
  ).length;

  const getStatusBadge = (lead: MarketingLead) => {
    if (lead.converted_to_concierge) {
      return <Badge className="bg-violet-100 text-violet-700 border-violet-200 gap-1"><Shield className="h-3 w-3" />Concierge</Badge>;
    }
    if ((lead.facilities_requested?.length || 0) > 0) {
      return <Badge className="bg-green-100 text-green-700 border-green-200 gap-1"><MessageSquare className="h-3 w-3" />Engaged</Badge>;
    }
    if (lead.followup_email_sent) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1"><Mail className="h-3 w-3" />Followed Up</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />New</Badge>;
  };

  const handleLeadUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-marketing-leads"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Marketing Leads
          </h1>
          <p className="text-muted-foreground">
            Leads captured from paid advertising campaigns
          </p>
        </div>
      </div>

      {/* Enterprise KPI Summary Bar */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-stretch flex-wrap">
            {/* Primary Stats */}
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
                <TrendingUp className="h-3.5 w-3.5 text-green-500 mb-1" />
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
                <Shield className="h-3.5 w-3.5 text-violet-500 mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : convertedLeads}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Concierge</span>
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                className="flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all min-w-[72px] hover:bg-muted/50"
              >
                <Mail className="h-3.5 w-3.5 text-amber-500 mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : pendingFollowup}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Pending</span>
              </button>
            </div>

            <div className="w-px bg-border my-2" />

            {/* Urgency Stats */}
            <div className="flex items-center gap-0.5 p-3">
              <div className="flex flex-col items-center justify-center px-3 py-2.5 min-w-[72px]">
                <Zap className="h-3.5 w-3.5 text-red-500 mb-1" />
                <span className="text-lg font-semibold tabular-nums leading-none">{isLoading ? "—" : urgentLeads}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Urgent</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No marketing leads found
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
                            {lead.first_name[0]}{lead.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
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
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[160px]">{lead.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{lead.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.location_city_state || lead.location_zip ? (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
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
                            lead.urgency === "immediate" && "bg-red-50 text-red-700 border-red-200",
                            lead.urgency === "within-week" && "bg-amber-50 text-amber-700 border-amber-200",
                            lead.urgency === "within-month" && "bg-blue-50 text-blue-700 border-blue-200",
                            lead.urgency === "researching" && "bg-slate-50 text-slate-600 border-slate-200"
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
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {lead.utm_source || "direct"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
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
                        <p>{format(new Date(lead.created_at), "MMM d")}</p>
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
