import { useLeadContactTracking } from "@/hooks/useLeadContactTracking";
import {
  Phone,
  Mail,
  MapPin,
  Flame,
  Zap,
  Clock,
  Building2,
  ChevronRight,
  Users,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { LeadStatusBadge, type LeadStatus } from "@/components/provider/leads/LeadStatusBadge";
import type { Lead } from "@/components/provider/leads/LeadDetailPanel";

interface DashboardLeadFeedProps {
  leads: Lead[];
  facilityName?: string;
  isLoading: boolean;
  /** True if the underlying query threw. When set, the feed renders
   *  a small error card with a retry CTA instead of silently going
   *  blank. Optional so existing callers don't need to update. */
  isError?: boolean;
  /** Manual retry trigger surfaced by the error state. Wired to the
   *  parent query's `refetch()`. */
  onRetry?: () => void;
  onLeadClick: (lead: Lead) => void;
}

// Compute lead score label from available fields
function getLeadScoreInfo(lead: Lead): { label: string; color: string; icon: typeof Flame } {
  let score = 0;
  if (lead.urgency === "immediate" || lead.urgency === "Urgent" || lead.urgency === "Immediately") score += 30;
  else if (lead.urgency === "within_week" || lead.urgency === "This week") score += 20;
  else if (lead.urgency === "within_month" || lead.urgency === "This month") score += 10;
  if (lead.level_of_care?.toLowerCase().includes("residential") || lead.level_of_care?.toLowerCase().includes("detox")) score += 15;
  else if (lead.level_of_care?.toLowerCase().includes("php") || lead.level_of_care?.toLowerCase().includes("iop")) score += 10;
  if (lead.insurance_type && lead.insurance_type !== "None" && lead.insurance_type !== "") score += 10;
  if (lead.inquiry_type === "request_callback") score += 15;
  else if (lead.inquiry_type === "request_info") score += 8;
  if (lead.message && lead.message.length > 50) score += 5;

  if (score >= 40) return { label: "Hot", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400", icon: Flame };
  if (score >= 20) return { label: "Warm", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", icon: Zap };
  return { label: "Cold", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400", icon: Clock };
}

export function DashboardLeadFeed({
  leads,
  facilityName,
  isLoading,
  isError,
  onRetry,
  onLeadClick,
}: DashboardLeadFeedProps) {
  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Lead Feed</CardTitle>
            {leads.length > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                {leads.length}
              </Badge>
            )}
          </div>
          {leads.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" asChild>
              <Link to="/provider/inquiries">
                View All <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-4 py-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-7 w-7 text-rose-500" aria-hidden />
            <p className="text-sm font-semibold text-slate-900">Couldn't load leads</p>
            <p className="mt-0.5 text-xs text-slate-500">
              We hit a snag reaching the inbox. Try again in a moment.
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="mt-3 h-7 gap-1 border-slate-300 px-2.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3 w-3" aria-hidden />
                Try again
              </Button>
            )}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No leads yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Leads appear when families reach out through your listing
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                facilityName={facilityName}
                onClick={() => onLeadClick(lead)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Lead Row ──
function LeadRow({
  lead,
  facilityName,
  onClick,
}: {
  lead: Lead;
  facilityName?: string;
  onClick: () => void;
}) {
  const { trackContact } = useLeadContactTracking();
  const location = lead.location_city_state || (lead.location_zip ? `ZIP: ${lead.location_zip}` : null);
  const scoreInfo = getLeadScoreInfo(lead);

  return (
    <div
      onClick={onClick}
      className="p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">
            {lead.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
            <LeadStatusBadge status={lead.status as LeadStatus} size="sm" />
            <Badge className={cn("h-5 text-[10px] px-1.5 border-0", scoreInfo.color)}>
              <scoreInfo.icon className="h-2.5 w-2.5 mr-0.5" />
              {scoreInfo.label}
            </Badge>
          </div>

          {/* Location + Facility */}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            {facilityName && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {facilityName}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
          </div>

          {/* Contact Actions */}
          <div className="flex items-center gap-2 mt-2.5">
            {lead.phone && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  trackContact(lead.id, lead.facility_id, "call");
                  window.open(`tel:${lead.phone}`, "_self");
                }}
                aria-label={`Call ${lead.name}`}
              >
                <Phone className="h-3 w-3" />
                Call Now
              </Button>
            )}
            {lead.email && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  trackContact(lead.id, lead.facility_id, "email");
                  window.open(`mailto:${lead.email}`, "_blank");
                }}
                aria-label={`Email ${lead.name}`}
              >
                <Mail className="h-3 w-3" />
                Send Email
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-3 shrink-0" />
      </div>
    </div>
  );
}

