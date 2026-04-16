import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Building2, Calendar, MapPin, Clock,
  User, CheckCircle, XCircle, Handshake, FileText,
  AlertTriangle, Star,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerPlacementsTabProps {
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
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const admissionStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  admitted: "bg-success/10 text-success border-success/30",
  discharged: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export function SeekerPlacementsTab({ userId }: SeekerPlacementsTabProps) {
  const { data: placements, isLoading } = useQuery({
    queryKey: ["admin-seeker-placements", userId],
    queryFn: async () => {
      const { data: inqs } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, updated_at, primary_concern, level_of_care, user_name, user_email, user_phone, payment_status, preferred_city, preferred_state, assigned_advisor_id, matched_facility_ids, admin_matched_facility_ids, placed_facility_id, placement_confirmed, placement_confirmed_at, timeline_urgency, admission_status, admission_notes, tour_coordination_status, seeker_confirmed, seeker_confirmed_at, seeker_feedback, seeker_rating, closed_at, notes, provider_fee_status, provider_fee_cents, introductions_sent_at, introductions_sent_count, match_count")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!inqs?.length) return [];

      const inquiryIds = inqs.map((i: any) => i.id);

      // Parallel fetch: introductions, tours, rejected facilities
      const [introsRes, toursRes, rejectedRes] = await Promise.all([
        supabase.from("concierge_introductions")
          .select("id, inquiry_id, facility_id, provider_response, provider_responded_at, seeker_contacted, seeker_contacted_at, provider_notes, admin_disclosed_pii_at")
          .in("inquiry_id", inquiryIds),
        supabase.from("concierge_tour_requests")
          .select("id, inquiry_id, facility_id, status, tour_type, confirmed_datetime, proposed_datetime, notes")
          .in("inquiry_id", inquiryIds),
        supabase.from("concierge_rejected_facilities")
          .select("id, inquiry_id, facility_id")
          .in("inquiry_id", inquiryIds),
      ]);

      // Collect all facility IDs
      const allFacilityIds = [
        ...(introsRes.data || []).map((i: any) => i.facility_id),
        ...(toursRes.data || []).map((t: any) => t.facility_id),
        ...(rejectedRes.data || []).map((r: any) => r.facility_id),
        ...inqs.filter((i: any) => i.placed_facility_id).map((i: any) => i.placed_facility_id),
      ].filter(Boolean);
      const uniqueFacilityIds = [...new Set(allFacilityIds)];

      let facilityMap: Record<string, any> = {};
      if (uniqueFacilityIds.length) {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id, name, city, state, facility_type")
          .in("id", uniqueFacilityIds);
        facilities?.forEach((f: any) => { facilityMap[f.id] = f; });
      }

      // Fetch advisor names
      const advisorIds = [...new Set(inqs.map((i: any) => i.assigned_advisor_id).filter(Boolean))];
      let advisorMap: Record<string, string> = {};
      if (advisorIds.length) {
        const { data: advisors } = await supabase
          .from("admin_user_profiles")
          .select("user_id, first_name, last_name, display_name")
          .in("user_id", advisorIds);
        advisors?.forEach((a: any) => {
          advisorMap[a.user_id] = a.display_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || "Advisor";
        });
      }

      return inqs.map((inq: any) => ({
        ...inq,
        introductions: (introsRes.data || []).filter((i: any) => i.inquiry_id === inq.id).map((i: any) => ({
          ...i,
          facility: facilityMap[i.facility_id],
        })),
        tourRequests: (toursRes.data || []).filter((t: any) => t.inquiry_id === inq.id).map((t: any) => ({
          ...t,
          facility: facilityMap[t.facility_id],
        })),
        rejectedFacilities: (rejectedRes.data || []).filter((r: any) => r.inquiry_id === inq.id).map((r: any) => ({
          ...r,
          facility: facilityMap[r.facility_id],
        })),
        placedFacility: inq.placed_facility_id ? facilityMap[inq.placed_facility_id] : null,
        advisorName: inq.assigned_advisor_id ? advisorMap[inq.assigned_advisor_id] : null,
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (!placements?.length) {
    return (
      <div className="p-5 text-center py-16">
        <Handshake className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No placement cases</p>
        <p className="text-xs text-muted-foreground mt-1">This client has not submitted any placement requests.</p>
      </div>
    );
  }

  // Summary KPIs
  const totalCases = placements.length;
  const activeCases = placements.filter((p: any) => !["closed", "cancelled"].includes(p.status)).length;
  const admittedCases = placements.filter((p: any) => p.placement_confirmed || p.admission_status === "admitted").length;
  const totalIntros = placements.reduce((acc: number, p: any) => acc + (p.introductions?.length || 0), 0);

  return (
    <div className="p-5 space-y-4">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums">{totalCases}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Cases</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-warning">{activeCases}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-success">{admittedCases}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Admitted</p>
        </div>
        <div className="p-3 rounded-xl border bg-card text-center">
          <p className="text-xl font-bold tabular-nums text-primary">{totalIntros}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Introductions</p>
        </div>
      </div>

      {placements.map((placement: any) => (
        <div key={placement.id} className="rounded-xl border bg-card overflow-hidden">
          {/* Case Header */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{placement.primary_concern || "Placement Request"}</h4>
                  <Badge variant="outline" className={cn("text-xs", statusColors[placement.status] || "")}>
                    {placement.status?.replace(/_/g, " ")}
                  </Badge>
                  {placement.admission_status && placement.admission_status !== "pending" && (
                    <Badge variant="outline" className={cn("text-xs", admissionStatusColors[placement.admission_status] || "")}>
                      Admission: {placement.admission_status}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(placement.created_at), "MMM d, yyyy")}</span>
                  {placement.level_of_care && <span>{placement.level_of_care}</span>}
                  {placement.timeline_urgency && <span>Urgency: {placement.timeline_urgency}</span>}
                  {placement.advisorName && (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />Advisor: {placement.advisorName}</span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground/70">ID: {placement.id.slice(0, 8)}</span>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                <p>{formatDistanceToNow(new Date(placement.created_at), { addSuffix: true })}</p>
                {placement.closed_at && <p className="mt-0.5">Closed {format(new Date(placement.closed_at), "MMM d")}</p>}
              </div>
            </div>
          </div>

          {/* Admission Indicator (prominent) */}
          {(placement.placement_confirmed || placement.admission_status === "admitted") && placement.placedFacility && (
            <div className="p-4 border-b bg-success/5">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-success text-sm">Admitted</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {placement.placedFacility.name} — {placement.placedFacility.city}, {placement.placedFacility.state}
                    </span>
                    {placement.placement_confirmed_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(placement.placement_confirmed_at), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placed but not yet confirmed admission */}
          {placement.placedFacility && !placement.placement_confirmed && placement.admission_status !== "admitted" && (
            <div className="p-4 border-b bg-amber-500/5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-600 text-sm">Placed — Awaiting Admission Confirmation</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{placement.placedFacility.name} — {placement.placedFacility.city}, {placement.placedFacility.state}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Provider Introductions */}
          {placement.introductions?.length > 0 && (
            <div className="p-4 border-b">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Provider Introductions ({placement.introductions.length})
              </h5>
              <div className="space-y-2">
                {placement.introductions.map((intro: any) => (
                  <div key={intro.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{intro.facility?.name || "Unknown"}</p>
                        {intro.facility && <p className="text-xs text-muted-foreground">{intro.facility.city}, {intro.facility.state}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {intro.provider_response ? (
                        <Badge variant="outline" className={cn("text-xs",
                          intro.provider_response === "accepted" ? "bg-success/10 text-success border-success/30" :
                          intro.provider_response === "declined" ? "bg-destructive/10 text-destructive border-destructive/30" :
                          "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        )}>{intro.provider_response}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>
                      )}
                      {intro.seeker_contacted && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                      {intro.admin_disclosed_pii_at && (
                        <Badge variant="secondary" className="text-[10px] h-4">PII Shared</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Facilities */}
          {placement.rejectedFacilities?.length > 0 && (
            <div className="p-4 border-b">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Client Rejected ({placement.rejectedFacilities.length})
              </h5>
              <div className="flex flex-wrap gap-2">
                {placement.rejectedFacilities.map((rej: any) => (
                  <Badge key={rej.id} variant="outline" className="text-xs bg-destructive/5 text-destructive border-destructive/20 gap-1">
                    <XCircle className="h-3 w-3" />
                    {rej.facility?.name || "Unknown"}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tour Requests */}
          {placement.tourRequests?.length > 0 && (
            <div className="p-4 border-b">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Tour Requests ({placement.tourRequests.length})
              </h5>
              <div className="space-y-2">
                {placement.tourRequests.map((tour: any) => (
                  <div key={tour.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tour.facility?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{tour.tour_type} tour</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs",
                        tour.status === "confirmed" && "bg-success/10 text-success border-success/30",
                        tour.status === "requested" && "bg-warning/10 text-warning border-warning/30",
                        tour.status === "completed" && "bg-primary/10 text-primary border-primary/30"
                      )}>{tour.status}</Badge>
                      {tour.confirmed_datetime && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(tour.confirmed_datetime), "MMM d, h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing & Outcome */}
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Payment</p>
              <Badge variant="outline" className={cn("text-xs mt-0.5",
                (placement.payment_status === "paid" || placement.payment_status === "succeeded") && "bg-success/10 text-success border-success/30"
              )}>{placement.payment_status || "—"}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Tour Status</p>
              <p className="font-medium mt-0.5 capitalize">{placement.tour_coordination_status?.replace(/_/g, " ") || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Provider Fee</p>
              <p className="font-medium mt-0.5">
                {placement.provider_fee_cents ? `$${(placement.provider_fee_cents / 100).toFixed(0)}` : "—"}
                {placement.provider_fee_status && placement.provider_fee_status !== "pending" && (
                  <span className="text-muted-foreground ml-1">({placement.provider_fee_status})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Client Rating</p>
              <p className="font-medium mt-0.5 flex items-center gap-1">
                {placement.seeker_rating ? (
                  <><Star className="h-3 w-3 fill-warning text-warning" />{placement.seeker_rating}/5</>
                ) : "—"}
              </p>
            </div>
          </div>

          {/* Feedback / Notes */}
          {(placement.seeker_feedback || placement.notes || placement.admission_notes) && (
            <div className="p-4 border-t bg-muted/20 space-y-2 text-xs">
              {placement.seeker_feedback && (
                <div><span className="font-medium">Client Feedback:</span> <span className="text-muted-foreground">{placement.seeker_feedback}</span></div>
              )}
              {placement.admission_notes && (
                <div><span className="font-medium">Admission Notes:</span> <span className="text-muted-foreground">{placement.admission_notes}</span></div>
              )}
              {placement.notes && (
                <div><span className="font-medium">Case Notes:</span> <span className="text-muted-foreground">{placement.notes}</span></div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
