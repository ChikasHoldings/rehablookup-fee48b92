import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Phone, MapPin, MessageSquare, Search, Building2, Clock, CheckCircle, Lock, Unlock, FileText, Calendar,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerInquiriesTabProps {
  userId: string;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  reviewing: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  matching: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  matched: "bg-chart-3/10 text-chart-3 border-chart-3/30",
  introductions_sent: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  in_contact: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  placed: "bg-success/10 text-success border-success/30",
  closed: "bg-muted text-muted-foreground border-border",
  contacted: "bg-success/10 text-success border-success/30",
  unlocked: "bg-chart-3/10 text-chart-3 border-chart-3/30",
  expired: "bg-muted text-muted-foreground border-border",
};

export function SeekerInquiriesTab({ userId }: SeekerInquiriesTabProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Get seeker email for lead matching
  const { data: seekerEmail } = useQuery({
    queryKey: ["admin-seeker-email", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_seeker_emails_for_admin");
      return data?.find((e: any) => e.user_id === userId)?.email || null;
    },
  });

  // Fetch concierge inquiries (placement requests)
  const { data: inquiries, isLoading: inqLoading } = useQuery({
    queryKey: ["admin-seeker-inquiries-full", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, primary_concern, level_of_care, user_name, user_email, user_phone, payment_status, preferred_city, preferred_state, assigned_advisor_id, matched_facility_ids, placement_confirmed, timeline_urgency, admission_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Fetch direct facility leads (matched by email)
  const { data: directLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ["admin-seeker-direct-leads", seekerEmail],
    queryFn: async () => {
      if (!seekerEmail) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, facility_id, name, email, phone, status, source, inquiry_type, created_at, urgency, quality_flag, lead_score_label, lead_score")
        .eq("email", seekerEmail)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data?.length) return [];

      // Enrich with facility names
      const facilityIds = [...new Set(data.map((l: any) => l.facility_id).filter(Boolean))];
      let fMap: Record<string, any> = {};
      if (facilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id, name, city, state")
          .in("id", facilityIds);
        facilities?.forEach((f: any) => { fMap[f.id] = f; });
      }

      // Fetch unlock status
      const leadIds = data.map((l: any) => l.id);
      const { data: unlocks } = await supabase
        .from("lead_unlocks")
        .select("lead_id, unlocked_at, facility_id")
        .in("lead_id", leadIds);
      const unlockMap: Record<string, any> = {};
      unlocks?.forEach((u: any) => { unlockMap[u.lead_id] = u; });

      return data.map((l: any) => ({
        ...l,
        facility: fMap[l.facility_id] || null,
        unlock: unlockMap[l.id] || null,
      }));
    },
    enabled: !!seekerEmail,
  });

  const loading = inqLoading || leadsLoading;

  // Filter
  const filteredInquiries = (inquiries || []).filter((inq: any) => {
    if (statusFilter !== "all" && inq.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (inq.primary_concern || "").toLowerCase().includes(s) ||
        (inq.user_email || "").toLowerCase().includes(s);
    }
    return true;
  });

  const filteredLeads = (directLeads || []).filter((lead: any) => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (lead.facility?.name || "").toLowerCase().includes(s) ||
        (lead.name || "").toLowerCase().includes(s);
    }
    return true;
  });

  // KPIs
  const totalAll = (inquiries?.length || 0) + (directLeads?.length || 0);
  const unlockedCount = (directLeads || []).filter((l: any) => l.unlock).length;
  const placedCount = (inquiries || []).filter((i: any) => i.placement_confirmed || i.admission_status === "admitted").length;

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums">{totalAll}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Inquiries</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-primary">{directLeads?.length || 0}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Direct Leads</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-chart-3">{unlockedCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Unlocked</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-success">{placedCount}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Placed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by facility, concern, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="unlocked">Unlocked</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="matching">Matching</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="placed">Placed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {totalAll === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">No inquiries found</p>
          <p className="text-xs text-muted-foreground mt-1">This seeker has not submitted any inquiries yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Direct Facility Inquiries (Leads) */}
          {filteredLeads.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Direct Facility Inquiries
                <Badge variant="secondary" className="text-xs">{filteredLeads.length}</Badge>
              </h4>
              {filteredLeads.map((lead: any) => (
                <div key={lead.id} className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="font-semibold">{lead.facility?.name || "Unknown Facility"}</p>
                        {lead.facility && (
                          <span className="text-xs text-muted-foreground">{lead.facility.city}, {lead.facility.state}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{lead.inquiry_type || lead.source || "Request Info"}</Badge>
                        <Badge variant="outline" className={cn("text-xs", statusColors[lead.status] || "")}>
                          {lead.status}
                        </Badge>
                        {lead.urgency && <Badge variant="secondary" className="text-xs">{lead.urgency}</Badge>}
                        {lead.lead_score_label && (
                          <Badge variant="secondary" className="text-xs">{lead.lead_score_label} ({lead.lead_score})</Badge>
                        )}
                        {lead.unlock ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-xs">
                            <Unlock className="h-3 w-3" />Unlocked {lead.unlock.unlocked_at && format(new Date(lead.unlock.unlocked_at), "MMM d")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-xs">
                            <Lock className="h-3 w-3" />Locked
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(lead.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Placement Inquiries */}
          {filteredInquiries.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-chart-3" />
                Placement Inquiries
                <Badge variant="secondary" className="text-xs">{filteredInquiries.length}</Badge>
              </h4>
              {filteredInquiries.map((inquiry: any) => (
                <div key={inquiry.id} className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{inquiry.primary_concern || "General Inquiry"}</p>
                        <Badge variant="outline" className={cn("text-xs", statusColors[inquiry.status] || "")}>
                          {inquiry.status?.replace(/_/g, " ")}
                        </Badge>
                        {(inquiry.placement_confirmed || inquiry.admission_status === "admitted") && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-xs">
                            <CheckCircle className="h-3 w-3" />Admitted
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {inquiry.level_of_care && <Badge variant="secondary" className="text-xs">{inquiry.level_of_care}</Badge>}
                        {inquiry.timeline_urgency && <Badge variant="secondary" className="text-xs">Urgency: {inquiry.timeline_urgency}</Badge>}
                        {inquiry.payment_status && (
                          <Badge variant="outline" className={cn("text-xs",
                            (inquiry.payment_status === "paid" || inquiry.payment_status === "succeeded") && "bg-success/10 text-success border-success/30"
                          )}>{inquiry.payment_status}</Badge>
                        )}
                        {inquiry.matched_facility_ids?.length > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Building2 className="h-3 w-3" />{inquiry.matched_facility_ids.length} matches
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {inquiry.user_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{inquiry.user_email}</span>}
                        {inquiry.user_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{inquiry.user_phone}</span>}
                        {(inquiry.preferred_city || inquiry.preferred_state) && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[inquiry.preferred_city, inquiry.preferred_state].filter(Boolean).join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">
                        {inquiry.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredLeads.length === 0 && filteredInquiries.length === 0 && (
            <div className="text-center py-16">
              <Search className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No matching inquiries</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
