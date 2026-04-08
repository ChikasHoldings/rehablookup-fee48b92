import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Clock, 
  Users, 
  Send, 
  CheckCircle, 
  MessageSquare,
  Calendar,
  DollarSign,
  XCircle,
  UserCheck,
  Star,
  FileText,
  Eye,
  User,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface CaseTimelineEventsProps {
  caseData: ConciergeInquiry;
}

const EVENT_CONFIG: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  case_created: { icon: FileText, label: "Case Created", color: "text-blue-500" },
  intake_submitted: { icon: FileText, label: "Intake Submitted", color: "text-blue-500" },
  status_changed: { icon: Clock, label: "Status Changed", color: "text-gray-500" },
  matches_found: { icon: Users, label: "Matches Found", color: "text-purple-500" },
  introduction_sent: { icon: Send, label: "Introduction Sent", color: "text-cyan-500" },
  provider_interested: { icon: UserCheck, label: "Provider Interested", color: "text-green-500" },
  provider_declined: { icon: XCircle, label: "Provider Declined", color: "text-red-400" },
  provider_contacted_seeker: { icon: MessageSquare, label: "Provider Contacted Seeker", color: "text-teal-500" },
  tour_requested: { icon: Calendar, label: "Tour Requested", color: "text-amber-500" },
  tour_proposed: { icon: Calendar, label: "Tour Proposed", color: "text-amber-500" },
  tour_confirmed: { icon: CheckCircle, label: "Tour Confirmed", color: "text-green-500" },
  tour_cancelled: { icon: XCircle, label: "Tour Cancelled", color: "text-red-400" },
  seeker_confirmed: { icon: CheckCircle, label: "Seeker Confirmed", color: "text-green-500" },
  provider_confirmed: { icon: CheckCircle, label: "Provider Confirmed", color: "text-green-500" },
  placement_complete: { icon: Star, label: "Placement Complete", color: "text-emerald-500" },
  invoice_issued: { icon: DollarSign, label: "Invoice Issued", color: "text-blue-500" },
  invoice_paid: { icon: DollarSign, label: "Invoice Paid", color: "text-green-500" },
  case_closed: { icon: XCircle, label: "Case Closed", color: "text-gray-500" },
  message_sent: { icon: MessageSquare, label: "Message Sent", color: "text-blue-400" },
  pii_disclosed: { icon: Eye, label: "PII Disclosed", color: "text-amber-500" },
  advisor_assigned: { icon: User, label: "Advisor Assigned", color: "text-purple-500" },
};

export function CaseTimelineEvents({ caseData }: CaseTimelineEventsProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["case-events", caseData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("concierge_case_events")
        .select("id, inquiry_id, event_type, event_data, actor_id, actor_type, created_at")
        .eq("inquiry_id", caseData.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // Also build timeline from inquiry timestamps for older cases without events
  const staticEvents = [
    { type: "case_created", date: caseData.created_at, data: {} },
    caseData.intake_submitted_at && { type: "intake_submitted", date: caseData.intake_submitted_at, data: {} },
    caseData.matched_at && { type: "matches_found", date: caseData.matched_at, data: { count: caseData.match_count } },
    caseData.introductions_sent_at && { type: "introduction_sent", date: caseData.introductions_sent_at, data: { count: caseData.introductions_sent_count } },
    caseData.seeker_confirmed_at && { type: "seeker_confirmed", date: caseData.seeker_confirmed_at, data: {} },
    caseData.placement_confirmed_at && { type: "placement_complete", date: caseData.placement_confirmed_at, data: {} },
    caseData.closed_at && { type: "case_closed", date: caseData.closed_at, data: {} },
  ].filter(Boolean) as Array<{ type: string; date: string; data: any }>;

  // Merge dynamic events with static ones (avoiding duplicates)
  const allEvents = [
    ...(events || []).map(e => ({
      id: e.id,
      type: e.event_type,
      date: e.created_at || "",
      data: (e.event_data && typeof e.event_data === "object" && !Array.isArray(e.event_data) ? e.event_data : {}) as Record<string, any>,
      actor: e.actor_type,
    })),
  ];

  // Add static events that don't have dynamic counterparts
  staticEvents.forEach(se => {
    const hasDynamic = allEvents.some(de => de.type === se.type);
    if (!hasDynamic) {
      allEvents.push({
        id: `static-${se.type}`,
        type: se.type,
        date: se.date,
        data: se.data,
        actor: "system",
      });
    }
  });

  // Sort by date descending
  allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No events recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {allEvents.map((event, index) => {
        const config = EVENT_CONFIG[event.type] || { 
          icon: Clock, 
          label: event.type.replace(/_/g, " "), 
          color: "text-gray-500" 
        };
        const Icon = config.icon;

        return (
          <div
            key={event.id || index}
            className="flex items-start gap-3 py-2 border-l-2 border-muted pl-3 -ml-px hover:bg-muted/50 rounded-r transition-colors"
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm capitalize">{config.label}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {event.date ? format(new Date(event.date), "MMM d, h:mm a") : "—"}
                </span>
              </div>
              {event.data && typeof event.data === "object" && Object.keys(event.data).length > 0 && (
                <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                  {(event.data.from_status || event.data.from) && (event.data.to_status || event.data.to) && (
                    <span className="capitalize">
                      {String(event.data.from_status || event.data.from).replace(/_/g, " ")} → {String(event.data.to_status || event.data.to).replace(/_/g, " ")}
                    </span>
                  )}
                  {event.data.match_count && <span>{event.data.match_count} matches</span>}
                  {event.data.count && !event.data.match_count && <span>{event.data.count} items</span>}
                  {event.data.facility_name && <span>{String(event.data.facility_name)}</span>}
                  {event.data.notes && <span className="italic">"{String(event.data.notes)}"</span>}
                  {event.data.reason && <span>Reason: {String(event.data.reason)}</span>}
                  {event.data.trigger && !event.data.from_status && <span className="capitalize">({String(event.data.trigger).replace(/_/g, " ")})</span>}
                </div>
              )}
              {event.actor && event.actor !== "system" && (
                <span className="text-xs text-muted-foreground capitalize">by {event.actor}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
