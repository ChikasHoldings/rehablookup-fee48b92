import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Building2, Calendar, MapPin, Phone, Mail, Clock,
  User, CheckCircle, XCircle, Handshake,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SeekerPlacementsTabProps {
  userId: string;
}

export function SeekerPlacementsTab({ userId }: SeekerPlacementsTabProps) {
  const { data: placements, isLoading } = useQuery({
    queryKey: ["admin-seeker-placements", userId],
    queryFn: async () => {
      // Get all concierge inquiries as placement cases
      const { data: inqs } = await supabase
        .from("concierge_inquiries")
        .select("id, status, created_at, updated_at, primary_concern, level_of_care, user_name, user_email, user_phone, payment_status, preferred_city, preferred_state, assigned_advisor_id, matched_facility_ids, admin_matched_facility_ids, placement_confirmed, placement_confirmed_at, timeline_urgency, admission_status, tour_coordination_status, seeker_confirmed, seeker_feedback, seeker_rating, closed_at, notes, provider_fee_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!inqs?.length) return [];

      // Fetch introductions for these inquiries
      const inquiryIds = inqs.map((i) => i.id);
      const { data: intros } = await supabase
        .from("concierge_introductions")
        .select("id, inquiry_id, facility_id, provider_response, provider_responded_at, seeker_contacted, seeker_contacted_at")
        .in("inquiry_id", inquiryIds);

      // Fetch tour requests
      const { data: tours } = await supabase
        .from("concierge_tour_requests")
        .select("id, inquiry_id, facility_id, status, tour_type, confirmed_datetime, proposed_datetime")
        .in("inquiry_id", inquiryIds);

      // Get facility names
      const allFacilityIds = [
        ...(intros || []).map((i) => i.facility_id),
        ...(tours || []).map((t) => t.facility_id),
      ].filter(Boolean);
      const uniqueFacilityIds = [...new Set(allFacilityIds)];

      let facilityMap: Record<string, any> = {};
      if (uniqueFacilityIds.length) {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id, name, city, state")
          .in("id", uniqueFacilityIds);
        facilities?.forEach((f: any) => { facilityMap[f.id] = f; });
      }

      // Fetch advisor names
      const advisorIds = [...new Set(inqs.map((i) => i.assigned_advisor_id).filter(Boolean))];
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

      return inqs.map((inq) => ({
        ...inq,
        introductions: (intros || []).filter((i) => i.inquiry_id === inq.id).map((i) => ({
          ...i,
          facility: facilityMap[i.facility_id],
        })),
        tourRequests: (tours || []).filter((t) => t.inquiry_id === inq.id).map((t) => ({
          ...t,
          facility: facilityMap[t.facility_id],
        })),
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
        <p className="text-xs text-muted-foreground mt-1">This seeker has not submitted any placement requests.</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    reviewing: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    matching: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    matched: "bg-chart-3/10 text-chart-3 border-chart-3/30",
    placed: "bg-success/10 text-success border-success/30",
    closed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <div className="p-5 space-y-4">
      {placements.map((placement: any) => (
        <div key={placement.id} className="rounded-xl border bg-card overflow-hidden">
          {/* Case Header */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold">{placement.primary_concern || "Placement Request"}</h4>
                  <Badge variant="outline" className={cn("text-xs", statusColors[placement.status] || "")}>
                    {placement.status}
                  </Badge>
                  {placement.admission_status && placement.admission_status !== "pending" && (
                    <Badge variant="secondary" className="text-xs">Admission: {placement.admission_status}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(placement.created_at), "MMM d, yyyy")}</span>
                  {placement.level_of_care && <span>{placement.level_of_care}</span>}
                  {placement.timeline_urgency && <span>Urgency: {placement.timeline_urgency}</span>}
                  {placement.advisorName && (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />Advisor: {placement.advisorName}</span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{formatDistanceToNow(new Date(placement.created_at), { addSuffix: true })}</p>
                {placement.closed_at && <p className="mt-0.5">Closed {format(new Date(placement.closed_at), "MMM d")}</p>}
              </div>
            </div>
          </div>

          {/* Provider Matches */}
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
                    <div className="flex items-center gap-2">
                      {intro.provider_response ? (
                        <Badge variant="outline" className={cn("text-xs",
                          intro.provider_response === "accepted" ? "bg-success/10 text-success border-success/30" :
                          intro.provider_response === "declined" ? "bg-destructive/10 text-destructive border-destructive/30" :
                          ""
                        )}>{intro.provider_response}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>
                      )}
                      {intro.seeker_contacted && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                    </div>
                  </div>
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
                    <Badge variant="outline" className={cn("text-xs",
                      tour.status === "confirmed" && "bg-success/10 text-success border-success/30",
                      tour.status === "requested" && "bg-warning/10 text-warning border-warning/30"
                    )}>{tour.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcome / Feedback */}
          {(placement.seeker_feedback || placement.seeker_rating || placement.placement_confirmed) && (
            <div className="p-4">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Outcome</h5>
              <div className="space-y-1 text-sm">
                {placement.placement_confirmed && (
                  <p className="flex items-center gap-1.5 text-success"><CheckCircle className="h-3.5 w-3.5" />Placement confirmed</p>
                )}
                {placement.seeker_rating && (
                  <p className="text-muted-foreground">Rating: {placement.seeker_rating}/5</p>
                )}
                {placement.seeker_feedback && (
                  <p className="text-muted-foreground text-xs mt-1">{placement.seeker_feedback}</p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
