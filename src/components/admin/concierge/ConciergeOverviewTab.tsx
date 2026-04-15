import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Calendar, Clock, Shield, MapPin, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ConciergeInquiry = Database["public"]["Tables"]["concierge_inquiries"]["Row"];

interface ConciergeOverviewTabProps {
  caseData: ConciergeInquiry;
}

const STATUS_LABELS: Record<string, string> = {
  pending_intake: "Pending Intake",
  intake_submitted: "Submitted",
  intake_reviewed: "Reviewed",
  advisor_assigned: "Advisor Assigned",
  matching_providers: "Matching",
  provider_prequalification: "Pre-Qualifying",
  providers_accepted: "Providers Ready",
  presented_to_seeker: "Presented",
  seeker_selected: "Client Selected",
  admission_in_progress: "Admitting",
  admitted: "Admitted",
  billed: "Billed",
  completed: "Completed",
  closed: "Closed",
  // Legacy compat
  new: "New",
  reviewing: "Reviewing",
  matching: "Matching",
  matched: "Matched",
  introductions_sent: "Intros Sent",
  in_contact: "In Contact",
};

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-right max-w-[60%]">{value}</div>
    </div>
  );
}

export function ConciergeOverviewTab({ caseData }: ConciergeOverviewTabProps) {
  // Fetch advisor name
  const { data: advisor } = useQuery({
    queryKey: ["advisor-profile", caseData.assigned_advisor_id],
    queryFn: async () => {
      if (!caseData.assigned_advisor_id) return null;
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("first_name, last_name, display_name")
        .eq("user_id", caseData.assigned_advisor_id)
        .maybeSingle();
      return data;
    },
    enabled: !!caseData.assigned_advisor_id,
  });

  // Fetch placed facility name
  const { data: placedFacility } = useQuery({
    queryKey: ["placed-facility", caseData.placed_facility_id],
    queryFn: async () => {
      if (!caseData.placed_facility_id) return null;
      const { data } = await supabase
        .from("facilities")
        .select("name, city, state")
        .eq("id", caseData.placed_facility_id)
        .maybeSingle();
      return data;
    },
    enabled: !!caseData.placed_facility_id,
  });

  const isPaid = caseData.payment_status === "paid" || caseData.payment_status === "succeeded";
  const isPlaced = ["admitted", "billed", "completed"].includes(caseData.status);
  const isClosed = caseData.status === "closed";
  const hoursSinceUpdate = (Date.now() - new Date(caseData.updated_at).getTime()) / (1000 * 60 * 60);

  const advisorName = advisor
    ? (advisor.display_name || `${advisor.first_name || ""} ${advisor.last_name || ""}`.trim() || "Assigned")
    : null;

  const urgencyLabel = caseData.timeline_urgency === "immediate"
    ? "Immediate" : caseData.timeline_urgency === "within_week"
    ? "Within a week" : caseData.timeline_urgency === "within_month"
    ? "Within a month" : caseData.timeline_urgency || "Not specified";

  return (
    <div className="space-y-4">
      {/* Case Identity */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Case Summary</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <InfoRow
            label="Placement ID"
            icon={Shield}
            value={<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{caseData.id.slice(0, 8)}</code>}
          />
          <InfoRow label="Client Name" icon={User} value={caseData.user_name} />
          <InfoRow
            label="Assigned Advisor"
            icon={User}
            value={
              advisorName ? (
                <Badge variant="outline" className="text-xs">{advisorName}</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Unassigned</Badge>
              )
            }
          />
          <InfoRow
            label="Current Stage"
            value={
              <Badge variant={isClosed ? "destructive" : isPlaced ? "default" : "secondary"} className="text-xs">
                {STATUS_LABELS[caseData.status] || caseData.status}
              </Badge>
            }
          />
          <InfoRow
            label="Payment"
            value={
              <Badge variant="outline" className={isPaid ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"}>
                {isPaid ? "✓ Paid" : "⚠ Unpaid"}
              </Badge>
            }
          />
        </CardContent>
      </Card>

      {/* Dates & Activity */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Dates & Activity</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <InfoRow
            label="Created"
            icon={Calendar}
            value={format(new Date(caseData.created_at), "MMM d, yyyy 'at' h:mm a")}
          />
          <InfoRow
            label="Last Updated"
            icon={Clock}
            value={
              <span className={hoursSinceUpdate > 48 ? "text-destructive" : ""}>
                {format(new Date(caseData.updated_at), "MMM d, yyyy 'at' h:mm a")}
                {hoursSinceUpdate > 48 && <span className="text-xs ml-1">({Math.round(hoursSinceUpdate)}h ago)</span>}
              </span>
            }
          />
          {caseData.intake_submitted_at && (
            <InfoRow
              label="Intake Submitted"
              icon={Calendar}
              value={format(new Date(caseData.intake_submitted_at), "MMM d, yyyy")}
            />
          )}
          {caseData.matched_at && (
            <InfoRow label="Matched At" icon={Calendar} value={format(new Date(caseData.matched_at), "MMM d, yyyy")} />
          )}
          {caseData.introductions_sent_at && (
            <InfoRow label="Intros Sent At" icon={Calendar} value={format(new Date(caseData.introductions_sent_at), "MMM d, yyyy")} />
          )}
          {caseData.placement_confirmed_at && (
            <InfoRow label="Placed At" icon={Calendar} value={format(new Date(caseData.placement_confirmed_at), "MMM d, yyyy")} />
          )}
          {caseData.closed_at && (
            <InfoRow label="Closed At" icon={Calendar} value={format(new Date(caseData.closed_at), "MMM d, yyyy")} />
          )}
        </CardContent>
      </Card>

      {/* Urgency & Outcome */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Urgency & Outcome</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <InfoRow
            label="Urgency / Priority"
            icon={AlertTriangle}
            value={
              <Badge variant="outline" className={
                caseData.timeline_urgency === "immediate" ? "bg-destructive/10 text-destructive border-destructive/30"
                : caseData.timeline_urgency === "within_week" ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
              }>
                {urgencyLabel}
              </Badge>
            }
          />
          <InfoRow
            label="Admitted"
            value={
              isPlaced ? (
                <span className="flex items-center gap-1 text-success"><CheckCircle className="h-3.5 w-3.5" /> Yes</span>
              ) : isClosed ? (
                <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3.5 w-3.5" /> No (Closed)</span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Pending</span>
              )
            }
          />
          {placedFacility && (
            <InfoRow
              label="Admitted To"
              icon={MapPin}
              value={`${placedFacility.name} — ${placedFacility.city}, ${placedFacility.state}`}
            />
          )}
          <InfoRow label="Matches Found" value={caseData.match_count ? `${caseData.match_count} facility(ies)` : "0"} />
          <InfoRow label="Intros Sent" value={caseData.introductions_sent_count ? `${caseData.introductions_sent_count}` : "0"} />
        </CardContent>
      </Card>
    </div>
  );
}
