import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Phone, MapPin, MessageSquare, Search, Building2, Clock, CheckCircle, Lock, Unlock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerInquiriesTabProps {
  userId: string;
}

export function SeekerInquiriesTab({ userId }: SeekerInquiriesTabProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch leads (direct facility inquiries)
  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["admin-seeker-leads", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, facility_id, name, email, phone, status, source, inquiry_type, created_at, urgency, quality_flag, lead_score_label")
        .eq("email", userId) // leads don't have user_id, we'll try matching
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: false, // We'll use concierge_inquiries + leads via email matching below
  });

  // Fetch concierge inquiries
  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["admin-seeker-inquiries-full", userId],
    queryFn: async () => {
      const { data: inqs } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, primary_concern, level_of_care, user_name, user_email, user_phone, payment_status, preferred_city, preferred_state, assigned_advisor_id, matched_facility_ids, placement_confirmed, timeline_urgency, admission_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return inqs || [];
    },
  });

  // Fetch leads by email (since leads table doesn't have user_id)
  const { data: seekerEmail } = useQuery({
    queryKey: ["admin-seeker-email", userId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_seeker_emails_for_admin");
      return data?.find((e: any) => e.user_id === userId)?.email || null;
    },
  });

  const { data: directLeads, isLoading: directLeadsLoading } = useQuery({
    queryKey: ["admin-seeker-direct-leads", seekerEmail],
    queryFn: async () => {
      if (!seekerEmail) return [];
      const { data } = await supabase
        .from("leads")
        .select("id, facility_id, name, email, phone, status, source, inquiry_type, created_at, urgency, quality_flag, lead_score_label")
        .eq("email", seekerEmail)
        .order("created_at", { ascending: false })
        .limit(50);

      // Enrich with facility names
      const facilityIds = [...new Set((data || []).map((l: any) => l.facility_id).filter(Boolean))];
      if (facilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id, name, city, state")
          .in("id", facilityIds);
        const fMap: Record<string, any> = {};
        facilities?.forEach((f: any) => { fMap[f.id] = f; });
        return (data || []).map((l: any) => ({ ...l, facility: fMap[l.facility_id] || null }));
      }
      return (data || []).map((l: any) => ({ ...l, facility: null }));
    },
    enabled: !!seekerEmail,
  });

  // Check which leads have been unlocked
  const { data: unlockMap } = useQuery({
    queryKey: ["admin-seeker-lead-unlocks", directLeads?.map((l: any) => l.id)],
    queryFn: async () => {
      const leadIds = (directLeads || []).map((l: any) => l.id);
      if (!leadIds.length) return {};
      const { data } = await supabase
        .from("lead_unlocks")
        .select("lead_id, unlocked_at, facility_id")
        .in("lead_id", leadIds);
      const map: Record<string, any> = {};
      data?.forEach((u: any) => { map[u.lead_id] = u; });
      return map;
    },
    enabled: (directLeads?.length || 0) > 0,
  });

  const filteredInquiries = (inquiries || []).filter((inq: any) => {
    if (statusFilter !== "all" && inq.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (inq.primary_concern || "").toLowerCase().includes(s) ||
        (inq.user_email || "").toLowerCase().includes(s);
    }
    return true;
  });

  const loading = isLoading || directLeadsLoading;

  return (
    <div className="p-5 space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search inquiries..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="matching">Matching</SelectItem>
            <SelectItem value="matched">Matched</SelectItem>
            <SelectItem value="placed">Placed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <>
          {/* Direct Facility Inquiries (Leads) */}
          {(directLeads?.length || 0) > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Direct Facility Inquiries ({directLeads?.length})
              </h4>
              {directLeads?.map((lead: any) => {
                const unlock = unlockMap?.[lead.id];
                return (
                  <div key={lead.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{lead.facility?.name || "Unknown Facility"}</p>
                          {lead.facility && (
                            <span className="text-xs text-muted-foreground">{lead.facility.city}, {lead.facility.state}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <Badge variant="outline" className="text-xs">{lead.inquiry_type || lead.source || "Request Info"}</Badge>
                          <Badge variant="outline" className={cn("text-xs",
                            lead.status === "new" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                            lead.status === "contacted" && "bg-success/10 text-success border-success/30",
                            lead.status === "expired" && "bg-muted text-muted-foreground border-border"
                          )}>{lead.status}</Badge>
                          {lead.urgency && (
                            <Badge variant="secondary" className="text-xs">{lead.urgency}</Badge>
                          )}
                          {unlock ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-xs">
                              <Unlock className="h-3 w-3" />Unlocked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-xs">
                              <Lock className="h-3 w-3" />Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Concierge Inquiries */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-chart-3" />
              Placement Inquiries ({filteredInquiries.length})
            </h4>
            {filteredInquiries.length > 0 ? (
              filteredInquiries.map((inquiry: any) => (
                <div key={inquiry.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{inquiry.primary_concern || "General Inquiry"}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs",
                          inquiry.status === "matched" && "bg-success/10 text-success border-success/30",
                          inquiry.status === "new" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                          inquiry.status === "reviewing" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                          inquiry.status === "matching" && "bg-purple-500/10 text-purple-600 border-purple-500/30",
                          inquiry.status === "placed" && "bg-success/10 text-success border-success/30",
                          inquiry.status === "closed" && "bg-muted text-muted-foreground border-border"
                        )}>{inquiry.status}</Badge>
                        {inquiry.level_of_care && <Badge variant="secondary" className="text-xs">{inquiry.level_of_care}</Badge>}
                        {inquiry.payment_status && (
                          <Badge variant="outline" className={cn("text-xs",
                            (inquiry.payment_status === "paid" || inquiry.payment_status === "succeeded") && "bg-success/10 text-success border-success/30"
                          )}>{inquiry.payment_status}</Badge>
                        )}
                        {inquiry.timeline_urgency && (
                          <Badge variant="secondary" className="text-xs">{inquiry.timeline_urgency}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {inquiry.user_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{inquiry.user_email}</span>}
                        {inquiry.user_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{inquiry.user_phone}</span>}
                        {(inquiry.preferred_city || inquiry.preferred_state) && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[inquiry.preferred_city, inquiry.preferred_state].filter(Boolean).join(", ")}</span>
                        )}
                        {inquiry.matched_facility_ids?.length > 0 && (
                          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{inquiry.matched_facility_ids.length} matches</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(inquiry.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">No inquiries found</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
